// ============================================================
// MEDIFIBRA — Motor de Clasificacion de Cartera v9.1
// Fuente de verdad unica para frontend, backend y cron.
// CICLO: abre el dia D de cada mes, cierra el dia 4 del mes siguiente a las 23:59
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
  AL_DIA:             { bg: '#0a1f14', text: '#6ee7b7', border: '#047857', label: 'Al dia'               },
  PROXIMO_PAGAR:      { bg: '#1c1008', text: '#fb923c', border: '#9a3412', label: 'Proximo a pagar'      },
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

function lastDayOf(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function clampPayDay(payDay: number, year: number, month: number): number {
  return Math.min(payDay, lastDayOf(year, month))
}

// REGLAS DE NEGOCIO v9.1:
//   CICLO: empieza el dia D del mes, cierra el dia 4 del mes siguiente.
//   Caso A - pago en el ciclo vigente:
//     faltan > 3 dias para el proximo D   -> AL_DIA
//     faltan <= 3 dias para el proximo D  -> PROXIMO_PAGAR
//   Caso B - NO pago en el ciclo vigente:
//     HOY < D-3                           -> AL_DIA
//     HOY entre D-3 y D                   -> PROXIMO_PAGAR (aviso)
//     HOY entre D+1 y dia 4 mes sig.      -> PROXIMO_PAGAR (ciclo abierto)
//     HOY desde dia 5 mes sig. hasta D+30 -> SUSPENDIDO_TEMP
//     HOY > D+30                          -> RECOGER_EQUIPO
//   SIN_FECHA: dia_pago ausente o invalido.
//   PROTECTED: nunca se toca automaticamente.

export interface ClassificationInput {
  currentClassification: string
  diaPago: string | null | undefined
  lastPaymentDate: string | null | undefined
  today?: Date
}

export interface ClassificationResult {
  classification: string
  reason: string
}

export function computeClassification(input: ClassificationInput): ClassificationResult {
  const { currentClassification, diaPago, lastPaymentDate } = input

  if (isProtected(currentClassification)) {
    return { classification: currentClassification, reason: 'estado protegido — sin cambio' }
  }

  const payDay = parseInt(String(diaPago ?? ''), 10)
  if (!diaPago || isNaN(payDay) || payDay < 1 || payDay > 31) {
    return { classification: 'SIN_FECHA', reason: 'dia_pago ausente o invalido' }
  }

  const today = input.today ? new Date(input.today) : new Date()
  today.setHours(0, 0, 0, 0)
  const todayY = today.getFullYear()
  const todayM = today.getMonth()
  const todayD = today.getDate()
  const MS = 86_400_000

  const dueDayThisMonth = clampPayDay(payDay, todayY, todayM)
  const dueDate = new Date(todayY, todayM, dueDayThisMonth)
  dueDate.setHours(0, 0, 0, 0)
  const daysSinceDue = Math.round((today.getTime() - dueDate.getTime()) / MS)

  let cycleStartY: number
  let cycleStartM: number
  let cycleStartD: number

  if (todayD >= dueDayThisMonth) {
    cycleStartY = todayY
    cycleStartM = todayM
    cycleStartD = dueDayThisMonth
  } else {
    const prevM = todayM === 0 ? 11 : todayM - 1
    const prevY = todayM === 0 ? todayY - 1 : todayY
    cycleStartY = prevY
    cycleStartM = prevM
    cycleStartD = clampPayDay(payDay, prevY, prevM)
  }

  const cycleStart = new Date(cycleStartY, cycleStartM, cycleStartD)
  cycleStart.setHours(0, 0, 0, 0)

  const cycleCloseM = cycleStartM === 11 ? 0 : cycleStartM + 1
  const cycleCloseY = cycleStartM === 11 ? cycleStartY + 1 : cycleStartY
  const cycleClose = new Date(cycleCloseY, cycleCloseM, 4)
  cycleClose.setHours(23, 59, 59, 999)

  const totalDaysSinceStart = Math.round((today.getTime() - cycleStart.getTime()) / MS)

  const hasPaid = lastPaymentDate
    ? new Date(lastPaymentDate) >= cycleStart
    : false

  if (hasPaid) {
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
        reason: 'pago este ciclo, faltan ' + daysUntilNext + ' dia(s) para el proximo vencimiento (dia ' + payDay + ')',
      }
    }
    return {
      classification: 'AL_DIA',
      reason: 'pago este ciclo, faltan ' + daysUntilNext + ' dias para el proximo vencimiento (dia ' + payDay + ')',
    }
  }

  if (totalDaysSinceStart > 30) {
    return {
      classification: 'RECOGER_EQUIPO',
      reason: totalDaysSinceStart + ' dias sin pagar — mas de un ciclo completo (dia ' + payDay + ')',
    }
  }

  if (daysSinceDue < -3) {
    return {
      classification: 'AL_DIA',
      reason: 'faltan ' + (-daysSinceDue) + ' dias para vencimiento (dia ' + payDay + ')',
    }
  }

  if (daysSinceDue <= 0) {
    return {
      classification: 'PROXIMO_PAGAR',
      reason: 'vence en ' + (-daysSinceDue) + ' dia(s) (dia ' + payDay + ') — aviso preventivo',
    }
  }

  if (today <= cycleClose) {
    return {
      classification: 'PROXIMO_PAGAR',
      reason: 'vencio hace ' + daysSinceDue + ' dia(s) (dia ' + payDay + ') — ciclo abierto hasta dia 4',
    }
  }

  return {
    classification: 'SUSPENDIDO_TEMP',
    reason: totalDaysSinceStart + ' dias sin pagar, ciclo cerrado (dia ' + payDay + ')',
  }
}

export function computeAutoClassification(
  currentClassification: string,
  diaPago: string,
  lastPaymentDate: string | null,
): string {
  return computeClassification({ currentClassification, diaPago, lastPaymentDate }).classification
}
