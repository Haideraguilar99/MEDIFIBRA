import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { computeClassification } from '@/lib/classification'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()

    await db.execute({
      sql: `UPDATE payments SET client_id=?, amount=?, period=?, method=?, status=?, notes=? WHERE id=?`,
      args: [body.client_id, body.amount, body.period, body.method, body.status, body.notes, id],
    })

    // ── Recalcular clasificación con el motor central ─────────────────────
    const clientRow = await db.execute({
      sql: 'SELECT classification, dia_pago FROM clients WHERE id = ?',
      args: [body.client_id],
    })

    if (clientRow.rows[0]) {
      const current = String(clientRow.rows[0].classification ?? '')
      const diaPago = clientRow.rows[0].dia_pago
        ? String(clientRow.rows[0].dia_pago)
        : null

      let lastPaymentDate: string | null = null
      if (body.status === 'paid') {
        lastPaymentDate = new Date().toISOString()
      } else {
        const lastPaid = await db.execute({
          sql: `SELECT MAX(created_at) as lp FROM payments
                WHERE client_id = ? AND status = 'paid' AND id != ?`,
          args: [body.client_id, id],
        })
        lastPaymentDate = lastPaid.rows[0]?.lp
          ? String(lastPaid.rows[0].lp)
          : null
      }

      const { classification: newClass } = computeClassification({
        currentClassification: current,
        diaPago,
        lastPaymentDate,
      })

      await db.execute({
        sql:  'UPDATE clients SET classification = ?, status = ? WHERE id = ?',
        args: [newClass, 'active', body.client_id],
      })
    }

    // ── Leer resultados finales y emitir SSE ──────────────────────────────
    const updated = await db.execute({
      sql: `SELECT p.*, c.name as client_name, c.plan, c.cellphone
            FROM payments p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = ?`,
      args: [id],
    })
    const updatedClient = await db.execute({
      sql:  'SELECT * FROM clients WHERE id = ?',
      args: [body.client_id],
    })

    broadcast('update-payment', updated.rows[0])
    broadcast('update-client',  updatedClient.rows[0])

    return NextResponse.json({ payment: updated.rows[0] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.execute({ sql: 'DELETE FROM payments WHERE id=?', args: [id] })
    broadcast('delete-payment', { id })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
