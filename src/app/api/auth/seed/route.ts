import { db, initDB } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

const PLANS_SEED = [
  { name: 'FIBRA 50 MBPS',  speed_mbps: 50,  price: 55000,  color: '#1d4ed8' },
  { name: 'FIBRA 100 MBPS', speed_mbps: 100, price: 80000,  color: '#0891b2' },
  { name: 'FIBRA 150 MBPS', speed_mbps: 150, price: 95000,  color: '#16a34a' },
  { name: 'FIBRA 200 MBPS', speed_mbps: 200, price: 105000, color: '#d97706' },
  { name: 'FIBRA 300 MBPS', speed_mbps: 300, price: 125000, color: '#7c3aed' },
  { name: 'FIBRA 500 MBPS', speed_mbps: 500, price: 130000, color: '#0f172a' },
]

export async function GET() {
  try {
    await initDB()

    // ── Usuario admin ──────────────────────────────────────────────
    const existingUsers = await db.execute('SELECT COUNT(*) as count FROM users')
    let userMsg = 'Usuario admin ya existe'
    if (Number(existingUsers.rows[0].count) === 0) {
      await db.execute({
        sql: 'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        args: ['admin', hashPassword('admin123'), 'admin']
      })
      userMsg = 'Usuario admin creado (pass: admin123) — CAMBIA LA CONTRASEÑA'
    }

    // ── Planes ─────────────────────────────────────────────────────
    const existingPlans = await db.execute('SELECT COUNT(*) as count FROM plans')
    let plansMsg = 'Planes ya existen'
    if (Number(existingPlans.rows[0].count) === 0) {
      for (const p of PLANS_SEED) {
        await db.execute({
          sql: 'INSERT INTO plans (name, speed_mbps, price, color) VALUES (?, ?, ?, ?)',
          args: [p.name, p.speed_mbps, p.price, p.color]
        })
      }
      plansMsg = `${PLANS_SEED.length} planes insertados`
    }

    return NextResponse.json({ ok: true, user: userMsg, plans: plansMsg })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
