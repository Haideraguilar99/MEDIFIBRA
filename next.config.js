/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      // ── Cache para assets estáticos (sin cambios) ──────────────────────
      {
        source: '/:path*.(png|jpg|jpeg|svg|ico|woff|woff2|ttf|otf)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, immutable',
          },
        ],
      },
      // ── Headers de seguridad HTTP para todas las rutas ─────────────────
      {
        source: '/:path*',
        headers: [
          // Previene clickjacking — nadie puede embeber el dashboard en un iframe
          { key: 'X-Frame-Options', value: 'DENY' },
          // Previene MIME sniffing — el browser respeta el Content-Type declarado
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Fuerza HTTPS por 1 año, incluye subdominios
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Controla info enviada en cabecera Referer
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restringe APIs del browser innecesarias
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          // Protección XSS legacy para browsers antiguos
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // CSP: permite recursos propios + CDNs usados en el proyecto
          // unsafe-inline requerido por Next.js App Router (estilos inline de Tailwind)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.turso.io wss://*.turso.io https://api.anthropic.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
