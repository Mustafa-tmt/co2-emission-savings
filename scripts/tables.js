require('dotenv').config({ path: '.env' });
const { pool } = require('../lib/db');

const DDL = [
  `CREATE TABLE IF NOT EXISTS devices (
    device_id SERIAL PRIMARY KEY,
    model_code VARCHAR(100) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    dimension_mm VARCHAR(100),
    display_mm DOUBLE PRECISION,
    weight_product_acc_g INTEGER,
    weight_packages_g INTEGER,
    region VARCHAR(20) NOT NULL,
    manufacturing_co2 DOUBLE PRECISION NOT NULL,
    distribution_co2 DOUBLE PRECISION,
    use_co2 DOUBLE PRECISION,
    disposal_co2 DOUBLE PRECISION
  )`,
  `CREATE TABLE IF NOT EXISTS components (
    component_id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    component_name VARCHAR(255) NOT NULL,
    co2_emitted DOUBLE PRECISION NOT NULL,
    global_warming_pct DOUBLE PRECISION
  )`,
  `CREATE TABLE IF NOT EXISTS repair_jobs (
    repair_job_id SERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL UNIQUE,
    imei VARCHAR(20),
    sn VARCHAR(64),
    make VARCHAR(100),
    model VARCHAR(255),
    color VARCHAR(100),
    memory VARCHAR(64),
    device_type VARCHAR(100),
    model_code VARCHAR(100),
    last_repair_status VARCHAR(64),
    defect_type VARCHAR(32),
    defect_desc TEXT,
    repair_description TEXT,
    part1 VARCHAR(64), qty1 INTEGER,
    part2 VARCHAR(64), qty2 INTEGER,
    part3 VARCHAR(64), qty3 INTEGER,
    part4 VARCHAR(64), qty4 INTEGER,
    part5 VARCHAR(64), qty5 INTEGER,
    part6 VARCHAR(64), qty6 INTEGER,
    part7 VARCHAR(64), qty7 INTEGER,
    part8 VARCHAR(64), qty8 INTEGER,
    part9 VARCHAR(64), qty9 INTEGER,
    part10 VARCHAR(64), qty10 INTEGER,
    part11 VARCHAR(64), qty11 INTEGER,
    part12 VARCHAR(64), qty12 INTEGER,
    part13 VARCHAR(64), qty13 INTEGER,
    part14 VARCHAR(64), qty14 INTEGER,
    part15 VARCHAR(64), qty15 INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS part_descp (
    part_no VARCHAR(80) PRIMARY KEY,
    description TEXT,
    logic TEXT,
    category TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS defect_descp (
    defect_type VARCHAR(32) PRIMARY KEY,
    description TEXT
  )`,
];

// Add columns on existing DBs (CREATE TABLE IF NOT EXISTS does not alter).
const MIGRATIONS = [
  'ALTER TABLE part_descp ADD COLUMN IF NOT EXISTS logic TEXT',
  'ALTER TABLE part_descp ADD COLUMN IF NOT EXISTS category TEXT',
];

// Remove legacy unique constraints/indexes if present (harmless if missing).
const CLEANUP = [
  'ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_model_code_key',
  'ALTER TABLE components DROP CONSTRAINT IF EXISTS components_device_id_component_name_key',
  'DROP INDEX IF EXISTS idx_devices_model_code',
  'DROP INDEX IF EXISTS idx_components_device_id_component_name',
];

async function main() {
  for (const q of CLEANUP) await pool.query(q);
  for (const q of DDL) await pool.query(q);
  for (const q of MIGRATIONS) await pool.query(q);
  console.log('Tables OK (devices, components, repair_jobs, part_descp, defect_descp).');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
