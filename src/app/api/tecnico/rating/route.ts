import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyTechToken, getTechTokenFromRequest } from '@/lib/tecnico-auth'

export async function POST(req: Request) {
  const token = getTechTokenFromRequest(req)
  const tech = token ? await verifyTechToken(token) : null
  if (!tech) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { work_order_id, client_id, stars, comment } = await req.json()
    if (!work_order_id || !client_id || !stars) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }
    if (stars < 1 || stars > 5) return NextResponse.json({ error: 'Estrellas debe ser 1-5' }, { status: 400 })

    const db = getDb()

    // Verificar que la orden pertenece al técnico y está completada
    const order = await db.execute({
      sql: 'SELECT id FROM work_orders WHERE id = ? AND technician_id = ? AND status = ?',
      args: [work_order_id, tech.techId, 'completado']
    })
    if (order.rows.length === 0) return NextResponse.json({ error: 'Orden no válida para calificar' }, { status: 403 })

    // Verificar que no haya calificación previa
    const existing = await db.execute({
      sql: 'SELECT id FROM client_ratings WHERE work_order_id = ?',
      args: [work_order_id]
    })
    if (existing.rows.length > 0) return NextResponse.json({ error: 'Esta orden ya fue calificada' }, { status: 409 })

    const now = new Date().toISOString()
    await db.execute({
      sql: `INSERT INTO client_ratings (work_order_id, client_id, technician_id, stars, comment)
            VALUES (?, ?, ?, ?, ?)`,
      args: [work_order_id, client_id, tech.techId, stars, comment ?? '']
    })

    await db.execute({
      sql: 'UPDATE work_orders SET tech_rating = ?, rating_comment = ?, rated_at = ? WHERE id = ?',
      args: [stars, comment ?? '', now, work_order_id]
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
