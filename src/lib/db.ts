import { createClient } from '@libsql/client'

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

export const db = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    return getDb()[prop as keyof ReturnType<typeof createClient>]
  }
})

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
  ], 'write')
}
