import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'fallback-dev-secret')

const PUBLIC = [
  '/login',
  '/api/auth/login',
  '/api/auth/seed',
  '/api/init',
  '/api/sse',
  '/api/push',
  '/api/webhook',
  '/api/notifications',
]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get('mf_token')?.value

  if (!token) {
    if (pathname.startsWith('/api/'))
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    await jwtVerify(token, SECRET)
    return NextResponse.next()
  } catch {
    if (pathname.startsWith('/api/'))
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    return NextResponse.redirect(new URL('/login', req.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|icons).*)']
}
