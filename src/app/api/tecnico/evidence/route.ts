import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyTechToken, getTechTokenFromRequest } from '@/lib/tecnico-auth'

export async function GET(req: Request) {
  const token = getTechTokenFromRequest(req)
  const tech = token ? await verifyTechToken(token) : null
  if (!tech) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const workOrderId = url.searchParams.get('work_order_id')
  if (!workOrderId) return NextResponse.json({ error: 'work_order_id requerido' }, { status: 400 })

  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM service_evidence WHERE work_order_id = ? ORDER BY uploaded_at ASC',
    args: [workOrderId]
  })
  return NextResponse.json({ evidence: result.rows })
}

export async function POST(req: Request) {
  const token = getTechTokenFromRequest(req)
  const tech = token ? await verifyTechToken(token) : null
  if (!tech) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { work_order_id, phase, photo_url, caption } = await req.json()
    if (!work_order_id || !phase || !photo_url) {
      return NextResponse.json({ error: 'work_order_id, phase y photo_url son requeridos' }, { status: 400 })
    }

    const db = getDb()
    const result = await db.execute({
      sql: `INSERT INTO service_evidence (work_order_id, phase, photo_url, caption)
            VALUES (?, ?, ?, ?)`,
      args: [work_order_id, phase, photo_url, caption ?? '']
    })

    // Actualizar completion_photos en work_orders para fácil acceso
    const existing = await db.execute({
      sql: 'SELECT completion_photos FROM work_orders WHERE id = ?',
      args: [work_order_id]
    })
    let photos: string[] = []
    try { photos = JSON.parse(existing.rows[0]?.completion_photos as string ?? '[]') } catch { photos = [] }
    photos.push(photo_url)
    await db.execute({
      sql: 'UPDATE work_orders SET completion_photos = ? WHERE id = ?',
      args: [JSON.stringify(photos), work_order_id]
    })

    return NextResponse.json({ id: result.lastInsertRowid?.toString(), success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
