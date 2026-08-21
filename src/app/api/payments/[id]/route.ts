import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  await db.execute({
    sql: `UPDATE payments SET client_id=?, amount=?, period=?, method=?, status=?, notes=? WHERE id=?`,
    args: [body.client_id, body.amount, body.period, body.method, body.status, body.notes, id]
  })

  // ── Actualizar clasificación del cliente según nuevo estado del pago ──
  if (body.status === 'paid') {
    await db.execute({
      sql: `UPDATE clients SET classification = 'AL DÍA', status = 'active' WHERE id = ?`,
      args: [body.client_id]
    })
  } else if (body.status === 'pending') {
    await db.execute({
      sql: `UPDATE clients SET classification = 'PRÓXIMO A PAGAR'
            WHERE id = ? AND classification NOT IN (
              'DEBE MUCHO – RECOGER EQUIPO','DEUDA PENDIENTE',
              'NO PAGA – AUTORIZADO','SUSPENDIDO','USUARIO PERDIDO'
            )`,
      args: [body.client_id]
    })
  }

  const updated = await db.execute({
    sql: `SELECT p.*, c.name as client_name, c.plan, c.cellphone
          FROM payments p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id=?`,
    args: [id]
  })
  const updatedClient = await db.execute({
    sql: `SELECT * FROM clients WHERE id=?`,
    args: [body.client_id]
  })

  broadcast('update-payment', updated.rows[0])
  broadcast('update-client', updatedClient.rows[0])
  return NextResponse.json({ payment: updated.rows[0] })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.execute({ sql: 'DELETE FROM payments WHERE id=?', args: [id] })
  broadcast('delete-payment', { id })
  return NextResponse.json({ success: true })
}
