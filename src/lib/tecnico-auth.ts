import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

if (!process.env.JWT_SECRET) {
  throw new Error('[tecnico-auth] JWT_SECRET no está configurado en las variables de entorno')
}
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET)
export const TECH_COOKIE_NAME = 'mft_token'

export interface TechPayload {
  techId: number
  cedula: string
  name: string
  role: string
}

export async function signTechJWT(payload: TechPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('48h')
    .sign(SECRET)
}

export async function verifyTechToken(token: string): Promise<TechPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as TechPayload
  } catch {
    return null
  }
}

// Lee el token desde cookie httpOnly (seguro) o header Bearer (compatibilidad)
// Prioridad: cookie > header
export async function getTechSession(): Promise<TechPayload | null> {
  try {
    const cookieStore = await cookies()
    const cookieToken = cookieStore.get(TECH_COOKIE_NAME)?.value
    if (cookieToken) return verifyTechToken(cookieToken)
  } catch {}
  return null
}

// Mantener para compatibilidad con endpoints que reciben Request
// Lee cookie del header Cookie o header Authorization: Bearer
export function getTechTokenFromRequest(req: Request): string | null {
  // 1. Intentar leer cookie mft_token del header Cookie
  const cookieHeader = req.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/(?:^|;\s*)mft_token=([^;]+)/)
  if (match?.[1]) return decodeURIComponent(match[1])

  // 2. Fallback: header Authorization: Bearer (compatibilidad)
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)

  return null
}
