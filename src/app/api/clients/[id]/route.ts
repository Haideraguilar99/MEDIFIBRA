import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const result = await db.execute({ sql: 'SELECT * FROM clients WHERE id=?', args: [id] })
    if (!result.rows[0]) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    return NextResponse.json({ client: result.rows[0] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  await db.execute({
    sql: `UPDATE clients SET name=?,email=?,phone=?,cellphone=?,address=?,city=?,neighborhood=?,commune=?,consumption_date=?,payment_date=?,plan=?,plan_value=?,reference=?,status=?,notes=? WHERE id=?`,
    args: [body.name,body.email??'',body.phone??'',body.cellphone,body.address??'',body.city??'',body.neighborhood??'',body.commune??'',body.consumption_date??'',body.payment_date??'',body.plan,body.plan_value,body.reference??'',body.status??'active',body.notes??'',id]
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
