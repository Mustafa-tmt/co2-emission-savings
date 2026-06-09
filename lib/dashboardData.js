/**
 * Server-side dashboard and report payloads: repair evaluation + serializable JSON.
 * Used by Next.js server components and API routes (PDF).
 */
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS shared with Node scripts */

const { getAll, getRepairJobsOrdered, getRepairJobByJobId } = require('./db');
const { buildRepairLookupContext, evaluateRepairJob } = require('./repairs');
const { getCO2Equivalents } = require('./co2Equivalents');
const {
  DEFAULT_SCENARIO,
  METHODOLOGY_VERSION,
  normalizeReplacementScenario,
  REPAIR_OPERATIONAL_KG_CO2E,
} = require('./co2Avoidance');

const DEFAULT_PAGE_SIZE = 25;

async function loadLookupContext() {
  const [devices, allComponents, partDescRows, defectDescRows] = await Promise.all([
    getAll('devices'),
    getAll('components'),
    getAll('part_descp'),
    getAll('defect_descp'),
  ]);
  return buildRepairLookupContext(
    devices,
    allComponents,
    partDescRows,
    defectDescRows
  );
}

function jobMatchesSearch(summary, rawQuery) {
  const q = String(rawQuery ?? '').trim().toLowerCase();
  if (!q) return true;
  const parts = [
    summary.jobId,
    summary.imei,
    summary.model,
    summary.modelCode,
    summary.make,
    summary.deviceLabel,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  return parts.some((p) => p.includes(q));
}

function buildJobSummary(rawRow, result, defectDescriptionMap) {
  const jobId = rawRow.job_id != null ? String(rawRow.job_id) : '';
  const imei = rawRow.imei != null ? String(rawRow.imei) : '';
  const model = rawRow.model != null ? String(rawRow.model) : '';
  const modelCode = rawRow.model_code != null ? String(rawRow.model_code) : '';
  const make = rawRow.make != null ? String(rawRow.make) : '';
  const status = result.status;

  let defectLabel = 'Unspecified';
  const defectTypeRaw = rawRow.defect_type != null ? String(rawRow.defect_type).trim() : '';
  if (defectTypeRaw) {
    const key = defectTypeRaw.toUpperCase();
    const catalog =
      defectDescriptionMap instanceof Map ? defectDescriptionMap.get(key) : null;
    defectLabel =
      catalog != null && String(catalog).trim()
        ? String(catalog).trim()
        : defectTypeRaw;
  }

  let avoidedKg = 0;
  let deviceLabel = null;
  let matchTier = null;
  let failReason = null;

  if (status === 'ok' || status === 'partial') {
    const a = result.analysis;
    avoidedKg = Number(a.avoidedKg) || 0;
    if (result.deviceResolution?.device) {
      const d = result.deviceResolution.device;
      deviceLabel = `${d.model_code} · ${d.model_name}`;
    }
    matchTier = result.deviceResolution?.matchTier ?? null;
  }
  if (status === 'failed') {
    failReason = result.reason || 'FAILED';
  }
  if (status === 'skipped') {
    failReason = result.reason || 'NOT_REPAIRED';
  }

  return {
    jobId,
    repairJobPk: rawRow.repair_job_id,
    imei,
    model,
    modelCode,
    make,
    status,
    avoidedKg,
    deviceLabel,
    matchTier,
    failReason,
    defectLabel,
  };
}

function roundKg(n) {
  return Math.round(Number(n) * 1000) / 1000;
}

/**
 * @param {{ search?: string, page?: number, pageSize?: number }} options
 */
async function getDashboardData(options = {}) {
  const search = typeof options.search === 'string' ? options.search : '';
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(
    100,
    Math.max(5, Number(options.pageSize) || DEFAULT_PAGE_SIZE)
  );
  const replacementScenario = normalizeReplacementScenario(options.replacementScenario);

  const ctx = await loadLookupContext();
  const rows = await getRepairJobsOrdered();

  const summaries = rows.map((raw) =>
    buildJobSummary(
      raw,
      evaluateRepairJob(raw, ctx, { replacementScenario }),
      ctx.defectDescriptionMap
    )
  );

  let totalSavedKg = 0;
  let okCount = 0;
  let partialCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const modelAgg = new Map();
  const defectSavingsAgg = new Map();

  for (const s of summaries) {
    if (s.status === 'ok' || s.status === 'partial') {
      totalSavedKg += s.avoidedKg;
    }
    if (s.status === 'ok') {
      okCount += 1;
    } else if (s.status === 'partial') {
      partialCount += 1;
    } else if (s.status === 'failed') failedCount += 1;
    else skippedCount += 1;

    if (s.status === 'ok' || s.status === 'partial') {
      const dKey = s.defectLabel || 'Unspecified';
      if (!defectSavingsAgg.has(dKey)) {
        defectSavingsAgg.set(dKey, { label: dKey, savedKg: 0, jobCount: 0 });
      }
      const dAgg = defectSavingsAgg.get(dKey);
      dAgg.jobCount += 1;
      dAgg.savedKg += s.avoidedKg;
    }

    const key = s.deviceLabel || s.modelCode || s.model || 'Unmatched / unknown device';
    if (!modelAgg.has(key)) {
      modelAgg.set(key, { label: key, savedKg: 0, jobCount: 0 });
    }
    const agg = modelAgg.get(key);
    agg.jobCount += 1;
    agg.savedKg += s.avoidedKg;
  }

  const filtered = summaries.filter((s) => jobMatchesSearch(s, search));
  const totalFiltered = filtered.length;
  const start = (page - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  const topModels = [...modelAgg.values()]
    .sort((a, b) => b.savedKg - a.savedKg)
    .slice(0, 8);

  const jobPipeline = [
    {
      key: 'ok',
      label: 'Manufacturing avoided estimate — complete',
      hint: 'Every spare part matched to an LCA component line.',
      count: okCount,
      color: '#059669',
    },
    {
      key: 'partial',
      label: 'Manufacturing avoided estimate — partial',
      hint: 'At least one part unmatched; total may under-state true avoidance.',
      count: partialCount,
      color: '#d97706',
    },
    {
      key: 'failed',
      label: 'No estimate (failed)',
      hint: 'Device unknown, no parts, missing components, or other blocking issue.',
      count: failedCount,
      color: '#e11d48',
    },
    {
      key: 'skipped',
      label: 'Excluded (not repaired)',
      hint: 'Job not in repaired status; no CO₂e calculation.',
      count: skippedCount,
      color: '#64748b',
    },
  ]
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  const defectSavings = [...defectSavingsAgg.values()]
    .map((r) => ({
      label: r.label,
      savedKg: roundKg(r.savedKg),
      jobCount: r.jobCount,
    }))
    .sort((a, b) => b.savedKg - a.savedKg)
    .slice(0, 8);

  /**
   * Unique models (partial/failed) needing data — one row per **model name**;
   * `modelNumberCount` = distinct model numbers (regional SKUs) in that group.
   */
  const attentionByName = new Map();
  for (const s of summaries) {
    if (s.status !== 'partial' && s.status !== 'failed') continue;
    const code = (s.modelCode || '').trim();
    const name = (s.model || '').trim();
    const key = name
      ? `name:${name.toUpperCase()}`
      : code
        ? `code:${code.toUpperCase()}`
        : 'unknown';
    if (!attentionByName.has(key)) {
      attentionByName.set(key, {
        modelName: name || '—',
        codes: new Set(),
      });
    }
    const g = attentionByName.get(key);
    if (code) g.codes.add(code);
  }
  const attentionModels = [...attentionByName.values()]
    .map((g) => ({
      modelName: g.modelName,
      modelNumberCount: g.codes.size,
    }))
    .sort((a, b) =>
      String(a.modelName).localeCompare(String(b.modelName), undefined, { sensitivity: 'base' })
    );

  const charts = {
    jobPipeline,
    defectSavings,
  };

  return {
    summaries: pageRows,
    pagination: {
      page,
      pageSize,
      total: totalFiltered,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    },
    totals: {
      jobs: rows.length,
      okCount,
      partialCount,
      failedCount,
      skippedCount,
      totalSavedKg,
    },
    equivalents: getCO2Equivalents(totalSavedKg, {
      scope: 'portfolio',
      seed: `portfolio-${replacementScenario}-${String(totalSavedKg)}`,
    }),
    topModels,
    attentionModels,
    charts,
    search: search.trim(),
    replacementScenario,
    methodologyVersion: METHODOLOGY_VERSION,
  };
}

function serializeDevice(device) {
  if (!device) return null;
  return {
    model_code: device.model_code,
    model_name: device.model_name,
    manufacturing_co2: device.manufacturing_co2,
    distribution_co2: device.distribution_co2,
    use_co2: device.use_co2,
    disposal_co2: device.disposal_co2,
  };
}

function serializeAnalysisLines(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.map((ln) => ({
    slot: ln.slot,
    sku: ln.sku,
    desc: ln.desc,
    partDescp: ln.partDescp != null ? String(ln.partDescp) : '',
    qty: ln.qty,
    componentName: ln.componentName,
    co2PerUnit: ln.co2PerUnit,
    lineCo2: ln.lineCo2,
    mapReason: ln.mapReason,
  }));
}

/**
 * Full job report for UI, print view, and PDF (plain JSON).
 * @param {string} [requestedScenario]
 */
function serializeJobReport(rawRow, result, requestedScenario) {
  const jobId = rawRow.job_id != null ? String(rawRow.job_id) : '';
  const scenarioNorm = normalizeReplacementScenario(requestedScenario);

  const base = {
    jobId,
    repairJobPk: rawRow.repair_job_id,
    imei: rawRow.imei != null ? String(rawRow.imei) : '',
    sn: rawRow.sn != null ? String(rawRow.sn) : '',
    make: rawRow.make != null ? String(rawRow.make) : '',
    model: rawRow.model != null ? String(rawRow.model) : '',
    modelCode: rawRow.model_code != null ? String(rawRow.model_code) : '',
    repairStatus: rawRow.last_repair_status != null ? String(rawRow.last_repair_status) : '',
    repairDescription:
      rawRow.repair_description != null ? String(rawRow.repair_description) : '',
    evaluationStatus: result.status,
    jobLabel: result.jobLabel,
    methodologyVersion: METHODOLOGY_VERSION,
    replacementScenario: scenarioNorm,
  };

  if (result.status === 'skipped') {
    return {
      ...base,
      defect: null,
      deviceResolution: null,
      analysis: null,
      equivalents: null,
      warnings: [],
      message:
        'Job is not in REPAIRED status; no manufacturing CO₂e avoided estimate.',
    };
  }

  if (result.status === 'failed') {
    return {
      ...base,
      defect: null,
      deviceResolution: null,
      analysis: null,
      equivalents: null,
      warnings: [],
      message: result.message || String(result.reason || 'Evaluation failed'),
    };
  }

  const a = result.analysis;
  const avoided = Number(a.avoidedKg) || 0;
  const equivalentSeed =
    jobId || `repair_job_id:${rawRow.repair_job_id != null ? rawRow.repair_job_id : 0}`;
  const equivalents = getCO2Equivalents(avoided, {
    seed: `${equivalentSeed}-${a.replacementScenario}`,
    scope: 'job',
  });

  return {
    ...base,
    replacementScenario: a.replacementScenario,
    defect: result.defect
      ? {
          type: result.defect.type,
          jobDescription: result.defect.jobDescription,
          catalogDescription: result.defect.catalogDescription,
        }
      : null,
    deviceResolution: result.deviceResolution
      ? {
          matchedAs: result.deviceResolution.matchedAs,
          matchTier: result.deviceResolution.matchTier,
          device: serializeDevice(result.deviceResolution.device),
        }
      : null,
    analysis: {
      manufacturingBaseline: a.manufacturingBaseline,
      partsCo2: a.partsCo2,
      repairOperationalKg: REPAIR_OPERATIONAL_KG_CO2E,
      repairBurden: a.repairBurden,
      avoidedKg: a.avoidedKg,
      replacementScenario: a.replacementScenario,
      replacementProbabilityP: a.replacementProbabilityP,
      methodologyVersion: METHODOLOGY_VERSION,
      lines: serializeAnalysisLines(a.lines),
    },
    equivalents,
    warnings: Array.isArray(a.warnings) ? [...a.warnings] : [],
    message: null,
  };
}

async function getJobReportPayload(jobIdStr, replacementScenarioOpt) {
  const raw = await getRepairJobByJobId(jobIdStr);
  if (!raw) return null;
  const ctx = await loadLookupContext();
  const replacementScenario = normalizeReplacementScenario(replacementScenarioOpt);
  const result = evaluateRepairJob(raw, ctx, { replacementScenario });
  return serializeJobReport(raw, result, replacementScenario);
}

module.exports = {
  loadLookupContext,
  getDashboardData,
  getJobReportPayload,
  serializeJobReport,
  DEFAULT_PAGE_SIZE,
};
