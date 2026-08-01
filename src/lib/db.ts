import { createClient } from '@libsql/client'

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export async function initDB() {
  await db.batch([
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
