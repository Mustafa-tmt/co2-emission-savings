/**
 * Samsung spare parts: public `classifyPart` (carbon/complexity) and `interpretSamsungPart`
 * (LCA bucket for repairs.js). Description beats prefix; consumables override GH82-class SKUs.
 */

/** Same string values as `SAMSUNG_PART_TARGET` in repairs.js */
const LCA_TARGET = {
  UNKNOWN: 'unknown',
  DISPLAY_MAIN: 'display_main',
  DISPLAY_SUB: 'display_sub',
  DISPLAY_GENERIC: 'display_generic',
  BATTERY: 'battery',
  CAMERA: 'camera',
  FLEX_SUB_PBA: 'flex_sub_pba',
  DLC: 'dlc',
  REAR: 'rear',
  ADHESIVE_SMALL: 'adhesive_small',
};

/** @typedef {{ category: string, impactLevel: number, isElectronic: boolean, matchedRule?: string }} PartClassification */

function extractSamsungPrefix(partNo) {
  const u = String(partNo ?? '').trim().toUpperCase();
  if (u.startsWith('EB-B')) return 'EB-B';
  const m = u.match(/^(GH\d{2})/);
  return m ? m[1] : '';
}

function stripServiceParentheticals(s) {
  let out = String(s ?? '');
  out = out.replace(/\(\s*SVC\s*\/[^)]*\)/gi, ' ');
  out = out.replace(/\(\s*COMM[^)]*\)/gi, ' ');
  out = out.replace(/\(\s*A\/S[^)]*\)/gi, ' ');
  return out;
}

function normalizeCatalogText(partNo, description) {
  const merged = `${String(description ?? '')} ${String(partNo ?? '')}`;
  let s = stripServiceParentheticals(merged).toUpperCase();
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function hasMeaningfulOcta(norm) {
  return /\bOCTA\b/.test(norm) && !/\bNO\s+OCTA\b/i.test(norm);
}

function isKitBackCoverTape(norm) {
  return /\bKIT[-\s]B\/?C\b|\bKIT[-\s]SUB\s+UB\b|\bKIT-SUB\s+UB\b/i.test(norm);
}

function hasBroadDisplaySignal(norm) {
  return (
    /\bDISPLAY\b|\bOLED\b|\bLCD\b|\bEWP\b|\bMCR\b|\bSMT[-\s]OCTA\b/i.test(norm) ||
    hasMeaningfulOcta(norm) ||
    /SCREEN\s*ASSY|KIT[-+]DISPLAY|DISPLAY\+|REPAIR\s*KIT[,(-].{0,120}\bDISPLAY\b|\bDISPLAY\s*\+\s*DECO/i.test(
      norm
    )
  );
}

function blocksConsumableKeywordOverride(norm) {
  if (isKitBackCoverTape(norm)) return false;
  if (hasMeaningfulOcta(norm) || /\bOLED\b|\bLCD\b|\bEWP\b|\bMCR\b/.test(norm)) return true;
  if (/KIT[-+]DISPLAY|DISPLAY\+|REPAIR\s*KIT[^\n]{0,80}\bDISPLAY\b|\bDISPLAY\s*\+\s*DECO/i.test(norm)) {
    return true;
  }
  if (/\bSCREEN\s+ASSY\b/.test(norm)) return true;
  if (/\bMAIN\s+UB\b/.test(norm) && !/\bMAIN\s+UB\s+FILM\b/.test(norm)) return true;
  if (/\bSUB\s+DISPLAY\b|\bCOVER\s+SCREEN\b/i.test(norm)) return true;
  return false;
}

function isDisplaySubPattern(norm) {
  if (isKitBackCoverTape(norm)) return false;
  if (
    /\bSUB\s*DISPLAY\b|\bCOVER\s*SCREEN\b|WING\s*PLATE|\bWING\b|HINGE|SUB\s*SCREEN/i.test(norm)
  ) {
    return true;
  }
  if (/\bSUB\s*(UB|PBA)\b/i.test(norm)) return true;
  if (hasBroadDisplaySignal(norm) && /\bSUB\b/i.test(norm) && !/\bMAIN\b/i.test(norm)) {
    return true;
  }
  return false;
}

function isStrongMainDisplay(norm) {
  return (
    (hasMeaningfulOcta(norm) && /\bASSY\b/.test(norm)) ||
    /\bSMT\s*[-]?\s*OCTA\b/.test(norm) ||
    (/\bMAIN\s+UB\b/.test(norm) && !/\bMAIN\s+UB\s+FILM\b/.test(norm)) ||
    /KIT[-+]DISPLAY|DISPLAY\+\s*DECO/i.test(norm)
  );
}

function buildContext(partNo, description) {
  const pn = String(partNo ?? '').trim().toUpperCase();
  const norm = normalizeCatalogText(partNo, description);
  return {
    partNo: pn,
    description: String(description ?? ''),
    norm,
    prefix: extractSamsungPrefix(pn),
  };
}

/**
 * Curated `part_descp.logic` / `part_descp.category` from DB — highest priority for LCA bucket.
 * @param {{ logic?: string, category?: string }} meta
 * @returns {{ repairCategory: string, mapTarget: string, carbonImpact: string } | null}
 */
function tryInterpretFromPartDescp(meta) {
  const cat = String(meta?.category ?? '').trim().toUpperCase();
  const logic = String(meta?.logic ?? '').trim();
  if (!cat) return null;

  if (cat === 'DISPLAY') {
    return {
      repairCategory: logic ? `Display (${logic})` : 'Display assembly (main)',
      mapTarget: LCA_TARGET.DISPLAY_MAIN,
      carbonImpact: 'High',
    };
  }
  if (cat === 'BATTERY') {
    return {
      repairCategory: logic ? `Battery (${logic})` : 'Battery',
      mapTarget: LCA_TARGET.BATTERY,
      carbonImpact: 'High (chemical)',
    };
  }
  if (cat === 'OTHERS' || cat === 'OTHER') {
    return {
      repairCategory: logic || 'Consumable / other',
      mapTarget: LCA_TARGET.ADHESIVE_SMALL,
      carbonImpact: 'Minimal',
    };
  }
  return null;
}

/**
 * @typedef {{
 *   name: string,
 *   priority: number,
 *   test: (ctx: ReturnType<typeof buildContext>) => boolean,
 *   hit: (ctx: ReturnType<typeof buildContext>) => {
 *     mapTarget: string,
 *     carbonImpact: string,
 *     source: string,
 *     repairCategory: string,
 *     publicCategory: string,
 *     impactLevel: number,
 *     isElectronic: boolean,
 *   },
 * }} SamsungRule
 */

/** @type {SamsungRule[]} */
const SAMSUNG_RULES = [
  {
    name: 'consumable_kit_tape_deco',
    priority: 100,
    test: (ctx) => {
      const { norm } = ctx;
      if (blocksConsumableKeywordOverride(norm)) return false;
      if (isKitBackCoverTape(norm)) return true;
      if (
        /\b(KIT|TAPE|FILM|DECO|STICKER|ADHESIVE|PET[-\s]|PROTECTOR\s+FILM|UB\s+FILM)\b/.test(norm)
      ) {
        return true;
      }
      if (/\bREPAIR\s*KIT\b|\bASSEMBLY\s*KIT\b|\bMODULE\s*KIT\b/.test(norm)) return true;
      if (/\bA\/S\s+REPAIR\b/i.test(norm)) return true;
      if (
        /\bKIT\b/.test(norm) &&
        /\b(COMM|REWORK|TAPE|ADHESIVE|STICKER)\b/.test(norm) &&
        !blocksConsumableKeywordOverride(norm)
      ) {
        return true;
      }
      return false;
    },
    hit: () => ({
      mapTarget: LCA_TARGET.ADHESIVE_SMALL,
      carbonImpact: 'Minimal',
      source: 'description',
      repairCategory: 'Adhesive / consumable kit',
      publicCategory: 'OTHER/MAINTENANCE',
      impactLevel: 2,
      isElectronic: false,
    }),
  },
  {
    name: 'display_sub',
    priority: 92,
    test: (ctx) => isDisplaySubPattern(ctx.norm),
    hit: () => ({
      mapTarget: LCA_TARGET.DISPLAY_SUB,
      carbonImpact: 'High',
      source: 'description',
      repairCategory: 'Display assembly (sub)',
      publicCategory: 'DISPLAY_SUB',
      impactLevel: 8,
      isElectronic: true,
    }),
  },
  {
    name: 'camera_module_gh',
    priority: 91,
    test: (ctx) => {
      if (!['GH59', 'GH96', 'GH39'].includes(ctx.prefix)) return false;
      if (/CAMERA|CAM|SELFIE|TELE|WIDE|ASSY\s+CAM|3K|12M|50M|11M/i.test(ctx.norm)) {
        return true;
      }
      const noCatalog = !String(ctx.description ?? '').trim();
      return noCatalog && (ctx.prefix === 'GH96' || ctx.prefix === 'GH39');
    },
    hit: (ctx) => ({
      mapTarget: LCA_TARGET.CAMERA,
      carbonImpact: 'Medium',
      source: String(ctx.description ?? '').trim() ? 'description' : 'prefix',
      repairCategory: 'Camera module',
      publicCategory: 'CAMERA_MODULE',
      impactLevel: 6,
      isElectronic: true,
    }),
  },
  {
    name: 'display_main',
    priority: 90,
    test: (ctx) =>
      isStrongMainDisplay(ctx.norm) ||
      (hasBroadDisplaySignal(ctx.norm) && !isDisplaySubPattern(ctx.norm)),
    hit: () => ({
      mapTarget: LCA_TARGET.DISPLAY_MAIN,
      carbonImpact: 'High',
      source: 'description',
      repairCategory: 'Display assembly (main)',
      publicCategory: 'DISPLAY_MAIN',
      impactLevel: 9,
      isElectronic: true,
    }),
  },
  {
    name: 'screen_assy_main',
    priority: 89,
    test: (ctx) =>
      /SCREEN\s*ASSY[-\s]*MAIN|MAIN\s*SCREEN|MAIN\s*UB(?!\s*FILM)/i.test(ctx.norm),
    hit: () => ({
      mapTarget: LCA_TARGET.DISPLAY_MAIN,
      carbonImpact: 'High',
      source: 'description',
      repairCategory: 'Display assembly (main)',
      publicCategory: 'DISPLAY_MAIN',
      impactLevel: 9,
      isElectronic: true,
    }),
  },
  {
    name: 'battery',
    priority: 80,
    test: (ctx) =>
      /\bBATT\b|\bBATTERY\b|\bmAH\b/.test(ctx.norm) ||
      /\bEB-B[A-Z0-9]/i.test(ctx.norm) ||
      ctx.partNo.startsWith('EB-B') ||
      ctx.prefix === 'GH43',
    hit: () => ({
      mapTarget: LCA_TARGET.BATTERY,
      carbonImpact: 'High (chemical)',
      source: 'description',
      repairCategory: 'Battery',
      publicCategory: 'BATTERY',
      impactLevel: 8,
      isElectronic: true,
    }),
  },
  {
    name: 'housing',
    priority: 70,
    test: (ctx) => {
      const { norm } = ctx;
      const coverAssyHousing =
        /\bCOVER\s+ASSY\b/.test(norm) &&
        !/\b(OCTA|OLED|LCD|DISPLAY|EWP|MCR)\b/.test(norm);
      return (
        coverAssyHousing ||
        /\bREAR\b/.test(norm) ||
        /REAR\s+(GLASS|COVER)/.test(norm) ||
        /\bBACK\s+COVER\b/.test(norm) ||
        (/\bB\/C\b/.test(norm) && !isKitBackCoverTape(norm))
      );
    },
    hit: () => ({
      mapTarget: LCA_TARGET.REAR,
      carbonImpact: 'Medium',
      source: 'description',
      repairCategory: 'Housing / rear',
      publicCategory: 'HOUSING',
      impactLevel: 6,
      isElectronic: false,
    }),
  },
  {
    name: 'tape_adhesive_line',
    priority: 65,
    test: (ctx) =>
      /\bTAPE\b|PET[-\s]|PROTECTOR\s+FILM|UB\s*FILM|ADHESIVE\b|\bSCREW\b|\bFILM\b/i.test(
        ctx.norm
      ) && !/\bDISPLAY\b|\bOLED\b|\bLCD\b|\bOCTA\b/i.test(ctx.norm),
    hit: () => ({
      mapTarget: LCA_TARGET.ADHESIVE_SMALL,
      carbonImpact: 'Very low',
      source: 'description',
      repairCategory: 'Adhesive / consumable',
      publicCategory: 'CONSUMABLE/OTHER',
      impactLevel: 2,
      isElectronic: false,
    }),
  },
  {
    name: 'smt_without_octa_pba',
    priority: 60,
    test: (ctx) =>
      /\bSMT\b/.test(ctx.norm) &&
      !hasMeaningfulOcta(ctx.norm) &&
      !/\bPBA\b/.test(ctx.norm),
    hit: () => ({
      mapTarget: LCA_TARGET.DISPLAY_GENERIC,
      carbonImpact: 'Medium',
      source: 'description',
      repairCategory: 'SMT assembly (generic)',
      publicCategory: 'LOGIC_CONNECTOR',
      impactLevel: 5,
      isElectronic: true,
    }),
  },
  {
    name: 'gh59_dlc',
    priority: 56,
    test: (ctx) => ctx.prefix === 'GH59',
    hit: () => ({
      mapTarget: LCA_TARGET.DLC,
      carbonImpact: 'Medium-low',
      source: 'prefix',
      repairCategory: 'Flex / connector (DLC)',
      publicCategory: 'DLC_CONNECTOR',
      impactLevel: 4,
      isElectronic: true,
    }),
  },
  {
    name: 'pba_flex_sub',
    priority: 55,
    test: (ctx) =>
      /\bPBA\b|\bFPC\b|\bFLEX\b|\bCON\s+TO\s+CON\b|LOWER\s+PBA/i.test(ctx.norm) ||
      (/\bSUB\s+UB\b/i.test(ctx.norm) && !isKitBackCoverTape(ctx.norm)),
    hit: () => ({
      mapTarget: LCA_TARGET.FLEX_SUB_PBA,
      carbonImpact: 'Medium-low',
      source: 'description',
      repairCategory: 'Sub-board / flex',
      publicCategory: 'BOARD_FLEX',
      impactLevel: 5,
      isElectronic: true,
    }),
  },
  {
    name: 'gh96_gh39_default_flex',
    priority: 51,
    test: (ctx) => ctx.prefix === 'GH96' || ctx.prefix === 'GH39',
    hit: () => ({
      mapTarget: LCA_TARGET.FLEX_SUB_PBA,
      carbonImpact: 'Medium-low',
      source: 'prefix',
      repairCategory: 'PCBA / flex (default)',
      publicCategory: 'BOARD_FLEX',
      impactLevel: 5,
      isElectronic: true,
    }),
  },
  {
    name: 'prefix_adhesive',
    priority: 25,
    test: (ctx) => ['GH81', 'GH02', 'GH42'].includes(ctx.prefix),
    hit: () => ({
      mapTarget: LCA_TARGET.ADHESIVE_SMALL,
      carbonImpact: 'Minimal',
      source: 'prefix',
      repairCategory: 'Adhesive / small mechanical',
      publicCategory: 'CONSUMABLE/OTHER',
      impactLevel: 2,
      isElectronic: false,
    }),
  },
  {
    name: 'gh82_family_mechanical_assy',
    priority: 22,
    test: (ctx) =>
      ['GH82', 'GH97', 'GH98', 'GH99'].includes(ctx.prefix) &&
      /\bASSY\b/i.test(ctx.norm) &&
      !/\bDISPLAY\b|\bOLED\b|\bLCD\b/i.test(ctx.norm),
    hit: () => ({
      mapTarget: LCA_TARGET.DISPLAY_GENERIC,
      carbonImpact: 'Medium',
      source: 'description',
      repairCategory: 'Mechanical assembly',
      publicCategory: 'MECHANICAL_ASSY',
      impactLevel: 5,
      isElectronic: false,
    }),
  },
  {
    name: 'prefix_display_service_pack',
    priority: 20,
    test: (ctx) => ['GH82', 'GH97', 'GH98', 'GH99'].includes(ctx.prefix),
    hit: () => ({
      mapTarget: LCA_TARGET.DISPLAY_GENERIC,
      carbonImpact: 'High',
      source: 'prefix',
      repairCategory: 'Display-class (prefix default)',
      publicCategory: 'ELECTRONICS_SERVICE_PACK',
      impactLevel: 6,
      isElectronic: true,
    }),
  },
];

SAMSUNG_RULES.sort((a, b) => b.priority - a.priority);

/**
 * @param {ReturnType<typeof buildContext>} ctx
 * @returns {ReturnType<SamsungRule['hit']> & { matchedRule: string } | null}
 */
function matchSamsungRule(ctx) {
  for (const rule of SAMSUNG_RULES) {
    try {
      if (rule.test(ctx)) {
        const h = rule.hit(ctx);
        return { ...h, matchedRule: rule.name };
      }
    } catch {
      /* continue */
    }
  }
  return null;
}

/**
 * LCA interpretation for repair CO₂ mapping (replaces legacy `interpretSamsungPart` in repairs.js).
 * @param {string} description Catalogue / GSPN text (and repair free text when no row desc).
 * @param {{ logic?: string, category?: string }} [meta] From `part_descp` when seeded.
 * @returns {{ category: string, mapTarget: string, carbonImpact: string, source: string }}
 */
function interpretSamsungPart(partNumber, description, meta = {}) {
  const pn = String(partNumber ?? '').trim().toUpperCase();
  const out = (category, mapTarget, carbonImpact, source) => ({
    category,
    mapTarget,
    carbonImpact,
    source,
  });

  if (!pn || pn === '0') {
    return out('Unknown', LCA_TARGET.UNKNOWN, 'TBD', 'none');
  }

  const fromDb = tryInterpretFromPartDescp(meta);
  if (fromDb) {
    return out(fromDb.repairCategory, fromDb.mapTarget, fromDb.carbonImpact, 'part_descp');
  }

  const ctx = buildContext(partNumber, description);
  const hit = matchSamsungRule(ctx);
  if (hit) {
    return out(hit.repairCategory, hit.mapTarget, hit.carbonImpact, hit.source);
  }

  return out('Unknown', LCA_TARGET.UNKNOWN, 'TBD', 'prefix');
}

/**
 * Public carbon / complexity classification.
 * @param {string} partNo
 * @param {string} [description]
 * @param {{ logic?: string, category?: string }} [meta] From `part_descp` when present.
 * @returns {PartClassification}
 */
function classifyPart(partNo, description = '', meta = {}) {
  const pn = String(partNo ?? '').trim().toUpperCase();
  if (!pn || pn === '0') {
    return {
      category: 'UNCLASSIFIED',
      impactLevel: 1,
      isElectronic: false,
      matchedRule: 'empty',
    };
  }

  const fromDb = tryInterpretFromPartDescp(meta);
  if (fromDb) {
    const pub =
      fromDb.mapTarget === LCA_TARGET.DISPLAY_MAIN
        ? 'DISPLAY_MAIN'
        : fromDb.mapTarget === LCA_TARGET.BATTERY
          ? 'BATTERY'
          : fromDb.mapTarget === LCA_TARGET.ADHESIVE_SMALL
            ? 'OTHER/MAINTENANCE'
            : 'UNCLASSIFIED';
    const impact =
      fromDb.mapTarget === LCA_TARGET.DISPLAY_MAIN
        ? 9
        : fromDb.mapTarget === LCA_TARGET.BATTERY
          ? 8
          : fromDb.mapTarget === LCA_TARGET.ADHESIVE_SMALL
            ? 2
            : 4;
    const electronic =
      fromDb.mapTarget === LCA_TARGET.DISPLAY_MAIN || fromDb.mapTarget === LCA_TARGET.BATTERY;
    return {
      category: pub,
      impactLevel: Math.min(10, Math.max(1, impact)),
      isElectronic: electronic,
      matchedRule: 'part_descp',
    };
  }

  const ctx = buildContext(partNo, description);
  const hit = matchSamsungRule(ctx);
  if (hit) {
    return {
      category: hit.publicCategory,
      impactLevel: Math.min(10, Math.max(1, hit.impactLevel)),
      isElectronic: Boolean(hit.isElectronic),
      matchedRule: hit.matchedRule,
    };
  }

  return {
    category: 'UNCLASSIFIED',
    impactLevel: 4,
    isElectronic: false,
    matchedRule: 'default',
  };
}

/**
 * Pull a Samsung-style SKU from a ranked / annotated line, e.g. `2. GH82-35143A — 30` → `GH82-35143A`.
 * Strips leading `1.` / `1)` numbering and ignores trailing em-dash counts. Matches `GH##-#####…` and `EB-B…`.
 * @param {string} line
 * @returns {string} Uppercase SKU or '' if none found
 */
function extractPartSkuFromLine(line) {
  const s = String(line ?? '')
    .trim()
    .replace(/^\d+[\.\)]\s*/, '');
  const m = s.match(/\b(EB-B[A-Z0-9][A-Z0-9-]*|GH\d{2}-\d{5}[A-Z0-9]*)\b/i);
  return m ? m[1].toUpperCase() : '';
}

module.exports = {
  classifyPart,
  interpretSamsungPart,
  tryInterpretFromPartDescp,
  normalizeCatalogText,
  extractSamsungPrefix,
  extractPartSkuFromLine,
  LCA_TARGET,
  /** @deprecated Use extractSamsungPrefix — kept for call-sites that prefer the old name */
  samsungServicePrefix: extractSamsungPrefix,
};
