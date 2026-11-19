import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Validar Content-Type
    const ct = req.headers.get('content-type')
    if (!ct?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type debe ser application/json' }, { status: 415 })
    }

    // Validar que N8N_WEBHOOK_SECRET esté configurado en el entorno
    if (!process.env.N8N_WEBHOOK_SECRET) {
      console.error('[webhook/payment] N8N_WEBHOOK_SECRET no configurado en variables de entorno')
      return NextResponse.json({ error: 'Webhook no configurado en servidor' }, { status: 503 })
    }

    // Verificar token de autorización
    const auth = req.headers.get('authorization')
    if (!auth || auth !== `Bearer ${process.env.N8N_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { client_ref, client_name, amount, method, period, notes } = body

    // Validaciones básicas de entrada
    if (!client_ref && !client_name) {
      return NextResponse.json({ error: 'Se requiere client_ref o client_name' }, { status: 400 })
    }

    // Buscar cliente por referencia, celular o nombre
    let clientRow = null

    if (client_ref) {
      const r = await db.execute({
        sql: 'SELECT * FROM clients WHERE reference=? OR cellphone=? LIMIT 1',
        args: [client_ref, client_ref]
      })
      clientRow = r.rows[0] ?? null
    }

    if (!clientRow && client_name) {
      const r = await db.execute({
        sql: "SELECT * FROM clients WHERE name LIKE ? AND status='active' LIMIT 1",
        args: [`%${client_name}%`]
      })
      clientRow = r.rows[0] ?? null
    }

    if (!clientRow) {
      return NextResponse.json(
        { error: 'Cliente no encontrado', hint: 'Verifica referencia o celular' },
        { status: 404 }
      )
    }

    // Validar amount
    const finalAmount = amount ?? clientRow.plan_value
    if (!finalAmount || Number(finalAmount) <= 0) {
      return NextResponse.json({ error: 'Monto de pago inválido' }, { status: 400 })
    }

    const finalPeriod = period ?? new Date().toISOString().slice(0, 7)
    const finalMethod = method ?? 'whatsapp'

    // Registrar pago y actualizar clasificación a AL_DIA directamente
    const result = await db.execute({
      sql: `INSERT INTO payments (client_id, amount, period, method, status, notes) VALUES (?,?,?,?,?,?)`,
      args: [clientRow.id, finalAmount, finalPeriod, finalMethod, 'paid', notes ?? 'Registrado via WhatsApp']
    })

    const rowId = result.lastInsertRowid?.toString() ?? '0'

    // Actualizar clasificación a AL_DIA — igual que payments/route.ts POST paid
    await db.execute({
      sql: `UPDATE clients SET classification='AL_DIA', updated_at=datetime('now') WHERE id=?`,
      args: [clientRow.id]
    })

    const newPayment = await db.execute({
      sql: `SELECT p.*, c.name as client_name, c.plan, c.cellphone
            FROM payments p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id=?`,
      args: [rowId]
    })

    return NextResponse.json({
      ok: true,
      payment: newPayment.rows[0],
      message: `Pago de ${clientRow.name} registrado correctamente`
    }, { status: 201 })

  } catch (error) {
    console.error('[webhook/payment] Error interno:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
