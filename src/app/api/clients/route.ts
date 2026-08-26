import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result  = await db.execute('SELECT * FROM clients ORDER BY created_at DESC')
    const stats   = await db.execute(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status='active'    THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status='suspended' THEN 1 ELSE 0 END) as suspended,
        SUM(CASE WHEN status='active'    THEN plan_value ELSE 0 END) as monthly_income
      FROM clients`)
    const byClass = await db.execute(`
      SELECT classification, COUNT(*) as n
      FROM clients GROUP BY classification ORDER BY n DESC`)
    return NextResponse.json({ clients: result.rows, stats: stats.rows[0], byClassification: byClass.rows })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    const result = await db.execute({
      sql: `INSERT INTO clients
              (name,email,phone,cellphone,address,city,neighborhood,commune,
               consumption_date,payment_date,plan,plan_value,reference,status,classification,notes,
               cedula,punto_referencia,foto_fachada,telefono_alternativo,
               fecha_instalacion,incluye_tv,dia_pago,referido_nombre,referido_telefono)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        b.name, b.email??'', b.phone??'', b.cellphone,
        b.address??'', b.city??'', b.neighborhood??'', b.commune??'',
        b.consumption_date??'', b.payment_date??'',
        b.plan, b.plan_value, b.reference??'',
        b.status??'active', b.classification??'AL DÍA', b.notes??'',
        b.cedula??'', b.punto_referencia??'', b.foto_fachada??'',
        b.telefono_alternativo??'', b.fecha_instalacion??'',
        b.incluye_tv?1:0, b.dia_pago??'',
        b.referido_nombre??'', b.referido_telefono??'',
      ]
    })
    const rowId = result.lastInsertRowid?.toString() ?? '0'
    const nc    = await db.execute({ sql: 'SELECT * FROM clients WHERE id=?', args: [rowId] })
    broadcast('new-client', nc.rows[0])
    return NextResponse.json({ client: nc.rows[0] }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
