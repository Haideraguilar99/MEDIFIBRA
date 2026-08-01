import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
export async function POST(req: NextRequest) {
  const { endpoint, keys } = await req.json()
  await db.execute({ sql: 'INSERT OR REPLACE INTO push_subscriptions (endpoint,p256dh,auth) VALUES (?,?,?)', args: [endpoint, keys.p256dh, keys.auth] })
  return NextResponse.json({ success: true })
}
