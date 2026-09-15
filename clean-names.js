const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const raw = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
let DB_URL = '', DB_TOKEN = '';
for (const line of raw.split('\n')) {
  const m = line.match(/^(TURSO_DATABASE_URL|TURSO_AUTH_TOKEN)=(.*)$/);
  if (m) {
    const val = m[2].trim().replace(/^["']|["']$/g, '');
    if (m[1] === 'TURSO_DATABASE_URL') DB_URL = val;
    else DB_TOKEN = val;
  }
}
const db = createClient({ url: DB_URL, authToken: DB_TOKEN });

async function run() {
  const res = await db.execute("SELECT id, name, punto_referencia FROM clients WHERE name LIKE '%(%)%'");
  const rows = res.rows;
  console.log('Clientes a limpiar: ' + rows.length);
  let updated = 0, skipped = 0;
  for (const row of rows) {
    const id     = Number(row[0] ?? row.id);
    const name   = String(row[1] ?? row.name ?? '');
    const curRef = String(row[2] ?? row.punto_referencia ?? '');
    const match  = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (!match) { console.log('[SKIP] ' + id + ': ' + name.slice(0,50)); skipped++; continue; }
    const cleanName = match[1].trim();
    const extracted = match[2].trim().replace(/^[,;\s]+/, '').trim();
    const alreadyIn = curRef && curRef.toLowerCase().includes(extracted.substring(0,8).toLowerCase());
    const newRef    = curRef ? (alreadyIn ? curRef : extracted + ' — ' + curRef) : extracted;
    await db.execute({ sql: 'UPDATE clients SET name = ?, punto_referencia = ? WHERE id = ?', args: [cleanName, newRef, id] });
    console.log('[OK ' + id + '] ' + name.slice(0,45) + ' => ' + cleanName);
    updated++;
  }
  console.log('\nActualizados: ' + updated + ' | Saltados: ' + skipped);
  process.exit(0);
}
run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
