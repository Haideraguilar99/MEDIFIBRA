import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyTechToken, getTechTokenFromRequest } from '@/lib/tecnico-auth'

export async function GET(req: Request) {
  const token = getTechTokenFromRequest(req)
  const tech = token ? await verifyTechToken(token) : null
  if (!tech) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const db = getDb()
    const result = await db.execute({
      sql: `SELECT wo.*,
              c.name        as client_name,
              c.cellphone   as client_cellphone,
              c.address     as client_address,
              c.neighborhood as client_neighborhood
            FROM work_orders wo
            LEFT JOIN clients c ON wo.client_id = c.id
            WHERE wo.technician_id = ?
            ORDER BY
              CASE wo.status
                WHEN 'in_progress' THEN 1
                WHEN 'pending'     THEN 2
                WHEN 'completed'   THEN 3
                ELSE 4
              END,
              wo.scheduled_date ASC
            LIMIT 100`,
      args: [tech.techId]
    })
    return NextResponse.json({ orders: result.rows })
  } catch (e) {
    console.error('[ordenes]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
