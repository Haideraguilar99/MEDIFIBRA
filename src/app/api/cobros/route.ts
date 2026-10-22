import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
export const dynamic = 'force-dynamic'

// Devuelve clientes activos que están en PROXIMO_PAGAR o SUSPENDIDO_TEMP
// El motor de clasificación ya garantiza que estos estados son correctos.
export async function GET() {
  try {
    const result = await db.execute(`
      SELECT
        c.id, c.name, c.cellphone, c.plan, c.plan_value,
        c.classification, c.dia_pago, c.incluye_tv, c.puntos_tv,
        nl.sent_at as cobro_enviado_at
      FROM clients c
      LEFT JOIN (
        SELECT client_id, MAX(sent_at) as sent_at
        FROM notifications_log
        WHERE type = 'cobro_enviado'
          AND sent_at >= datetime('now', '-12 hours')
        GROUP BY client_id
      ) nl ON nl.client_id = c.id
      WHERE c.status = 'active'
        AND c.dia_pago != ''
        AND c.classification IN ('PROXIMO_PAGAR', 'SUSPENDIDO_TEMP')
      ORDER BY
        CAST(c.dia_pago AS INTEGER) ASC,
        CASE c.classification
          WHEN 'SUSPENDIDO_TEMP' THEN 1
          WHEN 'PROXIMO_PAGAR'   THEN 2
          ELSE 3 END,
        c.name ASC
    `)
    return NextResponse.json({ clients: result.rows })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
