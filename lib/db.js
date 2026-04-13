const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Table name -> { pk, columns }. Add new tables here when you add them to the DB.
const TABLES = {
  devices: {
    pk: 'device_id',
    columns: [
      'model_code', 'model_name', 'dimension_mm', 'display_mm',
      'weight_product_acc_g', 'weight_packages_g', 'region',
      'manufacturing_co2', 'distribution_co2', 'use_co2', 'disposal_co2',
    ],
  },
  components: {
    pk: 'component_id',
    columns: ['device_id', 'component_name', 'co2_emitted', 'global_warming_pct'],
  },
  repair_jobs: {
    pk: 'repair_job_id',
    columns: [
      'job_id', 'imei', 'sn', 'make', 'model', 'color', 'memory', 'device_type',
      'model_code', 'last_repair_status', 'defect_type', 'defect_desc', 'repair_description',
      'part1', 'qty1', 'part2', 'qty2', 'part3', 'qty3', 'part4', 'qty4', 'part5', 'qty5',
      'part6', 'qty6', 'part7', 'qty7', 'part8', 'qty8', 'part9', 'qty9', 'part10', 'qty10',
      'part11', 'qty11', 'part12', 'qty12', 'part13', 'qty13', 'part14', 'qty14', 'part15', 'qty15',
    ],
  },
  part_descp: {
    pk: 'part_no',
    columns: ['part_no', 'description', 'logic', 'category'],
  },
  defect_descp: {
    pk: 'defect_type',
    columns: ['defect_type', 'description'],
  },
};

function getTable(tableName) {
  const t = TABLES[tableName];
  if (!t) throw new Error(`Unknown table: ${tableName}`);
  return t;
}

async function getAll(tableName, filters = {}) {
  const { pk } = getTable(tableName);
  let sql = `SELECT * FROM ${tableName}`;
  const values = [];
  const keys = Object.keys(filters).filter((k) => filters[k] !== undefined && filters[k] !== null);
  if (keys.length) {
    sql += ' WHERE ' + keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ');
    values.push(...keys.map((k) => filters[k]));
  }
  sql += ` ORDER BY ${pk}`;
  const result = await pool.query(sql, values);
  return result.rows;
}

/**
 * Rows from `repair_jobs` in business order (`job_id`), optional cap for reporting/tests.
 * Column set matches `TABLES.repair_jobs` (source of truth for the repair pipeline).
 */
async function getRepairJobsOrdered(limit = null) {
  const n = limit != null ? Number(limit) : null;
  if (n != null && Number.isFinite(n) && n > 0) {
    const result = await pool.query(
      'SELECT * FROM repair_jobs ORDER BY job_id ASC LIMIT $1',
      [n]
    );
    return result.rows;
  }
  const result = await pool.query('SELECT * FROM repair_jobs ORDER BY job_id ASC');
  return result.rows;
}

/** Business key `job_id` (unique). Accepts string or number from URL / forms. */
async function getRepairJobByJobId(jobId) {
  const id = String(jobId ?? '').trim();
  if (!id) return null;
  const result = await pool.query(
    'SELECT * FROM repair_jobs WHERE job_id = $1 LIMIT 1',
    [id]
  );
  return result.rows[0] ?? null;
}

async function getById(tableName, id) {
  const { pk } = getTable(tableName);
  const result = await pool.query(
    `SELECT * FROM ${tableName} WHERE ${pk} = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

async function create(tableName, row) {
  const { columns } = getTable(tableName);
  const cols = columns.filter((c) => row[c] !== undefined);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`;
  const result = await pool.query(sql, cols.map((c) => row[c]));
  return result.rows[0];
}

async function update(tableName, id, row) {
  const { pk, columns } = getTable(tableName);
  const cols = columns.filter((c) => row[c] !== undefined);
  if (cols.length === 0) return getById(tableName, id);
  const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const values = [...cols.map((c) => row[c]), id];
  const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${pk} = $${values.length} RETURNING *`;
  const result = await pool.query(sql, values);
  return result.rows[0] ?? null;
}

async function remove(tableName, id) {
  const { pk } = getTable(tableName);
  const result = await pool.query(
    `DELETE FROM ${tableName} WHERE ${pk} = $1 RETURNING ${pk}`,
    [id]
  );
  return result.rowCount > 0;
}

module.exports = {
  pool,
  TABLES,
  getAll,
  getRepairJobsOrdered,
  getRepairJobByJobId,
  getById,
  create,
  update,
  remove,
};
