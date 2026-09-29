// Plantillas de mensajes de WhatsApp por clasificacion.
// Sin emojis ni tildes (regla del proyecto). *texto* = negrita de WhatsApp.

export interface WAClient {
  name?: string | null
  plan?: string | null
  dia_pago?: string | number | null
  classification?: string | null
}

const EMPRESA  = 'Medifibra S.A.S'
const WHATSAPP = '333 728 8745'
const CUENTA   = '00995202514'

// ---- OBSERVACION TEMPORAL: ajuste de tarifas octubre 2026 ----
// Para retirarla: OBSERVACION_ACTIVA = false (o borrar este bloque).
const OBSERVACION_ACTIVA = true
const OBSERVACION =
  '*Observacion:* a partir de octubre se realizara un ajuste minimo en el valor de nuestros planes de internet, con el fin de seguir fortaleciendo la calidad de nuestros servicios y mejorar nuestra atencion. Agradecemos tu comprension y confianza en MEDIFIBRA.'
const CLASES_CON_OBSERVACION: readonly string[] = [
  'AL_DIA',
  'PROXIMO_PAGAR',
  'RECORDAR_RECIBO',
  'DEUDA_PENDIENTE',
  'NO_PAGA_AUTORIZADO',
  'SIN_FECHA',
]

interface Ctx { plan: string; monto: string; fechaPago: string }
interface Plantilla { asunto: string; saludo?: 'formal'; cuerpo: string[] }

const MEDIOS = `Medios de pago: Bancolombia (cuenta de ahorros) o Bre-B, ${CUENTA}`

const MINUSCULAS = ['de', 'del', 'la', 'las', 'los', 'y']

export function nombreLimpio(raw?: string | null): string {
  const limpio = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!limpio) return 'Cliente'
  return limpio
    .toLowerCase()
    .split(' ')
    .map((p, i) => (i > 0 && MINUSCULAS.includes(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')
}

const PLANTILLAS: Record<string, (c: Ctx) => Plantilla> = {
  AL_DIA: c => ({
    asunto: 'Pago confirmado',
    cuerpo: [
      'Recibimos y verificamos tu pago. Tu servicio se encuentra *AL DIA*.',
      '',
      `Plan: ${c.plan}`,
      `Proximo pago: ${c.fechaPago}`,
      `Valor: ${c.monto}`,
      '',
      'Recuerda enviar tu comprobante a este WhatsApp cuando realices tu proximo pago. Gracias por tu puntualidad.',
    ],
  }),

  PROXIMO_PAGAR: c => ({
    asunto: 'Recordatorio de pago',
    cuerpo: [
      'Te recordamos que tu fecha de pago se aproxima.',
      '',
      `Plan: ${c.plan}`,
      `Fecha de pago: ${c.fechaPago}`,
      `Valor a pagar: ${c.monto}`,
      '',
      MEDIOS,
      'Una vez pagues, envianos el comprobante a este WhatsApp para registrarlo.',
    ],
  }),

  RECORDAR_RECIBO: () => ({
    asunto: 'Comprobante pendiente',
    cuerpo: [
      'Aun no hemos recibido tu comprobante de pago.',
      '',
      'Por favor envianos la foto o captura del comprobante a este WhatsApp para actualizar tu cuenta. Una vez recibido, confirmamos tu estado en minutos.',
    ],
  }),

  DEUDA_PENDIENTE: c => ({
    asunto: 'Pago pendiente',
    cuerpo: [
      'Registramos un pago pendiente en tu servicio de internet.',
      '',
      `Plan: ${c.plan}`,
      `Fecha de pago: ${c.fechaPago}`,
      `Valor adeudado: ${c.monto}`,
      '',
      'Si no regularizas tu pago pronto, tu servicio sera suspendido. Realiza tu pago y envia el comprobante a este WhatsApp. Si ya pagaste, compartenoslo para verificarlo.',
      '',
      MEDIOS,
    ],
  }),

  NOVEDAD_PAGO: () => ({
    asunto: 'Novedad en tu pago',
    cuerpo: [
      'Identificamos una novedad en tu pago que esta siendo revisada por nuestro equipo de cartera.',
      '',
      'Si ya realizaste algun pago, envianos el comprobante a este WhatsApp. Ante cualquier duda, escribenos por este medio.',
    ],
  }),

  NO_PAGA_AUTORIZADO: c => ({
    asunto: 'Confirmacion de acuerdo de pago',
    cuerpo: [
      'Confirmamos que tu cuenta tiene un acuerdo especial de pago previamente autorizado.',
      '',
      `Plan: ${c.plan}`,
      `Valor: ${c.monto}`,
      '',
      'Tu servicio continua activo con normalidad. Cuando llegue la fecha acordada, recuerda enviar tu comprobante a este WhatsApp.',
    ],
  }),

  SUSPENDIDO_TEMP: c => ({
    asunto: 'Servicio suspendido temporalmente',
    cuerpo: [
      'Tu servicio esta suspendido temporalmente por una situacion registrada en tu cuenta.',
      '',
      `Valor del plan: ${c.monto}`,
      '',
      'Para coordinar la reactivacion, escribenos por este WhatsApp.',
    ],
  }),

  SUSPENDIDO: c => ({
    asunto: 'Servicio suspendido',
    cuerpo: [
      'Tu servicio de internet esta *SUSPENDIDO* por falta de pago.',
      '',
      `Total a pagar para reactivar: ${c.monto}`,
      '',
      'Para reactivarlo:',
      '1. Realiza tu pago por el valor indicado.',
      '2. Envia el comprobante a este WhatsApp.',
      '3. Tu servicio sera reactivado en maximo 2 horas habiles.',
      '',
      MEDIOS,
      '',
      'Recuerda que a los 60 dias de suspension se procede al retiro de los equipos instalados.',
    ],
  }),

  RECOGER_EQUIPO: c => ({
    asunto: 'Aviso de retiro de equipos',
    saludo: 'formal',
    cuerpo: [
      'Han pasado mas de 60 dias desde la suspension de tu servicio sin que se regularice el pago pendiente.',
      '',
      'De acuerdo con nuestra politica de servicio, procederemos al *RETIRO DE LOS EQUIPOS* instalados en tu domicilio. La no entrega de los equipos en la visita tecnica generara multas y cargos adicionales.',
      '',
      `Deuda total actual: ${c.monto}`,
      '',
      'Si deseas regularizar tu situacion antes de la visita, escribenos con urgencia a este WhatsApp.',
    ],
  }),

  USUARIO_PERDIDO: () => ({
    asunto: 'Cierre de cuenta',
    saludo: 'formal',
    cuerpo: [
      'Tu cuenta de servicio con nosotros ha sido cerrada. Lamentamos no haber podido continuar atendiendote.',
      '',
      'Si en algun momento deseas volver a contratar nuestros servicios, estaremos disponibles para atenderte con gusto.',
    ],
  }),

  SIN_FECHA: c => ({
    asunto: 'Falta tu fecha de pago',
    cuerpo: [
      'Tu cuenta esta activa, pero aun no tenemos registrada tu fecha de pago mensual.',
      '',
      `Plan: ${c.plan}`,
      `Valor: ${c.monto}`,
      '',
      'Escribenos para definir tu dia de pago y mantener tu servicio al dia.',
    ],
  }),

  INHABILITADO: () => ({
    asunto: 'Servicio inhabilitado',
    cuerpo: [
      'Tu servicio de internet se encuentra inhabilitado.',
      '',
      'Para mas informacion o para solicitar su reactivacion, escribenos por este WhatsApp.',
    ],
  }),
}

const GENERICA = (c: Ctx): Plantilla => ({
  asunto: 'Tu servicio de internet',
  cuerpo: [
    'Te escribimos en relacion con tu servicio de internet.',
    '',
    `Plan: ${c.plan}`,
    `Valor: ${c.monto}`,
    '',
    'Para cualquier consulta, escribenos por este WhatsApp.',
  ],
})

export function buildWAMessage(cl: WAClient, monto: string): string {
  const cls = cl.classification || ''
  const ctx: Ctx = {
    plan: cl.plan || 'tu plan',
    monto,
    fechaPago: cl.dia_pago ? `el dia ${cl.dia_pago} de cada mes` : 'la fecha acordada',
  }
  const nombre = nombreLimpio(cl.name)
  const p = (PLANTILLAS[cls] ?? GENERICA)(ctx)
  const saludo = p.saludo === 'formal' ? `Estimado(a) ${nombre},` : `Hola ${nombre},`

  const partes = [`*${EMPRESA.toUpperCase()}* | ${p.asunto}`, '', saludo, '', ...p.cuerpo]
  if (OBSERVACION_ACTIVA && CLASES_CON_OBSERVACION.includes(cls)) partes.push('', OBSERVACION)
  partes.push('', `${EMPRESA} | ${WHATSAPP}`)
  return partes.join('\n')
}

// ---- Mensajes de Cobros y Facturas (misma marca, medios de pago y observacion) ----
function cierreComun(): string[] {
  const out: string[] = []
  if (OBSERVACION_ACTIVA) out.push('', OBSERVACION)
  out.push('', `${EMPRESA} | ${WHATSAPP}`)
  return out
}

export function mensajeCobro(nombre?: string | null, plan?: string | null, monto?: string): string {
  return [
    `*${EMPRESA.toUpperCase()}* | Recordatorio de cobro`,
    '',
    `Hola ${nombreLimpio(nombre)},`,
    '',
    'Te recordamos que tienes un pago pendiente en tu servicio de internet.',
    '',
    `Plan: ${plan || 'tu plan'}`,
    `Valor: ${monto ?? ''}`,
    '',
    MEDIOS,
    'Envianos el comprobante a este WhatsApp una vez realices el pago.',
    ...cierreComun(),
  ].join('\n')
}

export function mensajeFactura(
  nombre: string | null | undefined,
  plan: string | null | undefined,
  monto: string,
  periodo: string,
  linkFactura: string,
  diaPago?: string | number | null,
): string {
  return [
    `*${EMPRESA.toUpperCase()}* | Factura de servicio`,
    '',
    `Hola ${nombreLimpio(nombre)},`,
    '',
    `Te enviamos tu factura correspondiente al periodo ${periodo}.`,
    '',
    `Plan: ${plan || 'tu plan'}`,
    `Valor: ${monto}`,
    '',
    `Ver factura: ${linkFactura}`,
    '',
    diaPago ? `Realiza tu pago antes del dia ${diaPago} de este mes.` : 'Realiza tu pago en la fecha acordada.',
    MEDIOS,
    ...cierreComun(),
  ].join('\n')
}
