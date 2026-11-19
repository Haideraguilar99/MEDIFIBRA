import { NextResponse } from 'next/server'
import { TECH_COOKIE_NAME } from '@/lib/tecnico-auth'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(TECH_COOKIE_NAME, '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   0, // elimina la cookie inmediatamente
    path:     '/'
  })
  return res
}
