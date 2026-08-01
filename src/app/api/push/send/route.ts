import { db } from '@/lib/db'
import webpush from 'web-push'
import { NextRequest, NextResponse } from 'next/server'
webpush.setVapidDetails(process.env.VAPID_EMAIL!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!)
export async function POST(req: NextRequest) {
  const { title, body, icon } = await req.json()
  const result = await db.execute('SELECT * FROM push_subscriptions')
  await Promise.all(result.rows.map(sub => webpush.sendNotification({ endpoint: sub.endpoint as string, keys: { p256dh: sub.p256dh as string, auth: sub.auth as string } }, JSON.stringify({ title, body, icon: icon ?? '/logo.png' })).catch(() => null)))
  return NextResponse.json({ success: true, sent: result.rows.length })
}
