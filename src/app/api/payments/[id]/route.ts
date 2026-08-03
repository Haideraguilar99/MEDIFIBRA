import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  await db.execute({
    sql: `UPDATE payments SET client_id=?, amount=?, period=?, method=?, status=?, notes=? WHERE id=?`,
    args: [body.client_id, body.amount, body.period, body.method, body.status, body.notes, id]
  })
  const updated = await db.execute({
    sql: `SELECT p.*, c.name as client_name, c.plan, c.cellphone
          FROM payments p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id=?`,
    args: [id]
  })
  broadcast('update-payment', updated.rows[0])
  return NextResponse.json({ payment: updated.rows[0] })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.execute({ sql: 'DELETE FROM payments WHERE id=?', args: [id] })
  broadcast('delete-payment', { id })
  return NextResponse.json({ success: true })
}
