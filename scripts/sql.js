require('dotenv').config({ path: '.env' });
const { pool } = require('../lib/db');

function getSql() {
  const fromArgv = process.argv.slice(2).join(' ').trim();
  if (fromArgv) return Promise.resolve(fromArgv);
  if (process.stdin.isTTY) {
    console.error('Usage: npm run db:sql -- "SELECT * FROM devices LIMIT 5"');
    console.error('  stdin: type SQL then pipe, e.g. Get-Content q.sql | node scripts/sql.js');
    process.exit(1);
  }
  return new Promise((resolve, reject) => {
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { buf += c; });
    process.stdin.on('end', () => resolve(buf.trim()));
    process.stdin.on('error', reject);
  });
}

async function main() {
  const sql = await getSql();
  if (!sql) {
    console.error('Empty SQL.');
    process.exit(1);
  }
  const result = await pool.query(sql);
  if (result.rows?.length) console.table(result.rows);
  if (result.rowCount != null) {
    console.log(`${result.command}: ${result.rowCount} row(s)`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
