import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyTechToken, getTechTokenFromRequest } from '@/lib/tecnico-auth'

export async function POST(req: Request) {
  const token = getTechTokenFromRequest(req)
  const tech = token ? await verifyTechToken(token) : null
  if (!tech) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { work_order_id, client_id, reason, scheduled_date } = await req.json()
    if (!work_order_id || !client_id || !reason) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const db = getDb()
    await db.execute({
      sql: `INSERT INTO service_followup (work_order_id, technician_id, client_id, reason, scheduled_date)
            VALUES (?, ?, ?, ?, ?)`,
      args: [work_order_id, tech.techId, client_id, reason, scheduled_date ?? '']
    })

    await db.execute({
      sql: 'UPDATE work_orders SET followup_required = 1, followup_notes = ?, followup_date = ? WHERE id = ?',
      args: [reason, scheduled_date ?? '', work_order_id]
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
