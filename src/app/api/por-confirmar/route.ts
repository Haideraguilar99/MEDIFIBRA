import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const result = await db.execute({
      sql: `SELECT id, name, cellphone, plan, plan_value, classification, dia_pago, address, incluye_tv
            FROM clients
            WHERE classification = 'CLIENTE_NUEVO'
            ORDER BY name ASC`,
      args: []
    })
    return NextResponse.json({ clients: result.rows })
  } catch {
    return NextResponse.json({ error: 'Error al cargar' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { id, dia_pago } = await req.json()
    if (!id || !dia_pago) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    await db.execute({
      sql: `UPDATE clients SET dia_pago=?, classification='PROXIMO_PAGAR' WHERE id=? AND classification='CLIENTE_NUEVO'`,
      args: [dia_pago, id]
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}
