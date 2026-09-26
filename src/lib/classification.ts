// ============================================================
// MEDIFIBRA — Sistema de Clasificacion de Clientes v7.0
// Fuente de verdad compartida entre frontend y backend
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

export type Classification = typeof CLASSIFICATIONS[number]

export const CLASS_CONFIG: Record<Classification, {
  bg: string; text: string; border: string; label: string
}> = {
  AL_DIA:             { bg:'#0a1f14', text:'#6ee7b7', border:'#047857', label:'Al dia'               },
  PROXIMO_PAGAR:      { bg:'#1c1008', text:'#fb923c', border:'#9a3412', label:'Proximo a pagar'      },
  RECORDAR_RECIBO:    { bg:'#1a1500', text:'#fbbf24', border:'#92400e', label:'Enviar recibo'        },
  DEUDA_PENDIENTE:    { bg:'#1f1208', text:'#f97316', border:'#c2410c', label:'Deuda pendiente'      },
  NOVEDAD_PAGO:       { bg:'#150d24', text:'#a78bfa', border:'#5b21b6', label:'Novedad de pago'      },
  NO_PAGA_AUTORIZADO: { bg:'#071820', text:'#5eead4', border:'#0f766e', label:'No paga - autorizado' },
  SUSPENDIDO_TEMP:    { bg:'#0f1723', text:'#94a3b8', border:'#334155', label:'Suspendido temporal'  },
  SUSPENDIDO:         { bg:'#1c1714', text:'#d6bcaa', border:'#78716c', label:'Suspendido'           },
  RECOGER_EQUIPO:     { bg:'#1a0808', text:'#fca5a5', border:'#991b1b', label:'Recoger equipo'       },
  USUARIO_PERDIDO:    { bg:'#111827', text:'#6b7280', border:'#374151', label:'Usuario perdido'      },
  SIN_FECHA:          { bg:'#0d1a2e', text:'#60a5fa', border:'#1d4ed8', label:'Sin fecha'            },
  INHABILITADO:       { bg:'#1a0a1a', text:'#e879f9', border:'#86198f', label:'Inhabilitado'         },
}

// Estados que NUNCA se cambian automaticamente por logica de fechas
export const PROTECTED_CLASSIFICATIONS: readonly string[] = [
  'NOVEDAD_PAGO',
  'NO_PAGA_AUTORIZADO',
  'SUSPENDIDO_TEMP',
  'SUSPENDIDO',
  'RECOGER_EQUIPO',
  'USUARIO_PERDIDO',
  'SIN_FECHA',
  'INHABILITADO',
]

export function getCC(cls: string) {
  return CLASS_CONFIG[cls as Classification]
    ?? { bg:'#111827', text:'#6b7280', border:'#374151', label: cls || 'Sin estado' }
}

export function isProtected(cls: string): boolean {
  return PROTECTED_CLASSIFICATIONS.includes(cls)
}

/**
 * Calcula la clasificacion automatica de un cliente segun:
 * - su dia de pago mensual (dia_pago)
 * - la fecha de su ultimo pago registrado (lastPaymentDate)
 * - la fecha actual
 *
 * Reglas:
 *   Pago este ciclo, faltan > 5 dias  => AL_DIA
 *   Pago este ciclo, faltan 1-5 dias  => PROXIMO_PAGAR
 *   Sin pago, 0-3 dias desde vencto   => PROXIMO_PAGAR (gracia)
 *   Sin pago, 4-59 dias               => DEUDA_PENDIENTE
 *   Sin pago, 60+ dias                => RECOGER_EQUIPO
 */
export function computeAutoClassification(
  currentClassification: string,
  diaPago: string,
  lastPaymentDate: string | null
): string {
  if (isProtected(currentClassification)) return currentClassification

  const payDay = parseInt(diaPago)
  if (!diaPago || isNaN(payDay) || payDay < 1 || payDay > 31) {
    return 'SIN_FECHA'
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayDay = today.getDate()

  // Ultima fecha de pago esperada
  const lastDue = todayDay >= payDay
    ? new Date(today.getFullYear(), today.getMonth(), payDay)
    : new Date(today.getFullYear(), today.getMonth() - 1, payDay)

  const daysSinceDue = Math.floor(
    (today.getTime() - lastDue.getTime()) / 86_400_000
  )

  // Pago desde el ultimo vencimiento?
  const hasPaid = lastPaymentDate
    ? new Date(lastPaymentDate) >= lastDue
    : false

  if (hasPaid) {
    const nextDue = todayDay >= payDay
      ? new Date(today.getFullYear(), today.getMonth() + 1, payDay)
      : new Date(today.getFullYear(), today.getMonth(), payDay)
    const daysUntilNext = Math.floor(
      (nextDue.getTime() - today.getTime()) / 86_400_000
    )
    return daysUntilNext <= 5 ? 'PROXIMO_PAGAR' : 'AL_DIA'
  }

  // Sin pago - clasificar por mora
  if (daysSinceDue <= 3)  return 'PROXIMO_PAGAR'
  if (daysSinceDue < 60)  return 'DEUDA_PENDIENTE'
  return 'RECOGER_EQUIPO'
}
