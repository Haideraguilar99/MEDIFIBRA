import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { computeAutoClassification } from "@/lib/classification"
export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const clients = await db.execute(`
      SELECT
        c.id,
        c.classification,
        c.dia_pago,
        MAX(CASE WHEN p.status = 'paid' THEN p.created_at END) as last_payment_date
      FROM clients c
      LEFT JOIN payments p ON p.client_id = c.id
      GROUP BY c.id
    `)

    let updated = 0
    const changes: Array<{ id: number; from: string; to: string }> = []

    for (const row of clients.rows) {
      const current     = String(row.classification ?? "AL_DIA")
      const diaPago     = String(row.dia_pago       ?? "")
      const lastPayment = row.last_payment_date ? String(row.last_payment_date) : null
      const computed    = computeAutoClassification(current, diaPago, lastPayment)

      if (computed !== current) {
        await db.execute({
          sql:  "UPDATE clients SET classification = ? WHERE id = ?",
          args: [computed, row.id],
        })
        changes.push({ id: Number(row.id), from: current, to: computed })
        updated++
      }
    }

    return NextResponse.json({ ok: true, updated, changes })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
