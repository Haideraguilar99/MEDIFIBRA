import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || ''
    const status = searchParams.get('status') || ''
    const client_id = searchParams.get('client_id') || ''

    let sql = `
      SELECT i.*, c.name as client_name, c.cellphone, c.address, c.neighborhood
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      WHERE 1=1
    `
    const args: string[] = []
    if (period)    { sql += ` AND i.period = ?`;    args.push(period) }
    if (status)    { sql += ` AND i.status = ?`;    args.push(status) }
    if (client_id) { sql += ` AND i.client_id = ?`; args.push(client_id) }
    sql += ` ORDER BY i.due_date ASC, c.name ASC`

    const result = await db.execute({ sql, args })
    const total  = result.rows.length
    const paid   = result.rows.filter(r => r.status === 'paid').length
    const pending = result.rows.filter(r => r.status === 'pending').length
    const totalAmount = result.rows.reduce((s, r) => s + (r.amount as number || 0), 0)
    const paidAmount  = result.rows.filter(r => r.status === 'paid').reduce((s, r) => s + (r.amount as number || 0), 0)

    return NextResponse.json({
      invoices: result.rows,
      stats: { total, paid, pending, totalAmount, paidAmount }
    })
  } catch {
    return NextResponse.json({ error: 'Error al cargar facturas' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { client_id, period, amount, due_date, plan, plan_value, incluye_tv, notes, method } = body
    if (!client_id || !period || !amount || !due_date)
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })

    const now = new Date()
    const invoice_number = `MF-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-${String(client_id).padStart(4,'0')}`

    const result = await db.execute({
      sql: `INSERT INTO invoices (client_id, period, amount, due_date, plan, plan_value, incluye_tv, invoice_number, method, notes, status, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,'pending',datetime('now'))`,
      args: [client_id, period, amount, due_date, plan||'', plan_value||amount, incluye_tv||0, invoice_number, method||'efectivo', notes||'']
    })
    return NextResponse.json({ ok: true, id: result.lastInsertRowid?.toString() })
  } catch {
    return NextResponse.json({ error: 'Error al crear factura' }, { status: 500 })
  }
}
