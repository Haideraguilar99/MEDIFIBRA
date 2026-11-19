import { db } from '@/lib/db'
import { signToken, verifyPassword, COOKIE_NAME } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

// ── Rate limiting en memoria para login — brute force protection ───────────
const LOGIN_RATE_LIMIT_MAX = 10
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const loginRateLimitMap = new Map<string, { count: number; firstAttempt: number }>()

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = loginRateLimitMap.get(ip)
  if (!entry) {
    loginRateLimitMap.set(ip, { count: 1, firstAttempt: now })
    return true
  }
  if (now - entry.firstAttempt > LOGIN_RATE_LIMIT_WINDOW_MS) {
    loginRateLimitMap.set(ip, { count: 1, firstAttempt: now })
    return true
  }
  if (entry.count >= LOGIN_RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of loginRateLimitMap.entries()) {
    if (now - entry.firstAttempt > LOGIN_RATE_LIMIT_WINDOW_MS) {
      loginRateLimitMap.delete(ip)
    }
  }
}, 60 * 60 * 1000)

export async function POST(req: NextRequest) {
  try {
    // Rate limiting por IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            ?? req.headers.get('x-real-ip')
            ?? 'unknown'

    if (!checkLoginRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intente nuevamente en 15 minutos.' },
        { status: 429 }
      )
    }

    // Validar Content-Type
    const ct = req.headers.get('content-type')
    if (!ct?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type debe ser application/json' }, { status: 415 })
    }

    const { username, password } = await req.json()
    if (!username || !password)
      return NextResponse.json({ error: 'Credenciales requeridas' }, { status: 400 })

    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE username = ? AND active = 1',
      args: [username]
    })
    const user = result.rows[0]

    // Mensaje genérico — no revelar si el usuario existe o no
    if (!user || !verifyPassword(password, String(user.password_hash)))
      return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })

    const token = await signToken({
      id: Number(user.id),
      username: String(user.username),
      role: String(user.role)
    })

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, username: user.username, role: user.role }
    })

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 48, // 48h — alineado con setExpirationTime('48h') en auth.ts
      path: '/'
    })

    return res
  } catch (error) {
    console.error('[auth/login] Error interno:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
