import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

// ── Dominios permitidos para el proxy de imágenes ──────────────────────────
// NUNCA hacer fetch a dominios fuera de esta lista
const ALLOWED_DOMAINS = [
  'res.cloudinary.com',
  'images.unsplash.com',
  'lh3.googleusercontent.com',
  'avatars.githubusercontent.com',
  'storage.googleapis.com',
  'blob.vercel-storage.com',
  'medifibra-filc.vercel.app',
  'medifibra-tecnico.vercel.app',
]

// ── Rangos de IPs privadas/reservadas bloqueadas (SSRF prevention) ─────────
const BLOCKED_IP_PATTERNS = [
  /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./, /^0\./, /^::1$/, /^fc/, /^fd/, /^localhost$/i,
  /^metadata\./, /^169\.254\.169\.254/,
]

function isBlockedHost(hostname: string): boolean {
  return BLOCKED_IP_PATTERNS.some(p => p.test(hostname))
}

function isAllowedDomain(hostname: string): boolean {
  return ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))
}

export async function GET(req: NextRequest) {
  try {
    const rawUrl = req.nextUrl.searchParams.get('url')

    // 1. Parámetro requerido
    if (!rawUrl) {
      return new NextResponse('Missing url parameter', { status: 400 })
    }

    // 2. Parsear y validar URL
    let parsed: URL
    try {
      parsed = new URL(rawUrl)
    } catch {
      return new NextResponse('URL inválida', { status: 400 })
    }

    // 3. Solo esquema HTTPS permitido — bloquear file://, ftp://, gopher://, http://, etc.
    if (parsed.protocol !== 'https:') {
      return new NextResponse('Solo se permite protocolo HTTPS', { status: 400 })
    }

    // 4. Bloquear IPs privadas y hosts reservados (SSRF)
    if (isBlockedHost(parsed.hostname)) {
      return new NextResponse('Host no permitido', { status: 400 })
    }

    // 5. Validar dominio contra whitelist
    if (!isAllowedDomain(parsed.hostname)) {
      return new NextResponse('Dominio no autorizado', { status: 400 })
    }

    // 6. Fetch con timeout y sin seguir redirecciones arbitrarias
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    let res: Response
    try {
      res = await fetch(parsed.toString(), {
        signal: controller.signal,
        redirect: 'error', // No seguir redirecciones — pueden apuntar a IPs privadas
        headers: {
          'User-Agent': 'Medifibra-ImageProxy/1.0',
        },
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) {
      return new NextResponse('Error al obtener imagen', { status: 502 })
    }

    // 7. Validar que la respuesta sea una imagen
    const contentType = res.headers.get('content-type') ?? ''
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!ALLOWED_TYPES.some(t => contentType.startsWith(t))) {
      return new NextResponse('Tipo de contenido no permitido', { status: 400 })
    }

    // 8. Limitar tamaño de respuesta a 5MB
    const MAX_SIZE = 5 * 1024 * 1024
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength > MAX_SIZE) {
      return new NextResponse('Imagen demasiado grande', { status: 400 })
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    })

  } catch (error) {
    console.error('[img-proxy] Error:', error)
    return new NextResponse('Error interno', { status: 500 })
  }
}
