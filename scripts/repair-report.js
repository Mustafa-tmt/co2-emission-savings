require('dotenv').config({ path: '.env' });
const { getAll, getRepairJobsOrdered, pool } = require('../lib/db');
const {
  buildRepairLookupContext,
  evaluateRepairJob,
} = require('../lib/repairs');
const { getCO2Equivalents } = require('../lib/co2Equivalents');
const {
  DEFAULT_SCENARIO,
  METHODOLOGY_VERSION,
  normalizeReplacementScenario,
} = require('../lib/co2Avoidance');

function parseLimitArg(argv) {
  const eq = argv.find((a) => a.startsWith('--limit='));
  if (eq) {
    const n = parseInt(eq.slice('--limit='.length), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const i = argv.indexOf('--limit');
  if (i >= 0 && argv[i + 1] != null && !String(argv[i + 1]).startsWith('-')) {
    const n = parseInt(argv[i + 1], 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function parseScenarioArg(argv) {
  const eq = argv.find((a) => a.startsWith('--scenario='));
  if (eq) {
    return normalizeReplacementScenario(eq.slice('--scenario='.length));
  }
  const i = argv.indexOf('--scenario');
  if (i >= 0 && argv[i + 1] != null && !String(argv[i + 1]).startsWith('-')) {
    return normalizeReplacementScenario(argv[i + 1]);
  }
  return DEFAULT_SCENARIO;
}

function formatKg(n, decimals = 3) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${Number(n).toFixed(decimals)} kg CO2e`;
}

function hr() {
  console.log('────────────────────────────────────────────────────────────');
}

function printSkipped(label, reason) {
  hr();
  console.log(`Job ${label} — skipped`);
  console.log(`  Reason: ${reason}`);
  console.log('');
}

function printFailed(label, message) {
  hr();
  console.log(`Job ${label} — failed`);
  console.log(`  ${message}`);
  console.log('');
}

function printCo2Equivalents(avoidedKg, seed) {
  hr();
  console.log('7. Tangible equivalents (manufacturing CO₂e avoided (est.), illustrative)');
  const eq = getCO2Equivalents(avoidedKg, { seed, scope: 'job' });
  if (!eq) {
    console.log('   No positive manufacturing avoided CO2e for this heuristic — no equivalents to show.');
    console.log('');
    return;
  }
  console.log(
    `   Based on ≈ ${eq.co2Kg} kg CO2e manufacturing avoided (est.) vs new-device manufacturing baseline (probability-weighted).`
  );
  console.log(`   ${eq.totalSaved}`);
  console.log(`   ${eq.headline}`);
  for (const card of eq.impacts) {
    console.log(`   • ${card.title}: ${card.body}`);
  }
  console.log(`   ${eq.footer}`);
  console.log('');
}

function printRepairResult(result) {
  if (result.status === 'skipped') {
    const label = result.jobLabel;
    printSkipped(
      label,
      `status is not REPAIRED (${String(result.parsed?.status || '(empty)')}).`
    );
    return;
  }

  if (result.status === 'failed') {
    printFailed(result.jobLabel, result.message || result.reason);
    return;
  }

  const { jobLabel, parsed, deviceResolution, defect, analysis: a } = result;
  const { device, matchedAs, matchTier } = deviceResolution;

  hr();
  console.log(`Job ${jobLabel}`);
  hr();
  console.log('');
  console.log('1. Device');
  console.log(`   Listed model:     ${parsed.model || '—'}`);
  console.log(`   Listed SKU code:  ${parsed.modelCodeSku || '—'}`);
  console.log(`   Matched database: ${device.model_code} — ${device.model_name}`);
  console.log(`   Match key:        ${matchedAs}`);
  console.log(`   Match tier:       ${matchTier}`);
  console.log('');

  console.log('2. Defect (reference + job notes)');
  console.log(`   Defect type (job):     ${defect.type || '—'}`);
  console.log(`   Catalogue description: ${defect.catalogDescription || '—'}`);
  console.log(`   Job defect notes:      ${defect.jobDescription || '—'}`);
  console.log('');

  console.log(
    `3. Reference — manufacturing phase baseline (new device of this type, manufacturing_co2 column only)`
  );
  console.log(`   Manufacturing phase (database):  ${formatKg(a.manufacturingBaseline)}`);
  console.log(`   Replacement scenario:            ${a.replacementScenario} (P = ${a.replacementProbabilityP})`);
  console.log('');

  console.log('4. This repair — spare parts + operational overhead');
  console.log(`   Sum of mapped parts:             ${formatKg(a.partsCo2)}`);
  console.log(`   Operational allowance (fixed):   ${formatKg(a.repairOperationalKg)}`);
  console.log(`   Repair burden (parts + ops):    ${formatKg(a.repairBurden)}`);
  console.log('');

  console.log(`5. Manufacturing CO₂e avoided (est.) — methodology ${METHODOLOGY_VERSION}`);
  console.log(`   max(0, P × manufacturing baseline − repair burden):  ${formatKg(a.avoidedKg)}`);
  console.log('');

  console.log('6. Part lines');
  for (const ln of a.lines) {
    if (ln.componentName == null) {
      console.log(
        `   [${ln.slot}] ${ln.sku} ×${ln.qty}  →  NOT MAPPED  (${ln.mapReason})`
      );
    } else {
      console.log(
        `   [${ln.slot}] ${ln.sku} ×${ln.qty}  →  ${ln.componentName}`
      );
      console.log(
        `        ${formatKg(ln.co2PerUnit, 4)} per unit × ${ln.qty} = ${formatKg(ln.lineCo2)}  [rule: ${ln.mapReason}]`
      );
    }
  }
  console.log('');

  if (a.warnings.length) {
    console.log('Warnings');
    for (const w of a.warnings) console.log(`   • ${w}`);
    console.log('');
  }

  if (result.status === 'partial') {
    console.log('Status: partial — one or more parts could not be mapped to LCA components.');
    console.log('');
  }

  printCo2Equivalents(a.avoidedKg, parsed.jobId || result.jobLabel || '');
  console.log('');
}

async function main() {
  const args = process.argv.slice(2);
  const limit = parseLimitArg(args);
  const replacementScenario = parseScenarioArg(args);

  const repairRows = await getRepairJobsOrdered(limit);

  const [devices, allComponents, partDescRows, defectDescRows] = await Promise.all([
    getAll('devices'),
    getAll('components'),
    getAll('part_descp'),
    getAll('defect_descp'),
  ]);

  const ctx = buildRepairLookupContext(
    devices,
    allComponents,
    partDescRows,
    defectDescRows
  );

  let failed = false;

  console.log('');
  console.log('REPAIR CO2 REPORT');
  console.log('Source: PostgreSQL — repair_jobs, devices, components, part_descp, defect_descp');
  if (limit != null) console.log(`Limit: first ${limit} row(s) by job_id (--limit)`);
  console.log(`Replacement scenario: ${replacementScenario} (--scenario=conservative|central|optimistic)`);
  console.log('Units: kg CO2e (kilograms of CO2-equivalent) from your device / component tables.');
  console.log(
    `Methodology ${METHODOLOGY_VERSION}: manufacturing-phase baseline × P minus mapped spare parts CO2e minus fixed operational allowance per job. Not a full organisational LCA.`
  );
  console.log('');

  for (const row of repairRows) {
    const result = evaluateRepairJob(row, ctx, { replacementScenario });
    printRepairResult(result);

    if (result.status === 'failed') failed = true;
    if (result.status === 'partial') failed = true;
  }

  await pool.end();
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  pool.end().finally(() => process.exit(1));
});
