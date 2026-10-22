import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { computeClassification, isProtected } from '@/lib/classification'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const result = await db.execute(`
      SELECT
        c.id,
        c.classification,
        c.dia_pago,
        MAX(CASE WHEN p.status = 'paid' THEN p.created_at END) as last_payment_date
      FROM clients c
      LEFT JOIN payments p ON p.client_id = c.id
      GROUP BY c.id
    `)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let updated = 0
    const changes: Array<{ id: number; from: string; to: string; reason: string }> = []
    const skipped: Array<{ id: number; classification: string }> = []

    for (const row of result.rows) {
      const clientId    = Number(row.id)
      const current     = String(row.classification ?? 'AL_DIA')
      const diaPago     = row.dia_pago ? String(row.dia_pago) : null
      const lastPayment = row.last_payment_date ? String(row.last_payment_date) : null

      if (isProtected(current)) {
        skipped.push({ id: clientId, classification: current })
        continue
      }

      const { classification: newClass, reason } = computeClassification({
        currentClassification: current,
        diaPago,
        lastPaymentDate: lastPayment,
        today,
      })

      if (newClass === current) continue

      await db.execute({
        sql:  'UPDATE clients SET classification = ? WHERE id = ?',
        args: [newClass, clientId],
      })

      // Emitir actualización en tiempo real
      const updatedRow = await db.execute({
        sql:  'SELECT * FROM clients WHERE id = ?',
        args: [clientId],
      })
      if (updatedRow.rows[0]) broadcast('update-client', updatedRow.rows[0])

      changes.push({ id: clientId, from: current, to: newClass, reason })
      updated++
    }

    return NextResponse.json({
      ok: true,
      executed_at: new Date().toISOString(),
      total: result.rows.length,
      updated,
      skipped: skipped.length,
      changes,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
