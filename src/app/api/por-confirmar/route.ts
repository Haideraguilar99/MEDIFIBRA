import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const result = await db.execute({
      sql: `SELECT id, name, cellphone, plan, plan_value, classification, dia_pago, address, incluye_tv
            FROM clients
            WHERE classification = 'CLIENTE_NUEVO'
            ORDER BY name ASC`,
      args: []
    })
    return NextResponse.json({ clients: result.rows })
  } catch (error) {
    console.error('[por-confirmar GET] Error interno:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, dia_pago } = await req.json()
    if (!id || !dia_pago) {
      return NextResponse.json({ error: 'Faltan datos: id y dia_pago son requeridos' }, { status: 400 })
    }

    // Validar que dia_pago sea un valor permitido
    const DIAS_VALIDOS = ['1','5','10','12','15','20','25','30']
    if (!DIAS_VALIDOS.includes(String(dia_pago))) {
      return NextResponse.json({ error: 'dia_pago inválido' }, { status: 400 })
    }

    await db.execute({
      sql: `UPDATE clients SET dia_pago=?, classification='PROXIMO_PAGAR' WHERE id=? AND classification='CLIENTE_NUEVO'`,
      args: [dia_pago, id]
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[por-confirmar PUT] Error interno:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
