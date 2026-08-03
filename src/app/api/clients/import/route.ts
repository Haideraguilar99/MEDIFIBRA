import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clients } = body
    if (!Array.isArray(clients) || clients.length === 0)
      return NextResponse.json({ error: 'Sin datos' }, { status: 400 })

    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    for (const c of clients) {
      if (!c.name || !c.cellphone || !c.plan) { skipped++; continue }
      try {
        await db.execute({
          sql: `INSERT INTO clients (name,email,phone,cellphone,address,city,neighborhood,commune,consumption_date,payment_date,plan,plan_value,reference,status,notes)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          args: [
            c.name, c.email??'', c.phone??'', c.cellphone,
            c.address??'', c.city??'', c.neighborhood??'', c.commune??'',
            c.consumption_date??'', c.payment_date??'',
            c.plan, Number(c.plan_value??0), c.reference??'',
            c.status??'active', c.notes??''
          ]
        })
        inserted++
      } catch (e) {
        errors.push(`${c.name}: ${String(e)}`)
      }
    }

    return NextResponse.json({ inserted, skipped, errors })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
