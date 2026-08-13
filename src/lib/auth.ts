import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { pbkdf2Sync, randomBytes } from 'crypto'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'fallback-dev-secret')
export const COOKIE_NAME = 'mf_token'

// ── JWT ────────────────────────────────────────────────────────────
export async function signToken(payload: { id: number; username: string; role: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { id: number; username: string; role: string }
  } catch {
    return null
  }
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// ── Passwords (pbkdf2 — sin dependencias extra) ───────────────────
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const attempt = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return attempt === hash
}
