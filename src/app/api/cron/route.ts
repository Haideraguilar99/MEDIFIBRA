import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET ?? ''

  // Debug: mostrar exactamente qué llega
  console.log('[cron] authHeader:', JSON.stringify(authHeader))
  console.log('[cron] CRON_SECRET length:', cronSecret.length)
  console.log('[cron] CRON_SECRET first8:', cronSecret.slice(0, 8))
  console.log('[cron] expected:', JSON.stringify(`Bearer ${cronSecret}`))
  console.log('[cron] match:', authHeader === `Bearer ${cronSecret}`)

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({
      error: 'No autorizado',
      debug: {
        received: authHeader,
        secret_len: cronSecret.length,
        secret_first8: cronSecret.slice(0, 8),
      }
    }, { status: 401 })
  }

  return NextResponse.json({ ok: true, message: 'autorizado' })
}
