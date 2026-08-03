import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await db.execute(`
      SELECT p.*, c.name as client_name, c.plan, c.cellphone
      FROM payments p
      LEFT JOIN clients c ON p.client_id = c.id
      ORDER BY p.created_at DESC`)
    const stats = await db.execute(`
      SELECT
        COUNT(*) as total,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status='pending' THEN amount ELSE 0 END) as pending_amount
      FROM payments`)
    return NextResponse.json({ payments: result.rows, stats: stats.rows[0] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.client_id || !body.amount || !body.period) {
      return NextResponse.json({ error: 'client_id, amount y period son requeridos' }, { status: 400 })
    }
    const result = await db.execute({
      sql: `INSERT INTO payments (client_id, amount, period, method, status, notes)
            VALUES (?,?,?,?,?,?)`,
      args: [body.client_id, body.amount, body.period, body.method ?? 'efectivo', body.status ?? 'paid', body.notes ?? '']
    })
    const rowId = result.lastInsertRowid?.toString() ?? '0'
    const newPayment = await db.execute({
      sql: `SELECT p.*, c.name as client_name, c.plan, c.cellphone
            FROM payments p LEFT JOIN clients c ON p.client_id = c.id
            WHERE p.id=?`,
      args: [rowId]
    })
    broadcast('new-payment', newPayment.rows[0])
    return NextResponse.json({ payment: newPayment.rows[0] }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
