import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const result = await db.execute(`
      SELECT id, name, cellphone, plan, plan_value, classification, dia_pago, incluye_tv
      FROM clients
      WHERE status = 'active' AND dia_pago != ''
      ORDER BY
        CASE dia_pago
          WHEN '5'  THEN 1 WHEN '10' THEN 2 WHEN '12' THEN 3
          WHEN '15' THEN 4 WHEN '20' THEN 5 WHEN '25' THEN 6
          WHEN '30' THEN 7 ELSE 8 END,
        name ASC
    `)
    return NextResponse.json({ clients: result.rows })
  } catch {
    return NextResponse.json({ error: 'Error al cargar cobros' }, { status: 500 })
  }
}
