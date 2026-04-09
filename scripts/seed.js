require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { pool } = require('../lib/db');

function decodeHtmlEntities(s) {
  if (s == null || typeof s !== 'string') return s;
  return s
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

const D = { decodeHtml: true };

// device_id / component_id are SERIAL: omit from CSV to let Postgres assign the next id.
const REPAIR_JOB_COLUMNS = [
  { csv: 'Job ID', db: 'job_id', type: 'int' },
  { csv: 'IMEI', db: 'imei', type: 'string', ...D },
  { csv: 'SN', db: 'sn', type: 'string', ...D },
  { csv: 'Make', db: 'make', type: 'string', ...D },
  { csv: 'Model', db: 'model', type: 'string', ...D },
  { csv: 'Color', db: 'color', type: 'string', ...D },
  { csv: 'Memory', db: 'memory', type: 'string', ...D },
  { csv: 'Device Type', db: 'device_type', type: 'string', ...D },
  { csv: 'Model Code', db: 'model_code', type: 'string', ...D },
  { csv: 'Last Repair Status', db: 'last_repair_status', type: 'string', ...D },
  { csv: 'Defect Type', db: 'defect_type', type: 'string', ...D },
  { csv: 'Defect Desc', db: 'defect_desc', type: 'string', ...D },
  { csv: 'Repair Description', db: 'repair_description', type: 'string', ...D },
];
for (let i = 1; i <= 15; i += 1) {
  REPAIR_JOB_COLUMNS.push({ csv: `Part${i}`, db: `part${i}`, type: 'partsku' });
  REPAIR_JOB_COLUMNS.push({ csv: `Qty${i}`, db: `qty${i}`, type: 'int' });
}

const SEED_CONFIG = [
  {
    order: 0,
    table: 'defect_descp',
    file: path.join(__dirname, '../data/defect_descp.csv'),
    conflictKey: 'defect_type',
    columns: [
      { csv: 'DefectType', db: 'defect_type', type: 'string' },
      { csv: 'Description', db: 'description', type: 'string' },
    ],
  },
  {
    order: 1,
    table: 'part_descp',
    file: path.join(__dirname, '../data/parts_descp.csv'),
    conflictKey: 'part_no',
    columns: [
      { csv: 'PartNo', db: 'part_no', type: 'string' },
      { csv: 'Description', db: 'description', type: 'string' },
      { csv: 'Logic', db: 'logic', type: 'string' },
      { csv: 'Category', db: 'category', type: 'string' },
    ],
  },
  {
    order: 2,
    table: 'devices',
    file: path.join(__dirname, '../data/devices_all.csv'),
    columns: [
      { csv: 'model_code', db: 'model_code', type: 'string' },
      { csv: 'model_name', db: 'model_name', type: 'string' },
      { csv: 'dimension_mm', db: 'dimension_mm', type: 'string' },
      { csv: 'display_mm', db: 'display_mm', type: 'number' },
      { csv: 'weight_product_acc_g', db: 'weight_product_acc_g', type: 'int' },
      { csv: 'weight_packages_g', db: 'weight_packages_g', type: 'int' },
      { csv: 'region', db: 'region', type: 'string' },
      { csv: 'manufacturing_co2', db: 'manufacturing_co2', type: 'number' },
      { csv: 'distribution_co2', db: 'distribution_co2', type: 'number' },
      { csv: 'use_co2', db: 'use_co2', type: 'number' },
      { csv: 'disposal_co2', db: 'disposal_co2', type: 'number' },
    ],
  },
  {
    order: 3,
    table: 'components',
    file: path.join(__dirname, '../data/components_all.csv'),
    columns: [
      { csv: 'device_id', db: 'device_id', type: 'int' },
      { csv: 'component_name', db: 'component_name', type: 'string' },
      { csv: 'co2_emitted', db: 'co2_emitted', type: 'number' },
      { csv: 'global_warming_pct', db: 'global_warming_pct', type: 'number' },
    ],
  },
  {
    order: 4,
    table: 'repair_jobs',
    file: path.join(__dirname, '../data/repairs.csv'),
    conflictKey: 'job_id',
    columns: REPAIR_JOB_COLUMNS,
  },
];

const SEED_TABLE_NAMES = new Set(SEED_CONFIG.map((c) => c.table));

/** `--only=part_descp,repair_jobs` or `--only part_descp,repair_jobs` */
function parseOnlyTables() {
  const eqArg = process.argv.find((a) => a.startsWith('--only='));
  if (eqArg) {
    return eqArg
      .slice('--only='.length)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const i = process.argv.indexOf('--only');
  if (i >= 0) {
    const next = process.argv[i + 1];
    if (next && !next.startsWith('-')) {
      return next
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return null;
}

function parseVal(val, type) {
  const v = typeof val === 'string' ? val.trim() : val;
  if (v === '' || v == null) return null;
  if (type === 'partsku') {
    const s = String(v).trim();
    if (s === '' || s === '0') return null;
    return s;
  }
  if (type === 'int') { const n = parseInt(v, 10); return Number.isNaN(n) ? null : n; }
  if (type === 'number') { const n = parseFloat(v); return Number.isNaN(n) ? null : n; }
  return v;
}

function rowToValues(row, columns) {
  return columns.map((c) => {
    let x = parseVal(row[c.csv], c.type);
    if (c.decodeHtml && x != null && typeof x === 'string') x = decodeHtmlEntities(x);
    return x;
  });
}

async function seedOne({ table, file, columns, conflictKey }) {
  if (!fs.existsSync(file)) {
    console.warn(`Skip ${table}: file not found`);
    return { table, n: 0 };
  }
  const { data: rows } = Papa.parse(fs.readFileSync(file, 'utf8'), { header: true, skipEmptyLines: true });
  const dbCols = columns.map((c) => c.db);
  const placeholders = dbCols.map((_, i) => `$${i + 1}`).join(', ');
  let sql = `INSERT INTO ${table} (${dbCols.join(', ')}) VALUES (${placeholders})`;
  if (conflictKey) {
    const updateCols = dbCols.filter((c) => c !== conflictKey);
    const setClause = updateCols.map((c) => `${c} = EXCLUDED.${c}`).join(', ');
    sql += ` ON CONFLICT (${conflictKey}) DO UPDATE SET ${setClause}`;
  }
  let inserted = 0;
  const conflictIdx = conflictKey ? dbCols.indexOf(conflictKey) : -1;
  for (const row of rows) {
    const vals = rowToValues(row, columns);
    if (conflictIdx >= 0 && (vals[conflictIdx] == null || vals[conflictIdx] === '')) continue;
    await pool.query(sql, vals);
    inserted += 1;
  }
  return { table, n: inserted };
}

async function main() {
  const replace = process.argv.includes('--replace');
  let configs = [...SEED_CONFIG].sort((a, b) => (a.order || 0) - (b.order || 0));

  const only = parseOnlyTables();
  if (only != null) {
    if (only.length === 0) {
      console.error('Usage: --only table1,table2  (e.g. --only part_descp,repair_jobs)');
      process.exit(1);
    }
    for (const t of only) {
      if (!SEED_TABLE_NAMES.has(t)) {
        console.error(
          `Unknown table "${t}". Use one or more of: ${[...SEED_TABLE_NAMES].join(', ')}`
        );
        process.exit(1);
      }
    }
    const want = new Set(only);
    configs = configs.filter((c) => want.has(c.table));
    console.log(`Limited seed: ${configs.map((c) => c.table).join(', ')}`);
  }

  if (replace) {
    for (const { table } of [...configs].reverse()) {
      await pool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
      console.log(`Truncated ${table}`);
    }
  }

  console.log(replace ? 'Seeding (replace)...' : 'Seeding (insert)...');
  for (const cfg of configs) {
    const { table, n } = await seedOne(cfg);
    if (n) console.log(`${table}: ${n} rows inserted`);
  }
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
