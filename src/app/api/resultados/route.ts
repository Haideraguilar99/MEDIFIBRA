import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const db = getDb()

    const ordersRes = await db.execute({
      sql: `SELECT
              wo.id, wo.order_number, wo.task_type, wo.priority,
              wo.scheduled_date, wo.started_at, wo.completed_at,
              wo.duration_minutes, wo.completion_notes,
              wo.gps_lat, wo.gps_lng, wo.gps_address,
              wo.followup_required, wo.followup_notes, wo.followup_date,
              wo.tech_rating, wo.rating_comment,
              t.name        as technician_name,
              t.cellphone   as technician_phone,
              c.name        as client_name,
              c.address     as client_address,
              c.neighborhood as client_neighborhood,
              c.plan        as client_plan,
              c.cellphone   as client_cellphone
            FROM work_orders wo
            LEFT JOIN technicians t ON wo.technician_id = t.id
            LEFT JOIN clients     c ON wo.client_id     = c.id
            WHERE wo.status = 'completed'
            ORDER BY wo.completed_at DESC
            LIMIT 200`,
      args: []
    })

    if (ordersRes.rows.length === 0) {
      return NextResponse.json({ orders: [] })
    }

    const ids = ordersRes.rows.map(r => r.id as number)
    const ph  = ids.map(() => '?').join(',')

    const [photosRes, equipRes, ratingsRes] = await Promise.all([
      db.execute({
        sql: `SELECT id, work_order_id, phase, photo_url, caption
              FROM service_evidence WHERE work_order_id IN (${ph})
              ORDER BY created_at ASC`,
        args: ids
      }),
      db.execute({
        sql: `SELECT id, work_order_id, action, equipment_type,
                     brand, model, serial, condition
              FROM equipment_records WHERE work_order_id IN (${ph})
              ORDER BY created_at ASC`,
        args: ids
      }),
      db.execute({
        sql: `SELECT work_order_id, stars, comment
              FROM client_ratings WHERE work_order_id IN (${ph})`,
        args: ids
      })
    ])

    type AnyRow = Record<string, unknown>
    const photosByOrder: Record<number, AnyRow[]>  = {}
    const equipByOrder:  Record<number, AnyRow[]>  = {}
    const ratingByOrder: Record<number, AnyRow>    = {}

    photosRes.rows.forEach(p => {
      const oid = p.work_order_id as number
      if (!photosByOrder[oid]) photosByOrder[oid] = []
      photosByOrder[oid].push(p as AnyRow)
    })
    equipRes.rows.forEach(e => {
      const oid = e.work_order_id as number
      if (!equipByOrder[oid]) equipByOrder[oid] = []
      equipByOrder[oid].push(e as AnyRow)
    })
    ratingsRes.rows.forEach(r => {
      ratingByOrder[r.work_order_id as number] = r as AnyRow
    })

    const orders = ordersRes.rows.map(o => ({
      ...o,
      photos:    photosByOrder[o.id as number]  ?? [],
      equipment: equipByOrder[o.id as number]   ?? [],
      rating:    ratingByOrder[o.id as number]  ?? null,
    }))

    return NextResponse.json({ orders })
  } catch (e) {
    console.error('[resultados]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
