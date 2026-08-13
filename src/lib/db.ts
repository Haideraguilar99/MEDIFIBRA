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
    // ── Tablas existentes ──────────────────────────────────────────
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

    // ── Tablas nuevas ──────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')))`,

    `CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      speed_mbps INTEGER NOT NULL,
      price INTEGER NOT NULL,
      color TEXT DEFAULT '#3b82f6',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')))`,

    `CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      period TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      due_date TEXT NOT NULL,
      paid_at TEXT,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS technicians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      zone TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')))`,

    `CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      technician_id INTEGER,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'technical',
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'medium',
      resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (technician_id) REFERENCES technicians(id))`,

    `CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      type TEXT NOT NULL,
      brand TEXT DEFAULT '',
      model TEXT DEFAULT '',
      serial TEXT DEFAULT '',
      status TEXT DEFAULT 'assigned',
      assigned_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id))`,

    `CREATE TABLE IF NOT EXISTS streaming_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      platform TEXT NOT NULL,
      username TEXT DEFAULT '',
      password TEXT DEFAULT '',
      expires_at TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id))`,

    `CREATE TABLE IF NOT EXISTS notifications_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      channel TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'sent',
      sent_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id))`,
  ], 'write')
}
