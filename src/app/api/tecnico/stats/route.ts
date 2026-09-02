import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyTechToken, getTechTokenFromRequest } from '@/lib/tecnico-auth'

export async function GET(req: Request) {
  const token = getTechTokenFromRequest(req)
  const tech  = token ? await verifyTechToken(token) : null
  if (!tech) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const db = getDb()

    // Totals — columnas base que siempre existen
    const totals = await db.execute({
      sql: `SELECT
              COUNT(*) as total,
              SUM(CASE WHEN status = 'completed'   THEN 1 ELSE 0 END) as completadas,
              SUM(CASE WHEN status = 'pending'     THEN 1 ELSE 0 END) as pendientes,
              SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress
            FROM work_orders WHERE technician_id = ?`,
      args: [tech.techId]
    })

    // Duracion promedio — columna opcional
    let avgDuracion: number | null = null
    try {
      const dur = await db.execute({
        sql: `SELECT AVG(CASE WHEN duration_minutes > 0 THEN duration_minutes END) as avg_duracion
              FROM work_orders WHERE technician_id = ?`,
        args: [tech.techId]
      })
      avgDuracion = (dur.rows[0]?.avg_duracion as number) ?? null
    } catch { /* duration_minutes puede no existir aun */ }

    // Calificaciones — tabla opcional
    let promedio: number | null = null
    let totalRatings = 0
    try {
      const ratings = await db.execute({
        sql: `SELECT AVG(CAST(stars AS REAL)) as promedio, COUNT(*) as total_ratings
              FROM client_ratings WHERE technician_id = ?`,
        args: [tech.techId]
      })
      const row = ratings.rows[0]
      promedio     = row?.promedio != null ? Number(row.promedio) : null
      totalRatings = Number(row?.total_ratings ?? 0)
    } catch { /* tabla client_ratings puede no existir aun */ }

    // Ultimas ordenes completadas
    let recent: unknown[] = []
    try {
      const recentRes = await db.execute({
        sql: `SELECT wo.id, wo.task_type, wo.status,
                c.name as client_name
              FROM work_orders wo
              LEFT JOIN clients c ON wo.client_id = c.id
              WHERE wo.technician_id = ? AND wo.status = 'completed'
              ORDER BY wo.created_at DESC LIMIT 5`,
        args: [tech.techId]
      })
      recent = recentRes.rows
    } catch { /* fallback */ }

    return NextResponse.json({
      stats: {
        total:        Number(totals.rows[0]?.total        ?? 0),
        completadas:  Number(totals.rows[0]?.completadas  ?? 0),
        pendientes:   Number(totals.rows[0]?.pendientes   ?? 0),
        in_progress:  Number(totals.rows[0]?.in_progress  ?? 0),
        promedio,
        total_ratings: totalRatings,
        avg_duracion:  avgDuracion,
      },
      recent
    })
  } catch (e) {
    console.error('[stats]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
