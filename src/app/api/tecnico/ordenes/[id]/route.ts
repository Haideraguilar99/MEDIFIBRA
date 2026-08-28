import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyTechToken, getTechTokenFromRequest } from '@/lib/tecnico-auth'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const token = getTechTokenFromRequest(req)
  const tech = token ? await verifyTechToken(token) : null
  if (!tech) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = getDb()
  const result = await db.execute({
    sql: `SELECT wo.*,
            c.name as client_name, c.cellphone as client_cellphone,
            c.address as client_address, c.neighborhood as client_neighborhood,
            c.commune as client_commune, c.plan as client_plan,
            t.name as tech_name
          FROM work_orders wo
          LEFT JOIN clients c ON wo.client_id = c.id
          LEFT JOIN technicians t ON wo.technician_id = t.id
          WHERE wo.id = ? AND wo.technician_id = ?`,
    args: [params.id, tech.techId]
  })

  if (result.rows.length === 0) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
  return NextResponse.json({ order: result.rows[0] })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const token = getTechTokenFromRequest(req)
  const tech = token ? await verifyTechToken(token) : null
  if (!tech) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const db = getDb()

    // Verificar que la orden pertenece al técnico
    const check = await db.execute({
      sql: 'SELECT id, status FROM work_orders WHERE id = ? AND technician_id = ?',
      args: [params.id, tech.techId]
    })
    if (check.rows.length === 0) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const now = new Date().toISOString()
    const fields: string[] = []
    const args: (string | number | null)[] = []

    if (body.status) {
      fields.push('status = ?')
      args.push(body.status)
      if (body.status === 'en_progreso' && !body.started_at) {
        fields.push('started_at = ?')
        args.push(now)
      }
      if (body.status === 'completado') {
        fields.push('completed_at = ?')
        args.push(now)
        if (body.started_at || check.rows[0].started_at) {
          const start = new Date(body.started_at ?? check.rows[0].started_at as string)
          const mins = Math.round((Date.now() - start.getTime()) / 60000)
          fields.push('duration_minutes = ?')
          args.push(mins)
        }
      }
    }
    if (body.completion_notes !== undefined) { fields.push('completion_notes = ?'); args.push(body.completion_notes) }
    if (body.gps_lat !== undefined) { fields.push('gps_lat = ?'); args.push(body.gps_lat) }
    if (body.gps_lng !== undefined) { fields.push('gps_lng = ?'); args.push(body.gps_lng) }
    if (body.gps_address !== undefined) { fields.push('gps_address = ?'); args.push(body.gps_address) }
    if (body.followup_required !== undefined) { fields.push('followup_required = ?'); args.push(body.followup_required) }
    if (body.followup_notes !== undefined) { fields.push('followup_notes = ?'); args.push(body.followup_notes) }
    if (body.followup_date !== undefined) { fields.push('followup_date = ?'); args.push(body.followup_date) }

    fields.push('updated_at = ?')
    args.push(now)
    args.push(params.id)

    await db.execute({ sql: `UPDATE work_orders SET ${fields.join(', ')} WHERE id = ?`, args })

    const updated = await db.execute({ sql: 'SELECT * FROM work_orders WHERE id = ?', args: [params.id] })
    return NextResponse.json({ order: updated.rows[0] })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
