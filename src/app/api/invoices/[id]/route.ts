import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { status, method, notes, paid_at } = await req.json()
    const now = new Date().toISOString()
    const paidDate = status === 'paid' ? (paid_at || now) : null
    await db.execute({
      sql: `UPDATE invoices SET status=?, method=COALESCE(?,method), notes=COALESCE(?,notes), paid_at=? WHERE id=?`,
      args: [status, method||null, notes||null, paidDate, id]
    })
    if (status === 'paid') {
      const inv = await db.execute({ sql: 'SELECT client_id FROM invoices WHERE id=?', args: [id] })
      if (inv.rows[0]) {
        await db.execute({
          sql: `UPDATE clients SET classification='AL_DIA' WHERE id=? AND classification NOT IN ('RECOGER_EQUIPO','NOVEDAD_PAGO','NO_PAGA_AUTORIZADO','SUSPENDIDO_TEMP','SUSPENDIDO','USUARIO_PERDIDO')`,
          args: [inv.rows[0].client_id]
        })
      }
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.execute({ sql: 'DELETE FROM invoices WHERE id=?', args: [id] })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
