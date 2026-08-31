import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyTechToken, getTechTokenFromRequest } from '@/lib/tecnico-auth'

export async function GET(req: Request) {
  const token = getTechTokenFromRequest(req)
  const tech = token ? await verifyTechToken(token) : null
  if (!tech) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const db = getDb()
    const [totals, ratings, recent] = await Promise.all([
      db.execute({
        sql: `SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed'   THEN 1 ELSE 0 END) as completadas,
                SUM(CASE WHEN status = 'pending'     THEN 1 ELSE 0 END) as pendientes,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                AVG(CASE WHEN duration_minutes > 0 THEN duration_minutes END) as avg_duracion
              FROM work_orders WHERE technician_id = ?`,
        args: [tech.techId]
      }),
      db.execute({
        sql: `SELECT AVG(stars) as promedio, COUNT(*) as total_ratings
              FROM client_ratings WHERE technician_id = ?`,
        args: [tech.techId]
      }),
      db.execute({
        sql: `SELECT wo.id, wo.task_type, wo.status, wo.completed_at, wo.tech_rating,
                c.name as client_name
              FROM work_orders wo
              LEFT JOIN clients c ON wo.client_id = c.id
              WHERE wo.technician_id = ? AND wo.status = 'completed'
              ORDER BY wo.completed_at DESC LIMIT 5`,
        args: [tech.techId]
      })
    ])

    return NextResponse.json({
      stats: { ...totals.rows[0], ...ratings.rows[0] },
      recent: recent.rows
    })
  } catch (e) {
    console.error('[stats]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
