import { SignJWT, jwtVerify } from 'jose'

if (!process.env.JWT_SECRET) {
  throw new Error('[tecnico-auth] JWT_SECRET no está configurado en las variables de entorno')
}
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

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
    .setExpirationTime('12h')
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

export function getTechTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}
