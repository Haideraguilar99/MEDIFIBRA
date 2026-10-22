// ============================================================
// MEDIFIBRA — Motor de Clasificación de Cartera v8.0
// Fuente de verdad única para frontend, backend y cron.
// ============================================================

export const CLASSIFICATIONS = [
  'AL_DIA',
  'PROXIMO_PAGAR',
  'RECORDAR_RECIBO',
  'DEUDA_PENDIENTE',
  'NOVEDAD_PAGO',
  'NO_PAGA_AUTORIZADO',
  'SUSPENDIDO_TEMP',
  'SUSPENDIDO',
  'RECOGER_EQUIPO',
  'USUARIO_PERDIDO',
  'SIN_FECHA',
  'INHABILITADO',
] as const

export type Classification = (typeof CLASSIFICATIONS)[number]

export const CLASS_CONFIG: Record<
  Classification,
  { bg: string; text: string; border: string; label: string }
> = {
  AL_DIA:             { bg: '#0a1f14', text: '#6ee7b7', border: '#047857', label: 'Al día'               },
  PROXIMO_PAGAR:      { bg: '#1c1008', text: '#fb923c', border: '#9a3412', label: 'Próximo a pagar'      },
  RECORDAR_RECIBO:    { bg: '#1a1500', text: '#fbbf24', border: '#92400e', label: 'Enviar recibo'        },
  DEUDA_PENDIENTE:    { bg: '#1f1208', text: '#f97316', border: '#c2410c', label: 'Deuda pendiente'      },
  NOVEDAD_PAGO:       { bg: '#150d24', text: '#a78bfa', border: '#5b21b6', label: 'Novedad de pago'      },
  NO_PAGA_AUTORIZADO: { bg: '#071820', text: '#5eead4', border: '#0f766e', label: 'No paga - autorizado' },
  SUSPENDIDO_TEMP:    { bg: '#0f1723', text: '#94a3b8', border: '#334155', label: 'Suspendido temporal'  },
  SUSPENDIDO:         { bg: '#1c1714', text: '#d6bcaa', border: '#78716c', label: 'Suspendido'           },
  RECOGER_EQUIPO:     { bg: '#1a0808', text: '#fca5a5', border: '#991b1b', label: 'Recoger equipo'       },
  USUARIO_PERDIDO:    { bg: '#111827', text: '#6b7280', border: '#374151', label: 'Usuario perdido'      },
  SIN_FECHA:          { bg: '#0d1a2e', text: '#60a5fa', border: '#1d4ed8', label: 'Sin fecha'            },
  INHABILITADO:       { bg: '#1a0a1a', text: '#e879f9', border: '#86198f', label: 'Inhabilitado'         },
}

// Estados que el motor automático NUNCA sobreescribe.
// Solo Ana María los cambia manualmente.
export const PROTECTED_CLASSIFICATIONS: ReadonlySet<string> = new Set([
  'NOVEDAD_PAGO',
  'NO_PAGA_AUTORIZADO',
  'SUSPENDIDO',
  'RECOGER_EQUIPO',
  'USUARIO_PERDIDO',
  'INHABILITADO',
  'RECORDAR_RECIBO',
])

export function getCC(cls: string) {
  return (
    CLASS_CONFIG[cls as Classification] ?? {
      bg: '#111827', text: '#6b7280', border: '#374151', label: cls || 'Sin estado',
    }
  )
}

export function isProtected(cls: string): boolean {
  return PROTECTED_CLASSIFICATIONS.has(cls)
}

// ─────────────────────────────────────────────────────────────
// Utilidad: clamp del día de pago al último día del mes
// Ej: dia_pago=31 en febrero → 28/29
// ─────────────────────────────────────────────────────────────
function lastDayOf(year: number, month: number): number {
  // month es 0-based. new Date(year, month+1, 0) = último día del mes
  return new Date(year, month + 1, 0).getDate()
}

function clampPayDay(payDay: number, year: number, month: number): number {
  return Math.min(payDay, lastDayOf(year, month))
}

// ─────────────────────────────────────────────────────────────
// REGLAS DE NEGOCIO (referencia):
//
//   Sea D = dia_pago del cliente (día del mes acordado).
//   Sea HOY = fecha actual.
//
//   Caso A — pagó en el ciclo vigente:
//     · faltan > 3 días para el próximo D  → AL_DIA
//     · faltan ≤ 3 días para el próximo D  → PROXIMO_PAGAR
//
//   Caso B — NO pagó en el ciclo vigente:
//     · HOY está entre D-3 y D (aún no vence o es el día)
//       → PROXIMO_PAGAR  (aviso preventivo)
//     · HOY está en D+1, D+2, D+3         → PROXIMO_PAGAR  (gracia de 3 días)
//     · HOY es D+4 … D+30                 → SUSPENDIDO_TEMP
//     · HOY > D+30 (otro ciclo sin pagar) → RECOGER_EQUIPO
//
//   SIN_FECHA: dia_pago ausente o inválido.
//   PROTECTED: nunca se toca automáticamente.
// ─────────────────────────────────────────────────────────────

export interface ClassificationInput {
  currentClassification: string
  diaPago: string | null | undefined
  lastPaymentDate: string | null | undefined
  /** Inyectada para tests. Si se omite, usa new Date() */
  today?: Date
}

export interface ClassificationResult {
  classification: string
  reason: string
}

/**
 * Motor central de clasificación — puro y determinista.
 * Recibe el estado actual del cliente y devuelve el estado correcto.
 * No hace I/O. Se puede testear con cualquier fecha.
 */
export function computeClassification(input: ClassificationInput): ClassificationResult {
  const { currentClassification, diaPago, lastPaymentDate } = input

  // 1. Estados protegidos: respetar siempre
  if (isProtected(currentClassification)) {
    return { classification: currentClassification, reason: 'estado protegido — sin cambio' }
  }

  // 2. Validar dia_pago
  const payDay = parseInt(String(diaPago ?? ''), 10)
  if (!diaPago || isNaN(payDay) || payDay < 1 || payDay > 31) {
    return { classification: 'SIN_FECHA', reason: 'dia_pago ausente o inválido' }
  }

  // 3. Preparar fecha de hoy (sin hora)
  const today = input.today ? new Date(input.today) : new Date()
  today.setHours(0, 0, 0, 0)
  const todayY = today.getFullYear()
  const todayM = today.getMonth()   // 0-based
  const todayD = today.getDate()

  // ── Calcular fechas de vencimiento del ciclo vigente ──────────────────
  //
  // "Ciclo vigente": el período de pago que está corriendo ahora.
  // Si hoy es día 12 y paga el día 10 → el vencimiento del ciclo actual
  // fue el día 10 de este mes (ya venció).
  // Si hoy es día 8 y paga el día 10  → el vencimiento del ciclo actual
  // será el día 10 de este mes (aún no vence).
  //
  // En ambos casos la "dueDate" del ciclo vigente es el día payDay de
  // este mismo mes (ajustado al último día si el mes es corto).

  const dueDayThisMonth = clampPayDay(payDay, todayY, todayM)
  const dueDate = new Date(todayY, todayM, dueDayThisMonth)
  dueDate.setHours(0, 0, 0, 0)

  // Días desde el vencimiento (positivo = ya pasó, negativo = aún no)
  const MS = 86_400_000
  const daysSinceDue = Math.round((today.getTime() - dueDate.getTime()) / MS)

  // ── Inicio del ciclo vigente (para determinar si pagó este ciclo) ──────
  //
  // El ciclo vigente empieza el dia_pago del MES ANTERIOR si hoy aún no
  // llegó al dia_pago de este mes, o en el dia_pago de ESTE MES si ya pasó.
  let cycleStartY: number
  let cycleStartM: number
  let cycleStartD: number

  if (todayD >= dueDayThisMonth) {
    // Ya pasó (o es hoy) el dia_pago de este mes → ciclo empezó este mes
    cycleStartY = todayY
    cycleStartM = todayM
    cycleStartD = dueDayThisMonth
  } else {
    // Aún no llega el dia_pago de este mes → ciclo empezó el mes pasado
    const prevM = todayM === 0 ? 11 : todayM - 1
    const prevY = todayM === 0 ? todayY - 1 : todayY
    cycleStartY = prevY
    cycleStartM = prevM
    cycleStartD = clampPayDay(payDay, prevY, prevM)
  }

  const cycleStart = new Date(cycleStartY, cycleStartM, cycleStartD)
  cycleStart.setHours(0, 0, 0, 0)

  // ── ¿Pagó en el ciclo vigente? ────────────────────────────────────────
  const hasPaid = lastPaymentDate
    ? new Date(lastPaymentDate) >= cycleStart
    : false

  // ── CASO A: Pagó este ciclo ───────────────────────────────────────────
  if (hasPaid) {
    // Próximo vencimiento
    let nextM = todayD >= dueDayThisMonth ? todayM + 1 : todayM
    let nextY = todayY
    if (nextM > 11) { nextM = 0; nextY++ }
    const nextDueDay = clampPayDay(payDay, nextY, nextM)
    const nextDue = new Date(nextY, nextM, nextDueDay)
    nextDue.setHours(0, 0, 0, 0)
    const daysUntilNext = Math.round((nextDue.getTime() - today.getTime()) / MS)

    if (daysUntilNext <= 3) {
      return {
        classification: 'PROXIMO_PAGAR',
        reason: `pagó este ciclo, faltan ${daysUntilNext} día(s) para el próximo vencimiento (día ${payDay})`,
      }
    }
    return {
      classification: 'AL_DIA',
      reason: `pagó este ciclo, faltan ${daysUntilNext} días para el próximo vencimiento (día ${payDay})`,
    }
  }

  // ── CASO B: No pagó este ciclo ────────────────────────────────────────

  // B1. Aún no vence o es el mismo día de vencimiento: preventivo
  //     daysSinceDue <= 0 y abs(daysSinceDue) <= 3  → PROXIMO_PAGAR
  if (daysSinceDue <= 0) {
    const daysUntilDue = -daysSinceDue
    if (daysUntilDue <= 3) {
      return {
        classification: 'PROXIMO_PAGAR',
        reason: `vence en ${daysUntilDue} día(s) (día ${payDay}) — aviso preventivo`,
      }
    }
    // Faltan más de 3 días — sigue AL_DIA si estaba, o lo pone AL_DIA
    return {
      classification: 'AL_DIA',
      reason: `faltan ${daysUntilDue} días para vencimiento (día ${payDay})`,
    }
  }

  // daysSinceDue > 0: ya venció

  // B2. Días 1–3 post-vencimiento: gracia → PROXIMO_PAGAR
  if (daysSinceDue <= 3) {
    return {
      classification: 'PROXIMO_PAGAR',
      reason: `${daysSinceDue} día(s) desde vencimiento (día ${payDay}) — período de gracia`,
    }
  }

  // B3. Días 4–30 post-vencimiento: SUSPENDIDO_TEMP
  if (daysSinceDue <= 30) {
    return {
      classification: 'SUSPENDIDO_TEMP',
      reason: `${daysSinceDue} días sin pagar desde vencimiento (día ${payDay})`,
    }
  }

  // B4. Más de 30 días: RECOGER_EQUIPO
  return {
    classification: 'RECOGER_EQUIPO',
    reason: `${daysSinceDue} días sin pagar — 2 ciclos de mora (día ${payDay})`,
  }
}

/**
 * Firma de compatibilidad con el código existente.
 * Los lugares que ya la llaman siguen funcionando sin cambios.
 */
export function computeAutoClassification(
  currentClassification: string,
  diaPago: string,
  lastPaymentDate: string | null,
): string {
  return computeClassification({ currentClassification, diaPago, lastPaymentDate }).classification
}
