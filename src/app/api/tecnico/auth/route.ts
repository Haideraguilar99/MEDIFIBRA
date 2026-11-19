import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { signTechJWT, TECH_COOKIE_NAME } from '@/lib/tecnico-auth'

// Rate limiting en memoria por IP
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const rateLimitMap = new Map<string, { count: number; firstAttempt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry) { rateLimitMap.set(ip, { count: 1, firstAttempt: now }); return true }
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, firstAttempt: now }); return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) rateLimitMap.delete(ip)
  }
}, 60 * 60 * 1000)

export async function POST(req: Request) {
  try {
    const ip = (req.headers as Headers).get('x-forwarded-for')?.split(',')[0]?.trim()
            ?? (req.headers as Headers).get('x-real-ip')
            ?? 'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intente nuevamente en 15 minutos.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { cedula } = body

    if (!cedula || typeof cedula !== 'string' || !/^[0-9]{6,10}$/.test(cedula.trim())) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT id, name, cedula, role, active, photo_url FROM technicians WHERE cedula = ? AND active = 1',
      args: [cedula.trim()]
    })

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const tech = result.rows[0]
    const token = await signTechJWT({
      techId: tech.id as number,
      cedula: tech.cedula as string,
      name:   tech.name as string,
      role:   tech.role as string
    })

    const res = NextResponse.json({
      ok: true,
      tech: { id: tech.id, name: tech.name, role: tech.role, photo_url: tech.photo_url }
    })

    // Cookie httpOnly — no accesible desde JavaScript (protege contra XSS)
    res.cookies.set(TECH_COOKIE_NAME, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 48, // 48h — igual que el token JWT
      path:     '/'
    })

    return res
  } catch (e) {
    console.error('[tecnico/auth]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
