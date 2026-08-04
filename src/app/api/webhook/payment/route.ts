import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Verificar token
    const auth = req.headers.get('authorization')
    const secret = process.env.N8N_WEBHOOK_SECRET
    if (!auth || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { client_ref, client_name, amount, method, period, notes } = body

    // Buscar cliente por referencia, celular o nombre
    let clientRow = null

    if (client_ref) {
      const r = await db.execute({ sql: 'SELECT * FROM clients WHERE reference=? OR cellphone=? LIMIT 1', args: [client_ref, client_ref] })
      clientRow = r.rows[0] ?? null
    }

    if (!clientRow && client_name) {
      const r = await db.execute({ sql: "SELECT * FROM clients WHERE name LIKE ? AND status='active' LIMIT 1", args: [`%${client_name}%`] })
      clientRow = r.rows[0] ?? null
    }

    if (!clientRow) {
      return NextResponse.json({ error: 'Cliente no encontrado', hint: 'Verifica referencia o celular' }, { status: 404 })
    }

    const finalAmount = amount ?? clientRow.plan_value
    const finalPeriod = period ?? new Date().toISOString().slice(0, 7)
    const finalMethod = method ?? 'whatsapp'

    // Registrar pago
    const result = await db.execute({
      sql: `INSERT INTO payments (client_id, amount, period, method, status, notes) VALUES (?,?,?,?,?,?)`,
      args: [clientRow.id, finalAmount, finalPeriod, finalMethod, 'paid', notes ?? 'Registrado via WhatsApp']
    })

    const rowId = result.lastInsertRowid?.toString() ?? '0'
    const newPayment = await db.execute({
      sql: `SELECT p.*, c.name as client_name, c.plan, c.cellphone
            FROM payments p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id=?`,
      args: [rowId]
    })

    // Broadcast SSE — dashboard se actualiza en tiempo real
    broadcast('new-payment', newPayment.rows[0])

    return NextResponse.json({
      ok: true,
      payment: newPayment.rows[0],
      message: `Pago de ${clientRow.name} registrado correctamente`
    }, { status: 201 })

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
