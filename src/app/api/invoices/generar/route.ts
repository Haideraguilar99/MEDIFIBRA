import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { period, dia_pago } = await req.json()
    if (!period) return NextResponse.json({ error: 'Falta period (YYYY-MM)' }, { status: 400 })

    const [year, month] = period.split('-').map(Number)

    const whereClause = dia_pago
      ? `AND c.dia_pago = '${dia_pago}'`
      : `AND c.dia_pago != ''`

    const clients = await db.execute(`
      SELECT c.id, c.name, c.plan, c.plan_value, c.incluye_tv, c.dia_pago
      FROM clients c
      WHERE c.status = 'active'
        AND c.classification NOT IN ('RECOGER_EQUIPO','USUARIO_PERDIDO','SUSPENDIDO')
        ${whereClause}
    `)

    let created = 0
    let skipped = 0

    for (const c of clients.rows) {
      const existing = await db.execute({
        sql: `SELECT id FROM invoices WHERE client_id=? AND period=?`,
        args: [c.id, period]
      })
      if (existing.rows.length > 0) { skipped++; continue }

      const dia = parseInt(c.dia_pago as string) || 30
      const due = new Date(year, month - 1, dia)
      const due_date = due.toISOString().slice(0, 10)
      const now = new Date()
      const invoice_number = `MF-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-${String(c.id).padStart(4,'0')}`

      await db.execute({
        sql: `INSERT INTO invoices (client_id, period, amount, due_date, plan, plan_value, incluye_tv, invoice_number, method, notes, status, created_at)
              VALUES (?,?,?,?,?,?,?,?,'efectivo','',  'pending', datetime('now'))`,
        args: [c.id, period, c.plan_value, due_date, c.plan, c.plan_value, c.incluye_tv, invoice_number]
      })
      created++
    }

    return NextResponse.json({ ok: true, created, skipped, period })
  } catch (e) {
    return NextResponse.json({ error: 'Error al generar' }, { status: 500 })
  }
}
