import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyTechToken, getTechTokenFromRequest } from '@/lib/tecnico-auth'

export async function GET(req: Request) {
  const token = getTechTokenFromRequest(req)
  const tech = token ? await verifyTechToken(token) : null
  if (!tech) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const workOrderId = url.searchParams.get('work_order_id')
  const clientId = url.searchParams.get('client_id')

  const db = getDb()
  if (workOrderId) {
    const r = await db.execute({ sql: 'SELECT * FROM equipment_records WHERE work_order_id = ? ORDER BY recorded_at DESC', args: [workOrderId] })
    return NextResponse.json({ equipment: r.rows })
  }
  if (clientId) {
    const r = await db.execute({ sql: 'SELECT * FROM equipment_records WHERE client_id = ? ORDER BY recorded_at DESC', args: [clientId] })
    return NextResponse.json({ equipment: r.rows })
  }
  return NextResponse.json({ error: 'work_order_id o client_id requerido' }, { status: 400 })
}

export async function POST(req: Request) {
  const token = getTechTokenFromRequest(req)
  const tech = token ? await verifyTechToken(token) : null
  if (!tech) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { work_order_id, client_id, action, equipment_type, brand, model, serial, condition, notes } = await req.json()
    if (!work_order_id || !client_id || !action || !equipment_type) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const db = getDb()
    const result = await db.execute({
      sql: `INSERT INTO equipment_records (work_order_id, client_id, action, equipment_type, brand, model, serial, condition, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [work_order_id, client_id, action, equipment_type, brand ?? '', model ?? '', serial ?? '', condition ?? 'bueno', notes ?? '']
    })
    return NextResponse.json({ id: result.lastInsertRowid?.toString(), success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
