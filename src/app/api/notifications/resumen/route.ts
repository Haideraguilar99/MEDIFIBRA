import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const result = await db.execute({
      sql: `SELECT client_id, MAX(sent_at) as last_sent
            FROM notifications_log
            GROUP BY client_id`,
      args: []
    })
    const map: Record<number, string> = {}
    result.rows.forEach(r => {
      map[Number(r.client_id)] = String(r.last_sent)
    })
    return NextResponse.json({ notified: map })
  } catch {
    return NextResponse.json({ notified: {} })
  }
}
