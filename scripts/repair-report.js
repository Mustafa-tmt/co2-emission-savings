require('dotenv').config({ path: '.env' });
const { getAll, getRepairJobsOrdered, pool } = require('../lib/db');
const {
  buildRepairLookupContext,
  evaluateRepairJob,
} = require('../lib/repairs');
const { getCO2Equivalents } = require('../lib/co2Equivalents');

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

function printCo2Equivalents(savedLifecycleKg, seed) {
  hr();
  console.log('7. Tangible equivalents (vs full lifecycle avoided CO₂e, illustrative)');
  const eq = getCO2Equivalents(savedLifecycleKg, { seed, scope: 'job' });
  if (!eq) {
    console.log('   No positive “avoided” CO2e for this heuristic — no equivalents to show.');
    console.log('');
    return;
  }
  console.log(`   Based on ≈ ${eq.co2Kg} kg CO2e avoided (vs full lifecycle reference for a new phone).`);
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

  console.log('3. Reference — new phone of this type (full lifecycle in database)');
  console.log(`   Manufacturing + distribution + use + disposal:  ${formatKg(a.lifecycleBaseline)}`);
  console.log('');

  console.log('4. This repair — spare parts (model estimate)');
  console.log(`   Sum of mapped parts:          ${formatKg(a.partsCo2)}`);
  console.log('');

  console.log('5. Simple “avoided emissions” heuristic');
  console.log(`   vs full lifecycle reference:  ${formatKg(a.approxAvoidedLifecycle)}`);
  console.log('   (Reference from step 3, minus part sum from step 4. Can be zero if parts sum is high.)');
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

  printCo2Equivalents(
    a.approxAvoidedLifecycle,
    parsed.jobId || result.jobLabel || ''
  );
  console.log('');
}

async function main() {
  const args = process.argv.slice(2);
  const limit = parseLimitArg(args);

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
  console.log('Units: kg CO2e (kilograms of CO2-equivalent) from your device / component tables.');
  console.log(
    '“Avoided” = full-lifecycle reference for a new phone (manufacturing + distribution + use + disposal from DB) minus estimated footprint of listed spare parts. Not an LCA of the repair shop or logistics.'
  );
  console.log('');

  for (const row of repairRows) {
    const result = evaluateRepairJob(row, ctx);
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
