import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { computeAutoClassification } from '@/lib/classification'
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const url    = new URL(req.url)
    const search = url.searchParams.get('search')?.trim() ?? ''
    const limit  = parseInt(url.searchParams.get('limit') ?? '0')

    if (search) {
      const q = '%' + search + '%'
      const result = await db.execute({
        sql: 'SELECT id, name, address, neighborhood, cellphone, status, classification, plan, plan_value, dia_pago, incluye_tv FROM clients WHERE name LIKE ? OR cellphone LIKE ? OR address LIKE ? ORDER BY name LIMIT ?',
        args: [q, q, q, limit || 20]
      })
      return NextResponse.json({ clients: result.rows })
    }

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
    // Calcular clasificacion automatica segun dia_pago (ignora lo que mande el form)
    const autoClass = computeAutoClassification('', b.dia_pago ?? '', null)
    // Verificar celular duplicado solo si se proporcionó
    if (b.cellphone) {
      const dup = await db.execute({
        sql: 'SELECT id, name FROM clients WHERE cellphone = ? LIMIT 1',
        args: [b.cellphone]
      })
      if (dup.rows[0]) {
        return NextResponse.json({
          error: `El celular ya está registrado para: ${dup.rows[0].name}`
        }, { status: 409 })
      }
    }

    const result = await db.execute({
      sql: `INSERT INTO clients
              (name,email,phone,cellphone,address,city,neighborhood,commune,
               consumption_date,payment_date,plan,plan_value,reference,status,classification,notes,
               cedula,punto_referencia,foto_fachada,telefono_alternativo,
               fecha_instalacion,incluye_tv,dia_pago,referido_nombre,referido_telefono,puntos_tv,suspension_reason)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        b.name, b.email??'', b.phone??'', b.cellphone ?? '',
        b.address??'', b.city??'', b.neighborhood??'', b.commune??'',
        b.consumption_date??'', b.payment_date??'',
        b.plan, b.plan_value, b.reference??'',
        b.status??'active', autoClass, b.notes??'',
        b.cedula??'', b.punto_referencia??'', b.foto_fachada??'',
        b.telefono_alternativo??'', b.fecha_instalacion??'',
        b.incluye_tv ?? 0, b.dia_pago??'',
        b.referido_nombre??'', b.referido_telefono??'',
        b.puntos_tv ?? 0,
        b.suspension_reason ?? '',
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
