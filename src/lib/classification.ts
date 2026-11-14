// ============================================================
// MEDIFIBRA — Motor de Clasificacion de Cartera v10.4
// Fuente de verdad unica para frontend, backend y cron.
// CICLO: basado en payments.period (YYYY-MM)
// Un cliente esta AL_DIA solo si tiene pago en el ciclo vigente
// o si es cliente nuevo sin historial (primer cobro mes siguiente)
// v10.2: mora real cuando lastPaymentPeriod existe pero < cycleKey
// v10.3: clientes sin pagos usan daysSinceDue del ciclo vigente
//        (elimina calculo de mora historica para sin-pagos)
// v10.4: fix newDate()->new Date(); pago adelantado (lastPaymentPeriod>cycleKey) -> AL_DIA
// ============================================================

export const CLASSIFICATIONS = [
  'AL_DIA',
  'PROXIMO_PAGAR',
  'RECORDAR_RECIBO',
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
  AL_DIA:             { bg: '#0a1f14', text: '#6ee7b7',border:'#047857', label: 'Al dia'               },
  PROXIMO_PAGAR:      { bg: '#1c1008', text: '#fb923c',border:'#9a3412', label: 'Proximo a pagar'      },
  RECORDAR_RECIBO:    { bg: '#1a1500', text: '#fbbf24',border:'#92400e', label: 'Enviar recibo'        },
  NOVEDAD_PAGO:       { bg: '#150d24', text: '#a78bfa',border:'#5b21b6', label: 'Novedad de pago'      },
  NO_PAGA_AUTORIZADO: { bg: '#071820', text: '#5eead4',border:'#0f766e', label: 'No paga - autorizado' },
  SUSPENDIDO_TEMP:    { bg: '#0f1723', text: '#94a3b8',border:'#334155', label: 'Suspendido temporal'  },
  SUSPENDIDO:         { bg: '#1c1714', text: '#d6bcaa',border:'#78716c', label: 'Suspendido'           },
  RECOGER_EQUIPO:     { bg: '#1a0808', text: '#fca5a5',border:'#991b1b', label: 'Recoger equipo'       },
  USUARIO_PERDIDO:    { bg: '#111827', text: '#6b7280',border:'#374151', label: 'Usuario perdido'      },
  SIN_FECHA:          { bg: '#0d1a2e', text: '#60a5fa',border:'#1d4ed8', label: 'Sin fecha'            },
  INHABILITADO:       { bg: '#1a0a1a', text: '#e879f9',border:'#86198f', label: 'Inhabilitado'         },
}

export const PROTECTED_CLASSIFICATIONS: ReadonlySet<string> = new Set([
  'NOVEDAD_PAGO',
  'NO_PAGA_AUTORIZADO',
  'RECOGER_EQUIPO',
  'USUARIO_PERDIDO',
  'INHABILITADO',
  'RECORDAR_RECIBO',
])

export function getCC(cls: string) {
  return (
    CLASS_CONFIG[cls as Classification] ?? {
      bg: '#111827', text: '#6b7280', border: '#374151', label:cls || 'Sin estado',
    }
  )
}

export function isProtected(cls: string): boolean {
  return PROTECTED_CLASSIFICATIONS.has(cls)
}

function lastDayOf(year: number, month: number): number{
  return new Date(year, month + 1, 0).getDate()
}

function clampPayDay(payDay: number, year: number, month: number): number {
  return Math.min(payDay, lastDayOf(year, month))
}

export function getCycleKey(payDay: number, today: Date): string {
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()
  const dueDayThisMonth = clampPayDay(payDay, y, m)
  if (d >= dueDayThisMonth) {
    return String(y) + '-' + String(m + 1).padStart(2, '0')
  }
  const prevM = m === 0 ? 11 : m - 1
  const prevY = m === 0 ? y - 1 : y
  return String(prevY) + '-' + String(prevM + 1).padStart(2, '0')
}

export interface ClassificationInput {
  currentClassification: string
  diaPago: string | null | undefined
  lastPaymentPeriod: string | null | undefined
  clientCreatedAt: string | null | undefined
  today?: Date
}

export interface ClassificationResult {
  classification: string
  reason: string
}

export function computeClassification(input: ClassificationInput): ClassificationResult {
  const { currentClassification, diaPago, lastPaymentPeriod, clientCreatedAt } = input

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

  const cycleKey = getCycleKey(payDay, today)

  const [ckY, ckM] = cycleKey.split('-').map(Number)
  const cycleStartDay = clampPayDay(payDay, ckY, ckM - 1)
  const cycleStart = new Date(ckY, ckM - 1, cycleStartDay)
  cycleStart.setHours(0, 0, 0, 0)

  const isNewClient = !lastPaymentPeriod && clientCreatedAt
    ? new Date(clientCreatedAt) >= cycleStart
    : false

  if (isNewClient) {
    return {
      classification: 'AL_DIA',
      reason: 'cliente nuevo — primer cobro en el proximo ciclo (dia ' + payDay + ')',
    }
  }

  // v10.4: pago adelantado — el cliente pago un ciclo futuro (lastPaymentPeriod > cycleKey)
  // Tratar igual que hasPaidThisCycle: calcular dias hasta proximo vencimiento
  if (lastPaymentPeriod && lastPaymentPeriod > cycleKey) {
    let nextM = todayM
    let nextY = todayY
    if (todayD >= dueDayThisMonth) {
      nextM = todayM + 1
      if (nextM > 11) { nextM = 0; nextY++ }
    }
    const nextDueDay = clampPayDay(payDay, nextY, nextM)
    const nextDue = new Date(nextY, nextM, nextDueDay)
    nextDue.setHours(0, 0, 0, 0)
    const daysUntilNext = Math.round((nextDue.getTime() - today.getTime()) / MS)
    if (daysUntilNext <= 3) {
      return {
        classification: 'PROXIMO_PAGAR',
        reason: 'pago adelantado ciclo ' + lastPaymentPeriod + ', faltan ' + daysUntilNext + ' dia(s) para vencimiento (dia ' + payDay + ')',
      }
    }
    return {
      classification: 'AL_DIA',
      reason: 'pago adelantado ciclo ' + lastPaymentPeriod + ', faltan ' + daysUntilNext + ' dias para vencimiento (dia ' + payDay + ')',
    }
  }

  const hasPaidThisCycle = lastPaymentPeriod === cycleKey

  if (hasPaidThisCycle) {
    let nextM = todayM
    let nextY = todayY
    if (todayD >= dueDayThisMonth) {
      nextM = todayM + 1
      if (nextM > 11) { nextM = 0; nextY++ }
    }
    const nextDueDay = clampPayDay(payDay, nextY, nextM)
    const nextDue = new Date(nextY, nextM, nextDueDay)
    nextDue.setHours(0, 0, 0, 0)
    const daysUntilNext = Math.round((nextDue.getTime() - today.getTime()) / MS)

    if (daysUntilNext <= 3) {
      return {
        classification: 'PROXIMO_PAGAR',
        reason: 'pago ciclo ' + cycleKey + ', faltan ' + daysUntilNext + ' dia(s) para proximo vencimiento (dia ' + payDay + ')',
      }
    }
    return {
      classification: 'AL_DIA',
      reason: 'pago ciclo ' + cycleKey + ', faltan ' + daysUntilNext + ' dias para proximo vencimiento (dia ' + payDay + ')',
    }
  }

  // CASO B: NO tiene pago en el ciclo vigente (y no es cliente nuevo)
  // v10.3: todos los casos sin pago en ciclo vigente usan realDaysSinceDue
  //   - Sin pagos previos: daysSinceDue contra ciclo vigente (NO mora historica)
  //   - Con pagos previos atrasados (lastPaymentPeriod < cycleKey):
  //     mora desde vencimiento del ciclo siguiente al ultimo pago
  let realDaysSinceDue = daysSinceDue

  if (lastPaymentPeriod && lastPaymentPeriod < cycleKey) {
    // v10.2: mora real desde vencimiento del ciclo siguiente al ultimo pago
    const [lpY, lpM] = lastPaymentPeriod.split('-').map(Number)
    const nextCycleM = lpM % 12
    const nextCycleY = lpM === 12 ? lpY + 1 : lpY
    const nextDueDay = clampPayDay(payDay, nextCycleY, nextCycleM)
    const nextDue = new Date(nextCycleY, nextCycleM, nextDueDay)
    nextDue.setHours(0, 0, 0, 0)
    realDaysSinceDue = Math.round((today.getTime() - nextDue.getTime()) / MS)
  }
  // Sin pagos previos: usa daysSinceDue del ciclo vigente (ya asignado por defecto)

  if (realDaysSinceDue >= 30) {
    return {
      classification: 'RECOGER_EQUIPO',
      reason: realDaysSinceDue + ' dias de mora real — recoger equipo (dia ' + payDay + ')',
    }
  }
  if (realDaysSinceDue >= 4) {
    return {
      classification: 'SUSPENDIDO',
      reason: 'mora real ' + realDaysSinceDue + ' dias (dia ' + payDay + ') — sin pago ciclo ' + cycleKey,
    }
  }
  if (realDaysSinceDue >= 1) {
    return {
      classification: 'SUSPENDIDO_TEMP',
      reason: 'mora real ' + realDaysSinceDue + ' dia(s) (dia ' + payDay + ') — gracia ' + (3 - realDaysSinceDue + 1) + ' dia(s) restante(s)',
    }
  }
  if (realDaysSinceDue >= -3) {
    return {
      classification: 'PROXIMO_PAGAR',
      reason: 'vence en ' + (-realDaysSinceDue) + ' dia(s) (dia ' + payDay + ') — aviso preventivo',
    }
  }
  return {
    classification: 'AL_DIA',
    reason: 'faltan ' + (-realDaysSinceDue) + ' dias para vencimiento (dia ' + payDay + ')',
  }
}

export function computeAutoClassification(
  currentClassification: string,
  diaPago: string,
  lastPaymentPeriod: string | null,
  clientCreatedAt: string | null,
): string {
  return computeClassification({
    currentClassification,
    diaPago,
    lastPaymentPeriod,
    clientCreatedAt,
  }).classification
}
