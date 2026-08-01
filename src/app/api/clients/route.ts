import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await db.execute('SELECT * FROM clients ORDER BY created_at DESC')
    const stats = await db.execute(`SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status='suspended' THEN 1 ELSE 0 END) as suspended, SUM(CASE WHEN status='active' THEN plan_value ELSE 0 END) as monthly_income FROM clients`)
    return NextResponse.json({ clients: result.rows, stats: stats.rows[0] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await db.execute({
      sql: `INSERT INTO clients (name,email,phone,cellphone,address,city,neighborhood,commune,consumption_date,payment_date,plan,plan_value,reference,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [body.name,body.email??'',body.phone??'',body.cellphone,body.address??'',body.city??'',body.neighborhood??'',body.commune??'',body.consumption_date??'',body.payment_date??'',body.plan,body.plan_value,body.reference??'',body.status??'active',body.notes??'']
    })
    const rowId = result.lastInsertRowid?.toString() ?? '0'
    const newClient = await db.execute({ sql: 'SELECT * FROM clients WHERE id=?', args: [rowId] })
    broadcast('new-client', newClient.rows[0])
    return NextResponse.json({ client: newClient.rows[0] }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
