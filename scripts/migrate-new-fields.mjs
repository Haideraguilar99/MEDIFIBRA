import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local')
try {
  readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=')
    if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '')
  })
} catch {}

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })

const NEW_COLUMNS = [
  `ALTER TABLE clients ADD COLUMN cedula TEXT DEFAULT ''`,
  `ALTER TABLE clients ADD COLUMN punto_referencia TEXT DEFAULT ''`,
  `ALTER TABLE clients ADD COLUMN foto_fachada TEXT DEFAULT ''`,
  `ALTER TABLE clients ADD COLUMN telefono_alternativo TEXT DEFAULT ''`,
  `ALTER TABLE clients ADD COLUMN fecha_instalacion TEXT DEFAULT ''`,
  `ALTER TABLE clients ADD COLUMN incluye_tv INTEGER DEFAULT 0`,
  `ALTER TABLE clients ADD COLUMN dia_pago TEXT DEFAULT '30'`,
  `ALTER TABLE clients ADD COLUMN referido_nombre TEXT DEFAULT ''`,
  `ALTER TABLE clients ADD COLUMN referido_telefono TEXT DEFAULT ''`,
]

console.log('🔧 Agregando nuevas columnas...')
for (const sql of NEW_COLUMNS) {
  const col = sql.match(/ADD COLUMN (\w+)/)?.[1]
  try {
    await db.execute(sql)
    console.log(`  ✅ ${col}`)
  } catch (e) {
    if (String(e).includes('duplicate') || String(e).includes('already exists')) {
      console.log(`  ℹ️  ${col} ya existe`)
    } else {
      console.error(`  ❌ ${col}:`, e.message)
    }
  }
}

const info = await db.execute(`PRAGMA table_info(clients)`)
console.log(`\n📋 Tabla clients — ${info.rows.length} columnas totales:`)
info.rows.forEach(r => console.log(`   ${String(r.name).padEnd(25)} ${r.type}`))
process.exit(0)
