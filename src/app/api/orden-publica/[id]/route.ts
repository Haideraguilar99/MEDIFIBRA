import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getDb()
    const result = await db.execute({
      sql: `SELECT
              wo.id, wo.order_number, wo.task_type, wo.task_description,
              wo.priority, wo.scheduled_date, wo.scheduled_time,
              wo.status, wo.notes, wo.created_at,
              t.name         AS technician_name,
              t.role         AS technician_role,
              t.phone        AS technician_phone,
              c.name         AS client_name,
              c.address      AS client_address,
              c.neighborhood AS client_neighborhood,
              c.plan         AS client_plan,
              c.punto_referencia AS client_punto_referencia
            FROM work_orders wo
            LEFT JOIN technicians t ON wo.technician_id = t.id
            LEFT JOIN clients     c ON wo.client_id     = c.id
            WHERE wo.id = ?`,
      args: [id]
    })
    if (!result.rows.length)
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    return NextResponse.json({ order: result.rows[0] })
  } catch (e) {
    console.error('[GET /api/orden-publica]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
