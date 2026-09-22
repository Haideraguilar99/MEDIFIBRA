import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || ''
    if (!period) return NextResponse.json({ error: 'Falta period' }, { status: 400 })

    const result = await db.execute({
      sql: `SELECT
              c.id, c.name, c.cellphone, c.plan, c.plan_value,
              c.incluye_tv, c.dia_pago,
              CASE WHEN i.id IS NOT NULL THEN 1 ELSE 0 END as has_invoice
            FROM clients c
            LEFT JOIN invoices i
              ON i.client_id = c.id AND i.period = ?
            WHERE c.status = 'active'
              AND c.dia_pago != ''
              AND c.classification NOT IN ('RECOGER_EQUIPO','USUARIO_PERDIDO','SUSPENDIDO')
            ORDER BY
              CASE c.dia_pago
                WHEN '5'  THEN 1 WHEN '10' THEN 2 WHEN '12' THEN 3
                WHEN '15' THEN 4 WHEN '20' THEN 5 WHEN '25' THEN 6
                WHEN '30' THEN 7 ELSE 8 END,
              c.name ASC`,
      args: [period]
    })

    return NextResponse.json({ clients: result.rows })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
