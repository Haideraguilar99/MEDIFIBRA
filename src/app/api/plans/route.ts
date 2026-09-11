import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const result = await db.execute(
      'SELECT id, name, speed_mbps, price, color FROM plans WHERE active = 1 ORDER BY speed_mbps ASC'
    )
    const plans = result.rows.map(r => ({
      id: `fibra-${r.speed_mbps}`,
      name: r.name as string,
      speed: r.speed_mbps as number,
      value: r.price as number,
      color: r.color as string,
      label: String(r.speed_mbps),
    }))
    return NextResponse.json({ plans, tv: { name: 'Televisión', value: 30000 } })
  } catch {
    return NextResponse.json({ error: 'Error al cargar planes' }, { status: 500 })
  }
}
