import { createClient, InStatement } from '@libsql/client'

let _db: ReturnType<typeof createClient> | null = null

export function getDb() {
  if (!_db) {
    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN
    if (!url) throw new Error('TURSO_DATABASE_URL is not set')
    _db = createClient({ url, authToken })
  }
  return _db
}

export const db = {
  execute: (stmt: InStatement) => getDb().execute(stmt),
  batch: (stmts: InStatement[], mode?: 'write' | 'read' | 'deferred') => getDb().batch(stmts, mode),
}

export async function initDB() {
  const client = getDb()
  await client.batch([
    `CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, email TEXT, phone TEXT, cellphone TEXT NOT NULL,
      address TEXT, city TEXT, neighborhood TEXT, commune TEXT,
      consumption_date TEXT, payment_date TEXT, plan TEXT NOT NULL,
      plan_value INTEGER NOT NULL, reference TEXT, status TEXT DEFAULT 'active',
      notes TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      period TEXT NOT NULL,
      method TEXT DEFAULT 'efectivo',
      status TEXT DEFAULT 'paid',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE)`,
  ], 'write')
}
