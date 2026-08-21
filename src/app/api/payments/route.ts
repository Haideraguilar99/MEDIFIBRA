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
    const payStatus = body.status ?? 'paid'
    const result = await db.execute({
      sql: `INSERT INTO payments (client_id, amount, period, method, status, notes)
            VALUES (?,?,?,?,?,?)`,
      args: [body.client_id, body.amount, body.period, body.method ?? 'efectivo', payStatus, body.notes ?? '']
    })
    const rowId = result.lastInsertRowid?.toString() ?? '0'

    // ── Actualizar clasificación del cliente según estado del pago ──
    if (payStatus === 'paid') {
      await db.execute({
        sql: `UPDATE clients SET classification = 'AL DÍA', status = 'active' WHERE id = ?`,
        args: [body.client_id]
      })
    } else if (payStatus === 'pending') {
      // Solo actualizar si no tiene una clasificación más grave
      await db.execute({
        sql: `UPDATE clients SET classification = 'PRÓXIMO A PAGAR'
              WHERE id = ? AND classification NOT IN (
                'DEBE MUCHO – RECOGER EQUIPO','DEUDA PENDIENTE',
                'NO PAGA – AUTORIZADO','SUSPENDIDO','USUARIO PERDIDO'
              )`,
        args: [body.client_id]
      })
    }

    const newPayment = await db.execute({
      sql: `SELECT p.*, c.name as client_name, c.plan, c.cellphone
            FROM payments p LEFT JOIN clients c ON p.client_id = c.id
            WHERE p.id=?`,
      args: [rowId]
    })

    // Emitir también actualización del cliente para refrescar el dashboard
    const updatedClient = await db.execute({
      sql: `SELECT * FROM clients WHERE id=?`,
      args: [body.client_id]
    })
    broadcast('new-payment', newPayment.rows[0])
    broadcast('update-client', updatedClient.rows[0])

    return NextResponse.json({ payment: newPayment.rows[0] }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
