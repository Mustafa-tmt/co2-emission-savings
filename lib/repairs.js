/**
 * Repair pipeline: PostgreSQL is the source of truth (`repair_jobs`, `devices`, `components`,
 * `part_descp`, `defect_descp`). Pure functions; callers pass rows from `pg` and Maps built from DB.
 */

const {
  interpretSamsungPart,
  extractSamsungPrefix: samsungServicePrefix,
} = require('./partClassification');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_PART_SLOTS = 15;

const DEVICE_MATCH_EXACT = 'exact';
const DEVICE_MATCH_FAMILY_UNIQUE = 'samsung_family_unique';
const DEVICE_MATCH_FAMILY_LETTER = 'samsung_family_letter';

/**
 * LCA bucket for Samsung service parts (GSPN-style). Used after catalogue text is available.
 * @readonly
 */
const SAMSUNG_PART_TARGET = {
  DISPLAY_MAIN: 'display_main',
  DISPLAY_SUB: 'display_sub',
  DISPLAY_GENERIC: 'display_generic',
  BATTERY: 'battery',
  CAMERA: 'camera',
  FLEX_SUB_PBA: 'flex_sub_pba',
  DLC: 'dlc',
  REAR: 'rear',
  ADHESIVE_SMALL: 'adhesive_small',
  UNKNOWN: 'unknown',
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parsePartQty(value) {
  const n = parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function isBlankPartSku(sku) {
  const s = String(sku ?? '').trim();
  return !s || s === '0';
}

function readDefectType(row) {
  return String(row.defect_type ?? row['Defect Type'] ?? row['Defect type'] ?? '').trim();
}

function readDefectDesc(row) {
  return String(row.defect_desc ?? row['Defect Desc'] ?? row['Defect desc'] ?? '').trim();
}

/** Optional legacy shape: spaced part columns with per-line descriptions (not used by `repair_jobs`). */
function parseRepairRowLegacy(row) {
  const parts = [];
  for (let i = 1; i <= 8; i += 1) {
    const sku = String(row[`Part ${i}`] ?? '').trim();
    if (!sku) continue;
    const desc = String(row[`Part ${i} Descp`] ?? '');
    const qty = parsePartQty(row[`Part ${i} Qty`]);
    parts.push({ slot: i, sku, desc, qty });
  }

  return {
    jobId: String(row.job_id ?? row['Job ID'] ?? '').trim(),
    imei: String(row.imei ?? row['IMEI'] ?? '').trim(),
    make: String(row.make ?? row['Make'] ?? '').trim(),
    model: String(row.model ?? row['Model'] ?? '').trim(),
    modelCodeSku: String(
      row.model_code ?? row['Model Code'] ?? row['Model code'] ?? ''
    ).trim(),
    status: String(
      row.last_repair_status ??
        row['Last Repair Status'] ??
        row['Last repair status'] ??
        ''
    )
      .trim()
      .toUpperCase(),
    dateOut: String(row['Date OUT'] ?? '').trim(),
    repairDescription: '',
    defectType: readDefectType(row),
    defectDesc: readDefectDesc(row),
    parts,
  };
}

/** Shape aligned with `repair_jobs`: part1..part15, qty1..qty15 (after `normalizeRepairJobKeys` if snake_case). */
function parseRepairRowFlat(row) {
  const repairDescription = String(
    row.repair_description ?? row['Repair Description'] ?? ''
  ).trim();
  const parts = [];
  for (let i = 1; i <= MAX_PART_SLOTS; i += 1) {
    const sku = String(row[`Part${i}`] ?? '').trim();
    if (isBlankPartSku(sku)) continue;
    const qty = parsePartQty(row[`Qty${i}`]);
    parts.push({ slot: i, sku, desc: '', qty });
  }

  return {
    jobId: String(row.job_id ?? row['Job ID'] ?? '').trim(),
    imei: String(row.imei ?? row['IMEI'] ?? '').trim(),
    make: String(row.make ?? row['Make'] ?? '').trim(),
    model: String(row.model ?? row['Model'] ?? '').trim(),
    modelCodeSku: String(
      row.model_code ?? row['Model Code'] ?? row['Model code'] ?? ''
    ).trim(),
    status: String(
      row.last_repair_status ??
        row['Last Repair Status'] ??
        row['Last repair status'] ??
        ''
    )
      .trim()
      .toUpperCase(),
    dateOut: String(row['Date OUT'] ?? '').trim(),
    repairDescription,
    defectType: readDefectType(row),
    defectDesc: readDefectDesc(row),
    parts,
  };
}

function parseRepairRow(row) {
  if (
    row &&
    (Object.prototype.hasOwnProperty.call(row, 'Part1') ||
      Object.prototype.hasOwnProperty.call(row, 'part1'))
  ) {
    return parseRepairRowFlat(normalizeRepairJobKeys(row));
  }
  return parseRepairRowLegacy(row);
}

/** Map a `repair_jobs` PostgreSQL row (snake_case) to Part1/Qty1… keys for `parseRepairRowFlat`. */
function normalizeRepairJobKeys(row) {
  if (!row) return row;
  if (Object.prototype.hasOwnProperty.call(row, 'Part1')) return row;
  const out = {
    'Job ID': row.job_id != null ? String(row.job_id) : '',
    IMEI: row.imei != null ? String(row.imei) : '',
    Make: row.make != null ? String(row.make) : '',
    Model: row.model != null ? String(row.model) : '',
    'Model Code': row.model_code != null ? String(row.model_code) : '',
    'Last Repair Status':
      row.last_repair_status != null ? String(row.last_repair_status) : '',
    'Repair Description':
      row.repair_description != null ? String(row.repair_description) : '',
    'Defect Type': row.defect_type != null ? String(row.defect_type) : '',
    'Defect Desc': row.defect_desc != null ? String(row.defect_desc) : '',
  };
  for (let i = 1; i <= MAX_PART_SLOTS; i += 1) {
    const pk = `part${i}`;
    const qk = `qty${i}`;
    out[`Part${i}`] = row[pk] != null && row[pk] !== '' ? String(row[pk]) : '';
    out[`Qty${i}`] = row[qk] != null ? row[qk] : '';
  }
  return out;
}

/** @param {object} dbRow  Single row from `SELECT * FROM repair_jobs` */
function repairJobDbRowToFlatRow(dbRow) {
  return normalizeRepairJobKeys(dbRow);
}

/** Canonical entry: `repair_jobs` row (snake_case) from PostgreSQL. */
function parseRepairJobRow(dbRow) {
  return parseRepairRow(dbRow);
}

// ---------------------------------------------------------------------------
// Lookup maps (from seed / `getAll` rows)
// ---------------------------------------------------------------------------

/** @param {{ part_no?: string, description?: string, logic?: string, category?: string }[]} rows */
function buildPartCatalogMap(rows) {
  const map = new Map();
  if (!Array.isArray(rows)) return map;
  for (const r of rows) {
    const k = String(r.part_no ?? '').trim().toUpperCase();
    if (!k) continue;
    map.set(k, {
      description: r.description != null ? String(r.description) : '',
      logic: r.logic != null ? String(r.logic).trim() : '',
      category: r.category != null ? String(r.category).trim() : '',
    });
  }
  return map;
}

/** Uppercase `part_no` → GSPN description (legacy helpers / scripts). */
function buildPartDescriptionMap(rows) {
  const full = buildPartCatalogMap(rows);
  const m = new Map();
  for (const [k, v] of full) m.set(k, v.description);
  return m;
}

function catalogComponentHint(baseHint, logic) {
  const b = String(baseHint ?? '').trim();
  const l = String(logic ?? '').trim();
  if (!l) return b;
  if (!b) return l;
  return `${b} ${l}`;
}

/** @param {{ defect_type?: string, description?: string }[]} rows */
function buildDefectDescriptionMap(rows) {
  const map = new Map();
  if (!Array.isArray(rows)) return map;
  for (const r of rows) {
    const k = String(r.defect_type ?? '').trim().toUpperCase();
    if (!k) continue;
    map.set(k, r.description != null ? String(r.description) : '');
  }
  return map;
}

/** @param {{ device_id: number, component_name: string, co2_emitted: number }[]} allComponents */
function groupComponentsByDeviceId(allComponents) {
  const map = new Map();
  if (!Array.isArray(allComponents)) return map;
  for (const r of allComponents) {
    const id = r.device_id;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(r);
  }
  return map;
}

/**
 * @param {{ model_code: string }[]} devices
 * @param {{ device_id: number }[]} allComponents
 * @param {{ part_no?: string, description?: string, logic?: string, category?: string }[]} partDescRows
 * @param {{ defect_type?: string, description?: string }[]} defectDescRows
 */
function buildRepairLookupContext(devices, allComponents, partDescRows, defectDescRows) {
  const partCatalogMap = buildPartCatalogMap(partDescRows);
  return {
    devices: Array.isArray(devices) ? devices : [],
    modelCodeToDevice: buildModelCodeToDevice(devices),
    componentsByDeviceId: groupComponentsByDeviceId(allComponents),
    partCatalogMap,
    /** @deprecated Use `partCatalogMap` — same keys, description string only */
    partDescriptionMap: new Map([...partCatalogMap].map(([k, v]) => [k, v.description])),
    defectDescriptionMap: buildDefectDescriptionMap(defectDescRows),
  };
}

// ---------------------------------------------------------------------------
// Device resolution
// ---------------------------------------------------------------------------

function normalizeModelDisplay(model) {
  let s = String(model ?? '').trim().toUpperCase().replace(/\s+/g, '');
  s = s.replace(/\/DS$/i, '').replace(/\/D$/i, '').replace(/\/N$/i, '');
  return s;
}

function extractBaseSamsungModelCode(sku) {
  const u = String(sku ?? '').trim().toUpperCase();
  const m = u.match(/^(SM-[A-Z]\d{3}[A-Z])/);
  return m ? m[1] : null;
}

/** Samsung regional family key: SM-A166B → SM-A166 */
function samsungModelFamilyFromCode(code) {
  const u = String(code ?? '').trim().toUpperCase();
  const m = u.match(/^(SM-[A-Z]\d{3})/);
  return m ? m[1] : null;
}

function escapeRegexLiteral(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Trailing variant letter: SM-A166B → B */
function samsungTrailingVariantLetter(code) {
  const u = String(code ?? '').trim().toUpperCase();
  const m = u.match(/^SM-[A-Z]\d{3}([A-Z])$/);
  return m ? m[1] : null;
}

function findDevicesBySamsungFamily(allDevices, family) {
  if (!family) return [];
  const re = new RegExp(`^${escapeRegexLiteral(family)}[A-Z]$`, 'i');
  return allDevices.filter((d) => re.test(String(d.model_code ?? '').trim()));
}

function buildModelCodeToDevice(devices) {
  const map = new Map();
  for (const d of devices) {
    map.set(String(d.model_code).trim().toUpperCase(), d);
  }
  return map;
}

/**
 * Match repair to a `devices` row: exact model_code first, then Samsung same-digit family
 * when the catalogue has a single regional variant or a unique letter match.
 *
 * @param {ReturnType<typeof parseRepairRow>} parsedRepair
 * @param {Map<string, object>} modelCodeToDevice
 * @param {object[]|null} [allDevices]  Same devices as the map values (deduped); defaults to map values.
 * @returns {{ device: object, matchedAs: string, matchTier: string, warnings: string[] } | null}
 */
function resolveDevice(parsedRepair, modelCodeToDevice, allDevices = null) {
  const devicesList =
    allDevices && allDevices.length
      ? allDevices
      : [...new Map([...modelCodeToDevice.values()].map((d) => [d.device_id, d])).values()];

  const fromDisplay = normalizeModelDisplay(parsedRepair.model);
  const fromSku = extractBaseSamsungModelCode(parsedRepair.modelCodeSku);
  const fullSku = String(parsedRepair.modelCodeSku ?? '').trim().toUpperCase();

  const exactCandidates = [];
  if (fromDisplay) exactCandidates.push(fromDisplay);
  if (fromSku) exactCandidates.push(fromSku);
  if (fullSku) exactCandidates.push(fullSku);

  const seen = new Set();
  for (const c of exactCandidates) {
    if (!c || seen.has(c)) continue;
    seen.add(c);
    const hit = modelCodeToDevice.get(c);
    if (hit) {
      return {
        device: hit,
        matchedAs: c,
        matchTier: DEVICE_MATCH_EXACT,
        warnings: [],
      };
    }
  }

  const families = new Set();
  if (fromDisplay) {
    const f = samsungModelFamilyFromCode(fromDisplay);
    if (f) families.add(f);
  }
  if (fromSku) {
    const f = samsungModelFamilyFromCode(fromSku);
    if (f) families.add(f);
  }

  for (const family of families) {
    const matches = findDevicesBySamsungFamily(devicesList, family);
    if (matches.length === 1) {
      const device = matches[0];
      const warnings = [];
      const listed =
        fromDisplay && /^SM-[A-Z]\d{3}[A-Z]$/i.test(fromDisplay)
          ? fromDisplay
          : null;
      const dbCode = String(device.model_code).trim().toUpperCase();
      if (listed && listed !== dbCode) {
        warnings.push(
          `Device resolved via Samsung model family ${family}*: LCA row ${dbCode} (listed display model ${listed} not in catalogue).`
        );
      }
      return {
        device,
        matchedAs: dbCode,
        matchTier: DEVICE_MATCH_FAMILY_UNIQUE,
        warnings,
      };
    }
    if (matches.length > 1) {
      const wantLetter =
        samsungTrailingVariantLetter(fromDisplay) ||
        samsungTrailingVariantLetter(fromSku);
      if (wantLetter) {
        const letterHits = matches.filter(
          (d) => String(d.model_code).trim().toUpperCase().endsWith(wantLetter)
        );
        if (letterHits.length === 1) {
          return {
            device: letterHits[0],
            matchedAs: String(letterHits[0].model_code).trim().toUpperCase(),
            matchTier: DEVICE_MATCH_FAMILY_LETTER,
            warnings: [],
          };
        }
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Samsung part_no + GSPN description → LCA bucket (see lib/partClassification.js)
// ---------------------------------------------------------------------------

function mapSamsungInterpretTargetToComponent(mapTarget, componentRows, hint = '') {
  const h = String(hint ?? '');
  const hu = h.toUpperCase();
  switch (mapTarget) {
    case SAMSUNG_PART_TARGET.DISPLAY_MAIN: {
      const preferMain =
        /\bMAIN\s+DISPLAY\b/i.test(h) ||
        /\bHIGH\s+CO2\b/i.test(hu) ||
        /\bFOLDABLE\b/i.test(hu);
      const mainRow =
        findComponentRowByName(componentRows, 'MAIN DISPLAY') ||
        componentRows.find((r) => /\bmain\s*display\b/i.test(r.component_name));
      const displayRow =
        findComponentRowByName(componentRows, 'DISPLAY') ||
        componentRows.find((r) => /^display$/i.test(String(r.component_name).trim()));
      if (preferMain && mainRow) return mainRow;
      return (
        mainRow ||
        displayRow ||
        componentRows.find((r) => /\bdisplay\b/i.test(r.component_name)) ||
        null
      );
    }
    case SAMSUNG_PART_TARGET.DISPLAY_SUB:
      return (
        findComponentRowByName(componentRows, 'SUB DISPLAY') ||
        findComponentRowByName(componentRows, "SUB B'D") ||
        findComponentRowByName(componentRows, 'SUB PBA') ||
        componentRows.find((r) => /\bsub\s*display\b/i.test(r.component_name)) ||
        null
      );
    case SAMSUNG_PART_TARGET.DISPLAY_GENERIC:
      return (
        findComponentRowByName(componentRows, 'DISPLAY') ||
        findComponentRowByName(componentRows, 'MAIN DISPLAY') ||
        findComponentRowByName(componentRows, 'SUB DISPLAY') ||
        componentRows.find((r) => /^display$/i.test(r.component_name)) ||
        componentRows.find((r) => /\bmain\s*display\b/i.test(r.component_name)) ||
        componentRows.find((r) => /\bsub\s*display\b/i.test(r.component_name)) ||
        componentRows.find((r) => /\bdisplay\b/i.test(r.component_name)) ||
        null
      );
    case SAMSUNG_PART_TARGET.BATTERY:
      return pickBatteryComponentRow(componentRows, h);
    case SAMSUNG_PART_TARGET.CAMERA:
      return pickCameraComponent(componentRows);
    case SAMSUNG_PART_TARGET.FLEX_SUB_PBA:
      return (
        findComponentRowByName(componentRows, "SUB B'D") ||
        findComponentRowByName(componentRows, 'SUB PBA') ||
        null
      );
    case SAMSUNG_PART_TARGET.DLC:
      return (
        findComponentRowByName(componentRows, 'DLC') ||
        findComponentRowByName(componentRows, 'DATA CABEL') ||
        findComponentRowByName(componentRows, 'DATA LINK CABLE') ||
        null
      );
    case SAMSUNG_PART_TARGET.REAR:
      return pickRearHousingComponentRow(componentRows, h);
    case SAMSUNG_PART_TARGET.ADHESIVE_SMALL:
      return (
        findComponentRowByName(componentRows, 'Others') ||
        componentRows.find((r) => /^others$/i.test(r.component_name)) ||
        null
      );
    default:
      return null;
  }
}

/**
 * Samsung service SKU → component row. `catalogOrHint` should be `part_descp.description` when available.
 * @param {{ logic?: string, category?: string }} [meta] `part_descp.logic` / `part_descp.category` when seeded.
 */
function inferComponentFromPartSku(sku, componentRows, catalogOrHint = '', meta = {}) {
  const u = String(sku ?? '').trim().toUpperCase();
  if (!u || u === '0') return null;
  const hint = String(catalogOrHint ?? '');
  const mergedHint = catalogComponentHint(hint, meta.logic);
  const { mapTarget } = interpretSamsungPart(u, hint, meta);
  if (mapTarget === SAMSUNG_PART_TARGET.UNKNOWN) return null;
  return mapSamsungInterpretTargetToComponent(mapTarget, componentRows, mergedHint);
}

function normName(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\u2019/g, "'");
}

/**
 * True only for catalogue lines that are clearly consumable / SVC packs, not display modules.
 * Must NOT match display-related repair kits (handled by `interpretSamsungPart` / display regex first).
 */
function isCatalogLikelyTapeDecoOrSvcKit(text) {
  const t = normName(text);
  if (!t) return false;
  if (
    /\b(display|oled|lcd|octa|mcr|ewp)\b/.test(t) ||
    /screen\s*assy|kit-display|display\+|kit,.*\bdisplay\b|repair\s*kit[^\n]{0,80}\bdisplay\b/.test(
      t
    )
  ) {
    return false;
  }
  return (
    /\btape\b|\bpet[-\s]|protector\s*film|ub\s*film|hinge\b|wing\s*plate\b|adhesive\b|\bscrew\b/.test(
      t
    ) ||
    /\brepair\s*kit\b|\bassembly\s*kit\b|\bmodule\s*kit\b|\btape\s*kit\b|\badhesive\s*kit\b|\bdecoration\s*kit\b/.test(
      t
    ) ||
    /\(svc\/com\)|\bsvc\/com\b/.test(t) ||
    /\bsvc\s*screen\s*assy[^\n]*\(svc/.test(t)
  );
}

function findComponentRowByName(componentRows, name) {
  const want = normName(name);
  return (
    componentRows.find((r) => normName(r.component_name) === want) ?? null
  );
}

/**
 * LCA tables vary: Samsung text uses "BATT" not "battery". If there is no `BATTERY` row, main-battery
 * parts use `SUB BATTERY` (same catalogue data—no synthetic components).
 * @param {object[]} componentRows
 * @param {string} [hint]  Catalogue / GSPN description (case-insensitive)
 */
function pickBatteryComponentRow(componentRows, hint = '') {
  const h = String(hint ?? '').toUpperCase();
  const subish =
    /\bBATT\b.*\bSUB\b|\bASSY\s*-\s*SUB\b|\bBATT\s*,\s*SUB\b|\bSUB\s+BATT\b/i.test(h) ||
    /\bBATT\s+ASSY\s*-\s*SUB\b/i.test(h) ||
    /\bSECONDARY\s+BATTERY\b/i.test(h);

  const by = (name) => findComponentRowByName(componentRows, name);
  if (subish) {
    const sub =
      by('SUB BATTERY') ??
      componentRows.find((r) => /^sub\s*battery$/i.test(r.component_name));
    if (sub) return sub;
  }

  const main =
    by('BATTERY') ??
    componentRows.find((r) => /^battery$/i.test(String(r.component_name).trim()));
  if (main) return main;

  if (!subish) {
    const sub =
      by('SUB BATTERY') ??
      componentRows.find((r) => /^sub\s*battery$/i.test(r.component_name));
    if (sub) return sub;
  }
  return null;
}

/** Rear / housing: many fold LCA rows omit REAR; use front shell rows as proxy. */
function pickRearHousingComponentRow(componentRows, hint = '') {
  const h = String(hint ?? '');
  const rear =
    findComponentRowByName(componentRows, 'REAR') ||
    componentRows.find((r) => /^rear$/i.test(r.component_name));
  if (rear) return rear;
  const housing =
    findComponentRowByName(componentRows, 'METAL FRONT') ||
    findComponentRowByName(componentRows, 'MAIN FRONT') ||
    findComponentRowByName(componentRows, 'CASE FRONT') ||
    componentRows.find((r) =>
      /^(metal front|main front|case front)$/i.test(String(r.component_name).trim())
    );
  if (housing) return housing;
  if (/b\/c/i.test(h)) {
    return (
      findComponentRowByName(componentRows, 'Others') ||
      componentRows.find((r) => /^others$/i.test(r.component_name)) ||
      null
    );
  }
  return (
    findComponentRowByName(componentRows, 'Others') ||
    componentRows.find((r) => /^others$/i.test(r.component_name)) ||
    null
  );
}

function pickCameraComponent(componentRows) {
  const preference = [
    'CAM - Wide',
    'CAM - Ultra Wide',
    'CAM - Ultra wide',
    'CAM - Tele',
    'CAM - Selfie',
    'CAMERA-2M',
  ];
  for (const p of preference) {
    const hit = findComponentRowByName(componentRows, p);
    if (hit) return hit;
  }
  return componentRows.find((r) => /cam/i.test(r.component_name)) ?? null;
}

function rowFromNameOrRow(componentRows, hit) {
  if (!hit) return null;
  if (typeof hit === 'object' && hit.component_name != null) return hit;
  return findComponentRowByName(componentRows, hit);
}

/**
 * Map free-text part description to one row in `componentRows` for this device.
 */
function mapPartDescriptionToComponent(desc, componentRows) {
  const d = String(desc ?? '').toLowerCase();
  const names = componentRows.map((r) => r.component_name);

  const tryExact = (label) => findComponentRowByName(componentRows, label);

  if (/\bbatt\b|\bbattery\b|\bmah\b/i.test(d)) {
    const row = pickBatteryComponentRow(componentRows, desc);
    if (row) return { row, reason: 'battery' };
  }

  if (/oled|screen assembly|lcd\b|\bdisplay\b|kit-display|display\+/i.test(d)) {
    const hit =
      tryExact('DISPLAY') ||
      tryExact('MAIN DISPLAY') ||
      tryExact('SUB DISPLAY') ||
      names.find((n) => /^display$/i.test(n)) ||
      names.find((n) => /\bmain\s*display\b/i.test(n)) ||
      names.find((n) => /\bsub\s*display\b/i.test(n));
    const row = rowFromNameOrRow(componentRows, hit);
    if (row) return { row, reason: 'display' };
  }

  if (isCatalogLikelyTapeDecoOrSvcKit(desc)) {
    const others =
      tryExact('Others') ?? names.find((n) => /^others$/i.test(n));
    const row = rowFromNameOrRow(componentRows, others);
    if (row) return { row, reason: 'kit_fallback' };
  }

  if (/front module|front case|case front/i.test(d)) {
    const hit =
      tryExact('FRONT CASE') ||
      tryExact('CASE FRONT') ||
      tryExact('FRONT') ||
      names.find((n) => /front case|case front|^front$/i.test(n));
    const row = rowFromNameOrRow(componentRows, hit);
    if (row) return { row, reason: 'front' };
  }

  if (/\bap\b|main\s*b'?d|motherboard|mainboard/i.test(d)) {
    const hit =
      tryExact("MAIN B'D") ||
      componentRows.find((r) => /main b'?d/i.test(r.component_name));
    if (hit) return { row: rowFromNameOrRow(componentRows, hit), reason: 'main_board' };
  }

  if (/\bsub\s*b'?d|sub\s*pba/i.test(d)) {
    const hit =
      tryExact("SUB B'D") ||
      tryExact('SUB PBA') ||
      names.find((n) => /sub b'?d|sub pba/i.test(n));
    const row = rowFromNameOrRow(componentRows, hit);
    if (row) return { row, reason: 'sub_board' };
  }

  if (/fingerprint|finger\s*print/i.test(d)) {
    const hit =
      tryExact('FINGER PRINT') ||
      tryExact('Finger Print Sensor') ||
      names.find((n) => /finger/i.test(n));
    const row = rowFromNameOrRow(componentRows, hit);
    if (row) return { row, reason: 'fingerprint' };
  }

  if (/camera|(^|[^a-z])cam([^a-z]|$)/i.test(d)) {
    const row = pickCameraComponent(componentRows);
    if (row) return { row, reason: 'camera' };
  }

  if (/\bdlc\b|data\s*link|data\s*cabel|data\s*cable/i.test(d)) {
    const hit =
      tryExact('DLC') ?? tryExact('DATA LINK CABLE') ?? tryExact('DATA CABEL');
    if (hit) return { row: hit, reason: 'dlc' };
  }

  if (/rear|back cover|b\/c|cover\s*assy/i.test(d)) {
    const row = pickRearHousingComponentRow(componentRows, desc);
    if (row) {
      const nn = normName(row.component_name);
      const reason =
        nn === normName('Others') && /b\/c/i.test(d) ? 'rear_bc_others' : 'rear';
      return { row, reason };
    }
  }

  const others =
    tryExact('Others') ?? names.find((n) => /^others$/i.test(n));
  const row = rowFromNameOrRow(componentRows, others);
  if (row) return { row, reason: 'default_others' };

  return { row: null, reason: 'unmapped' };
}

// ---------------------------------------------------------------------------
// CO2 aggregation
// ---------------------------------------------------------------------------

function sumLifecycleCo2(device) {
  const keys = ['manufacturing_co2', 'distribution_co2', 'use_co2', 'disposal_co2'];
  let t = 0;
  for (const k of keys) {
    const v = device[k];
    if (v != null && Number.isFinite(Number(v))) t += Number(v);
  }
  return t;
}

/**
 * @param {ReturnType<typeof parseRepairRow>} parsedRepair
 * @param {object} device
 * @param {object[]} componentRows
 * @param {Map<string, { description: string, logic: string, category: string }>|undefined} partCatalogMap
 */
function analyzeRepair(parsedRepair, device, componentRows, partCatalogMap) {
  const warnings = [];
  const hardErrors = [];
  const lines = [];
  let partsCo2 = 0;
  const globalDesc = parsedRepair.repairDescription || '';

  for (const part of parsedRepair.parts) {
    const skuKey = String(part.sku ?? '').trim().toUpperCase();
    const catalogEntry =
      partCatalogMap instanceof Map ? partCatalogMap.get(skuKey) : null;
    const catalogDesc = catalogEntry
      ? String(catalogEntry.description ?? '').trim()
      : '';
    const meta = catalogEntry
      ? { logic: catalogEntry.logic ?? '', category: catalogEntry.category ?? '' }
      : { logic: '', category: '' };

    const descForMapping = String(part.desc ?? '').trim() || catalogDesc;
    const lineDesc = String(part.desc ?? '').trim() || catalogDesc || '';
    const skuHintText =
      String(descForMapping || '').trim() || String(globalDesc || '').trim();

    const mergedHint = catalogComponentHint(skuHintText, meta.logic);
    const samsungInterpret = interpretSamsungPart(part.sku, skuHintText, meta);
    const fromPartDescpCatalog = samsungInterpret.source === 'part_descp';

    let row = null;
    let reason = 'unmapped';

    if (fromPartDescpCatalog) {
      const direct = mapSamsungInterpretTargetToComponent(
        samsungInterpret.mapTarget,
        componentRows,
        mergedHint
      );
      if (direct) {
        row = direct;
        reason = 'part_descp_meta';
      }
    }

    if (!row && descForMapping) {
      const m = mapPartDescriptionToComponent(descForMapping, componentRows);
      row = m.row;
      reason = m.reason;
    }

    const skuInferred = inferComponentFromPartSku(part.sku, componentRows, skuHintText, meta);
    if (!row && skuInferred) {
      row = skuInferred;
      reason = 'sku_hint';
    } else if (
      row &&
      skuInferred &&
      normName(row.component_name) === normName('Others') &&
      normName(skuInferred.component_name) !== normName('Others')
    ) {
      row = skuInferred;
      reason = 'sku_samsung_interpret';
    }

    if (!row && globalDesc) {
      const m = mapPartDescriptionToComponent(globalDesc, componentRows);
      row = m.row;
      reason = m.reason;
    }

    if (!row) {
      const hint = [part.desc, catalogDesc, globalDesc, part.sku]
        .filter(Boolean)
        .join(' / ')
        .slice(0, 120);
      const msg = `Unmapped part (slot ${part.slot}) ${part.sku}: ${hint || '(no text)'}`;
      warnings.push(msg);
      hardErrors.push(msg);
      lines.push({
        slot: part.slot,
        sku: part.sku,
        desc: lineDesc,
        partDescp: catalogDesc,
        qty: part.qty,
        componentName: null,
        co2PerUnit: null,
        lineCo2: null,
        mapReason: reason,
      });
      continue;
    }

    let co2Per = Number(row.co2_emitted);
    if (
      samsungInterpret.mapTarget === SAMSUNG_PART_TARGET.ADHESIVE_SMALL &&
      normName(row.component_name) === normName('Others')
    ) {
      const consumableCapKg = 0.12;
      if (Number.isFinite(co2Per) && co2Per > consumableCapKg) {
        co2Per = consumableCapKg;
      }
    }
    if (!Number.isFinite(co2Per)) {
      const msg = `Invalid co2_emitted for component "${row.component_name}" (device ${device.model_code})`;
      warnings.push(msg);
      hardErrors.push(msg);
      lines.push({
        slot: part.slot,
        sku: part.sku,
        desc: lineDesc,
        partDescp: catalogDesc,
        qty: part.qty,
        componentName: row.component_name,
        co2PerUnit: null,
        lineCo2: null,
        mapReason: 'invalid_co2',
      });
      continue;
    }

    // Kits / tapes / adhesives are expected to land on Others; don't spam "broad mapping".
    const othersConsumableOk =
      reason === 'kit_fallback' ||
      (normName(row.component_name) === normName('Others') &&
        samsungInterpret.mapTarget === SAMSUNG_PART_TARGET.ADHESIVE_SMALL);
    if (
      (reason === 'default_others' || reason === 'kit_fallback') &&
      !othersConsumableOk
    ) {
      const label = String(descForMapping || globalDesc || part.sku).slice(0, 60);
      warnings.push(
        `Broad mapping (${reason}) for ${part.sku} → ${row.component_name}: ${label}…`
      );
    }

    const lineCo2 = co2Per * part.qty;
    partsCo2 += lineCo2;

    lines.push({
      slot: part.slot,
      sku: part.sku,
      desc: lineDesc,
      partDescp: catalogDesc,
      qty: part.qty,
      componentName: row.component_name,
      co2PerUnit: co2Per,
      lineCo2,
      mapReason: reason,
    });
  }

  const lifecycle = sumLifecycleCo2(device);
  const approxAvoidedLifecycle = Math.max(0, lifecycle - partsCo2);

  return {
    device,
    lines,
    partsCo2,
    lifecycleBaseline: lifecycle,
    approxAvoidedLifecycle,
    warnings,
    hardErrors,
  };
}

// ---------------------------------------------------------------------------
// End-to-end evaluation
// ---------------------------------------------------------------------------

/**
 * @typedef {'skipped'|'failed'|'partial'|'ok'} RepairEvaluationStatus
 */

/**
 * Single repair job through validation, device resolution, and CO2 analysis.
 *
 * @param {object} rawRow  `repair_jobs` row from PostgreSQL (snake_case columns)
 * @param {ReturnType<typeof buildRepairLookupContext>} ctx
 */
function evaluateRepairJob(rawRow, ctx) {
  const parsed = parseRepairJobRow(rawRow);
  const jobLabel = parsed.jobId || parsed.imei || '(no id)';

  if (parsed.status !== 'REPAIRED') {
    return {
      status: 'skipped',
      jobLabel,
      reason: 'NOT_REPAIRED',
      parsed,
    };
  }

  if (parsed.parts.length === 0) {
    return {
      status: 'failed',
      jobLabel,
      reason: 'NO_PARTS',
      message: 'Repair status is REPAIRED but no part SKUs are present.',
      parsed,
    };
  }

  const deviceResolution = resolveDevice(
    parsed,
    ctx.modelCodeToDevice,
    ctx.devices
  );

  if (!deviceResolution) {
    return {
      status: 'failed',
      jobLabel,
      reason: 'DEVICE_NOT_FOUND',
      message: `No matching device in the catalogue for model "${parsed.model}" / code "${parsed.modelCodeSku}".`,
      parsed,
    };
  }

  const componentRows =
    ctx.componentsByDeviceId.get(deviceResolution.device.device_id) ?? [];

  if (componentRows.length === 0) {
    return {
      status: 'failed',
      jobLabel,
      reason: 'NO_COMPONENTS',
      message: `Device ${deviceResolution.device.model_code} has no component rows.`,
      parsed,
      deviceResolution,
    };
  }

  const analysis = analyzeRepair(
    parsed,
    deviceResolution.device,
    componentRows,
    ctx.partCatalogMap
  );

  const warnings = [
    ...(deviceResolution.warnings || []),
    ...analysis.warnings,
  ];

  const defectTypeNorm = parsed.defectType
    ? String(parsed.defectType).trim()
    : null;
  const catalogDescription =
    defectTypeNorm && ctx.defectDescriptionMap instanceof Map
      ? ctx.defectDescriptionMap.get(defectTypeNorm.toUpperCase()) ?? null
      : null;

  const defect = {
    type: defectTypeNorm,
    jobDescription: parsed.defectDesc ? String(parsed.defectDesc).trim() || null : null,
    catalogDescription,
  };

  const analysisOut = { ...analysis, warnings };

  const base = {
    jobLabel,
    parsed,
    deviceResolution,
    defect,
    analysis: analysisOut,
  };

  if (analysis.hardErrors.length > 0) {
    return { status: 'partial', ...base };
  }

  return { status: 'ok', ...base };
}

module.exports = {
  MAX_PART_SLOTS,
  DEVICE_MATCH_EXACT,
  DEVICE_MATCH_FAMILY_UNIQUE,
  DEVICE_MATCH_FAMILY_LETTER,
  SAMSUNG_PART_TARGET,
  samsungServicePrefix,
  interpretSamsungPart,
  mapSamsungInterpretTargetToComponent,
  parseRepairRow,
  parseRepairJobRow,
  normalizeRepairJobKeys,
  repairJobDbRowToFlatRow,
  buildPartCatalogMap,
  buildPartDescriptionMap,
  buildDefectDescriptionMap,
  groupComponentsByDeviceId,
  buildRepairLookupContext,
  normalizeModelDisplay,
  extractBaseSamsungModelCode,
  samsungModelFamilyFromCode,
  buildModelCodeToDevice,
  resolveDevice,
  mapPartDescriptionToComponent,
  inferComponentFromPartSku,
  sumLifecycleCo2,
  analyzeRepair,
  evaluateRepairJob,
};
