import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const byMonth = await db.execute(`
      SELECT
        substr(created_at, 1, 7) as month,
        SUM(amount) as total,
        COUNT(*) as count
      FROM payments
      WHERE status = 'paid'
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12`)

    const byMethod = await db.execute(`
      SELECT method, COUNT(*) as count, SUM(amount) as total
      FROM payments
      WHERE status = 'paid'
      GROUP BY method
      ORDER BY total DESC`)

    const byPlan = await db.execute(`
      SELECT plan, COUNT(*) as count, SUM(plan_value) as potential
      FROM clients
      WHERE status = 'active'
      GROUP BY plan
      ORDER BY count DESC`)

    const pendingClients = await db.execute(`
      SELECT c.id, c.name, c.cellphone, c.plan, c.plan_value, c.payment_date
      FROM clients c
      WHERE c.status = 'active'
        AND c.id NOT IN (
          SELECT DISTINCT client_id FROM payments
          WHERE period = substr(datetime('now'), 1, 7)
            AND status = 'paid')
      ORDER BY c.payment_date ASC
      LIMIT 20`)

    return NextResponse.json({
      byMonth: byMonth.rows.reverse(),
      byMethod: byMethod.rows,
      byPlan: byPlan.rows,
      pendingClients: pendingClients.rows,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
