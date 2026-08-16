import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const r = await db.execute({ sql: 'SELECT * FROM clients WHERE id=?', args: [id] })
    if (!r.rows[0]) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    return NextResponse.json({ client: r.rows[0] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const b = await req.json()
  await db.execute({
    sql: `UPDATE clients SET
            name=?,email=?,phone=?,cellphone=?,address=?,city=?,neighborhood=?,commune=?,
            consumption_date=?,payment_date=?,plan=?,plan_value=?,reference=?,
            status=?,classification=?,notes=?,
            cedula=?,punto_referencia=?,foto_fachada=?,telefono_alternativo=?,
            fecha_instalacion=?,incluye_tv=?,dia_pago=?,referido_nombre=?,referido_telefono=?
          WHERE id=?`,
    args: [
      b.name, b.email??'', b.phone??'', b.cellphone,
      b.address??'', b.city??'', b.neighborhood??'', b.commune??'',
      b.consumption_date??'', b.payment_date??'',
      b.plan, b.plan_value, b.reference??'',
      b.status??'active', b.classification??'AL DÍA', b.notes??'',
      b.cedula??'', b.punto_referencia??'', b.foto_fachada??'',
      b.telefono_alternativo??'', b.fecha_instalacion??'',
      b.incluye_tv?1:0, b.dia_pago??'30',
      b.referido_nombre??'', b.referido_telefono??'',
      id
    ]
  })
  const updated = await db.execute({ sql: 'SELECT * FROM clients WHERE id=?', args: [id] })
  broadcast('update-client', updated.rows[0])
  return NextResponse.json({ client: updated.rows[0] })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.execute({ sql: 'DELETE FROM clients WHERE id=?', args: [id] })
  broadcast('delete-client', { id })
  return NextResponse.json({ success: true })
}
