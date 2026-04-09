require('dotenv').config({ path: '.env' });
const { pool } = require('../lib/db');

async function main() {
  const ok = await pool.query('SELECT 1 as ok');
  console.log('✓ Connection OK\n');

  const { rows } = await pool.query(`
    SELECT table_name, column_name, data_type, character_maximum_length, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);

  const byTable = rows.reduce((acc, r) => {
    if (!acc[r.table_name]) acc[r.table_name] = [];
    acc[r.table_name].push(r);
    return acc;
  }, {});

  for (const [table, cols] of Object.entries(byTable)) {
    console.log(`Table: ${table}`);
    console.log('-'.repeat(50));
    for (const c of cols) {
      const len = c.character_maximum_length ? `(${c.character_maximum_length})` : '';
      const nullStr = c.is_nullable === 'YES' ? ' NULL' : ' NOT NULL';
      const def = c.column_default ? ` DEFAULT ${c.column_default}` : '';
      console.log(`  ${c.column_name.padEnd(30)} ${c.data_type}${len}${nullStr}${def}`);
    }
    console.log('');
  }
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
