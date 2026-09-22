import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const result = await db.execute(`
      SELECT
        c.id, c.name, c.cellphone, c.plan, c.plan_value,
        c.classification, c.dia_pago, c.incluye_tv,
        nl.sent_at as cobro_enviado_at
      FROM clients c
      LEFT JOIN (
        SELECT client_id, MAX(sent_at) as sent_at
        FROM notifications_log
        WHERE type = 'cobro_enviado'
          AND sent_at >= datetime('now', '-2 hours')
        GROUP BY client_id
      ) nl ON nl.client_id = c.id
      WHERE c.status = 'active'
        AND c.dia_pago != ''
        AND c.classification != 'AL_DIA'
      ORDER BY
        CASE c.dia_pago
          WHEN '5'  THEN 1 WHEN '10' THEN 2 WHEN '12' THEN 3
          WHEN '15' THEN 4 WHEN '20' THEN 5 WHEN '25' THEN 6
          WHEN '30' THEN 7 ELSE 8 END,
        c.name ASC
    `)
    return NextResponse.json({ clients: result.rows })
  } catch {
    return NextResponse.json({ error: 'Error al cargar cobros' }, { status: 500 })
  }
}
