import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const today = new Date()
    const clientsFound: Record<string, unknown>[] = []
    const seenIds = new Set<number>()

    for (let days = 0; days <= 5; days++) {
      const target = new Date(today)
      target.setDate(today.getDate() + days)
      const targetDay = String(target.getDate())

      const result = await db.execute({
        sql: `SELECT id, name, cellphone, phone, plan, plan_value,
                     dia_pago, neighborhood, address, status, classification
              FROM clients
              WHERE dia_pago = ? AND status = 'active'
              ORDER BY name ASC`,
        args: [targetDay],
      })

      for (const row of result.rows) {
        const clientId = Number(row.id)
        if (!seenIds.has(clientId)) {
          seenIds.add(clientId)
          clientsFound.push({ ...row, daysUntilPayment: days, paymentDay: Number(targetDay) })
        }
      }
    }

    clientsFound.sort((a, b) => Number(a.daysUntilPayment) - Number(b.daysUntilPayment))

    return NextResponse.json({
      clients: clientsFound,
      total: clientsFound.length,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[upcoming-payments] Error:', error)
    return NextResponse.json(
      { error: 'Error al consultar los pagos próximos', detail: String(error) },
      { status: 500 }
    )
  }
}
