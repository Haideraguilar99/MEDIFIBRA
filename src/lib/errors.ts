// ── Manejo seguro de errores — nunca exponer stack traces en producción ──────
// Usar safeError() en TODOS los catch de los route handlers
// En desarrollo: muestra el error real para debugging
// En producción: mensaje genérico al cliente, error real solo en logs del servidor

export function safeError(error: unknown, fallback = 'Error interno del servidor'): string {
  if (process.env.NODE_ENV === 'development') {
    return String(error)
  }
  console.error('[safeError]', error)
  return fallback
}
