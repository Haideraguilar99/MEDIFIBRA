import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { computeClassification, isProtected } from '@/lib/classification'
export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// MEDIFIBRA — Cron de auto-clasificación diaria v9.0
// Usa el motor central computeClassification — sin lógica duplicada.
// Ejecutar: GET /api/cron  con header Authorization: Bearer <CRON_SECRET>
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const db = getDb()

    const result = await db.execute(`
      SELECT
        c.id,
        c.classification,
        c.dia_pago,
        c.status,
        MAX(p.created_at) AS last_payment_date
      FROM clients c
      LEFT JOIN payments p ON p.client_id = c.id AND p.status = 'paid'
      WHERE c.status = 'active'
      GROUP BY c.id
    `)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const updates: Array<{ id: number; from: string; to: string; reason: string }> = []
    const skipped: Array<{ id: number; classification: string; reason: string }> = []
    const errors: string[] = []

    for (const row of result.rows) {
      const clientId     = Number(row.id)
      const current      = String(row.classification ?? '')
      const diaPago      = row.dia_pago ? String(row.dia_pago) : null
      const lastPayment  = row.last_payment_date ? String(row.last_payment_date) : null

      // Estados protegidos: nunca tocar desde el cron
      if (isProtected(current)) {
        skipped.push({ id: clientId, classification: current, reason: 'estado protegido' })
        continue
      }

      try {
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

        updates.push({ id: clientId, from: current, to: newClass, reason })
      } catch (clientErr) {
        errors.push(`cliente ${clientId}: ${String(clientErr)}`)
      }
    }

    const summary = {
      ok:            true,
      executed_at:   new Date().toISOString(),
      total_active:  result.rows.length,
      total_updated: updates.length,
      total_skipped: skipped.length,
      updates,
      errors,
    }

    console.log(`[cron] ${updates.length} actualizados, ${skipped.length} protegidos, ${errors.length} errores`)
    if (errors.length) console.error('[cron] errores:', errors)

    return NextResponse.json(summary)
  } catch (e) {
    console.error('[cron] error fatal:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
