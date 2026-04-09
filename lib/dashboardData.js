/**
 * Server-side dashboard and report payloads: repair evaluation + serializable JSON.
 * Used by Next.js server components and API routes (PDF).
 */
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS shared with Node scripts */

const { getAll, getRepairJobsOrdered, getRepairJobByJobId } = require('./db');
const { buildRepairLookupContext, evaluateRepairJob } = require('./repairs');
const { getCO2Equivalents } = require('./co2Equivalents');

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

  let savedLifecycleKg = 0;
  let deviceLabel = null;
  let matchTier = null;
  let failReason = null;

  if (status === 'ok' || status === 'partial') {
    const a = result.analysis;
    savedLifecycleKg = Number(a.approxAvoidedLifecycle) || 0;
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
    savedLifecycleKg,
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

  const ctx = await loadLookupContext();
  const rows = await getRepairJobsOrdered();

  const summaries = rows.map((raw) =>
    buildJobSummary(raw, evaluateRepairJob(raw, ctx), ctx.defectDescriptionMap)
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
      totalSavedKg += s.savedLifecycleKg;
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
      dAgg.savedKg += s.savedLifecycleKg;
    }

    const key = s.deviceLabel || s.modelCode || s.model || 'Unmatched / unknown device';
    if (!modelAgg.has(key)) {
      modelAgg.set(key, { label: key, savedKg: 0, jobCount: 0 });
    }
    const agg = modelAgg.get(key);
    agg.jobCount += 1;
    agg.savedKg += s.savedLifecycleKg;
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
      label: 'Savings estimate — complete',
      hint: 'Every spare part matched to an LCA component line.',
      count: okCount,
      color: '#059669',
    },
    {
      key: 'partial',
      label: 'Savings estimate — partial',
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
      seed: `portfolio-${String(totalSavedKg)}`,
    }),
    topModels,
    charts,
    search: search.trim(),
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
 */
function serializeJobReport(rawRow, result) {
  const jobId = rawRow.job_id != null ? String(rawRow.job_id) : '';

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
  };

  if (result.status === 'skipped') {
    return {
      ...base,
      defect: null,
      deviceResolution: null,
      analysis: null,
      equivalents: null,
      warnings: [],
      message: 'Job is not in REPAIRED status; no CO₂ savings estimate.',
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
  const savedLifecycle = Number(a.approxAvoidedLifecycle) || 0;
  const equivalentSeed =
    jobId || `repair_job_id:${rawRow.repair_job_id != null ? rawRow.repair_job_id : 0}`;
  const equivalents = getCO2Equivalents(savedLifecycle, {
    seed: equivalentSeed,
    scope: 'job',
  });

  return {
    ...base,
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
      lifecycleBaseline: a.lifecycleBaseline,
      partsCo2: a.partsCo2,
      approxAvoidedLifecycle: a.approxAvoidedLifecycle,
      lines: serializeAnalysisLines(a.lines),
    },
    equivalents,
    warnings: Array.isArray(a.warnings) ? [...a.warnings] : [],
    message: null,
  };
}

async function getJobReportPayload(jobIdStr) {
  const raw = await getRepairJobByJobId(jobIdStr);
  if (!raw) return null;
  const ctx = await loadLookupContext();
  const result = evaluateRepairJob(raw, ctx);
  return serializeJobReport(raw, result);
}

module.exports = {
  loadLookupContext,
  getDashboardData,
  getJobReportPayload,
  serializeJobReport,
  DEFAULT_PAGE_SIZE,
};
