import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// MEDIFIBRA — Cron de auto-clasificación diaria v8.15
// Ejecuta: 05:00 AM hora Colombia (UTC-5 = 10:00 AM UTC)
// Reglas:
//   AL_DIA          → PROXIMO_PAGAR   faltan ≤3 días para dia_pago
//   PROXIMO_PAGAR   → SUSPENDIDO_TEMP ya pasó dia_pago (día 4+ sin pagar)
//   SUSPENDIDO_TEMP → RECOGER_EQUIPO  pasó el siguiente ciclo (~30 días después)
// Estados NUNCA tocados por este cron:
//   NOVEDAD_PAGO, NO_PAGA_AUTORIZADO, SUSPENDIDO, RECOGER_EQUIPO,
//   USUARIO_PERDIDO, SIN_FECHA, INHABILITADO, DEUDA_PENDIENTE, RECORDAR_RECIBO
// ─────────────────────────────────────────────────────────────────────────────

const PROTECTED = new Set([
  'NOVEDAD_PAGO', 'NO_PAGA_AUTORIZADO', 'SUSPENDIDO',
  'RECOGER_EQUIPO', 'USUARIO_PERDIDO', 'SIN_FECHA',
  'INHABILITADO', 'DEUDA_PENDIENTE', 'RECORDAR_RECIBO',
])

interface ClientRow {
  id: number
  classification: string
  dia_pago: string | null
  status: string
  last_payment_date: string | null
}

interface UpdateResult {
  id: number
  from: string
  to: string
  dia_pago: string
  reason: string
}

function calcClassification(
  client: ClientRow,
  today: Date
): { newClass: string; reason: string } | null {
  const current = client.classification

  // Estados protegidos: nunca tocar
  if (PROTECTED.has(current)) return null

  // Sin dia_pago: pasar a SIN_FECHA si no está ya
  if (!client.dia_pago || client.dia_pago.trim() === '') {
    if (current !== 'SIN_FECHA') {
      return { newClass: 'SIN_FECHA', reason: 'sin dia_pago registrado' }
    }
    return null
  }

  const payDay = parseInt(client.dia_pago, 10)
  if (isNaN(payDay) || payDay < 1 || payDay > 31) {
    if (current !== 'SIN_FECHA') {
      return { newClass: 'SIN_FECHA', reason: 'dia_pago invalido: ' + client.dia_pago }
    }
    return null
  }

  const todayYear  = today.getFullYear()
  const todayMonth = today.getMonth()      // 0-based
  const todayDay   = today.getDate()

  // ── Fecha de vencimiento del ciclo actual ──
  // Si hoy es día 10 y paga el día 5 → ya venció este mes → dueDate = 5 de este mes
  // Si hoy es día 3  y paga el día 5 → todavía no vence  → dueDate = 5 de este mes
  let dueYear  = todayYear
  let dueMonth = todayMonth
  let dueDay   = payDay

  // Ajustar día si el mes no tiene ese día (ej: día 31 en febrero → último día del mes)
  const maxDay = new Date(dueYear, dueMonth + 1, 0).getDate()
  if (dueDay > maxDay) dueDay = maxDay

  const dueDate = new Date(dueYear, dueMonth, dueDay)
  dueDate.setHours(0, 0, 0, 0)

  // Días transcurridos desde el vencimiento (negativo = aún no vence)
  const msPerDay = 86_400_000
  const daysSinceDue = Math.floor((today.getTime() - dueDate.getTime()) / msPerDay)

  // ── ¿Pagó en este ciclo? ──
  // Considera que pagó si hay un pago desde el inicio del ciclo anterior
  // (dia_pago del mes pasado hasta hoy)
  let cycleStart: Date
  if (todayDay >= payDay) {
    // El ciclo empezó este mes en dia_pago
    cycleStart = new Date(todayYear, todayMonth, dueDay)
  } else {
    // El ciclo empezó el mes pasado en dia_pago
    const prevMonth = todayMonth === 0 ? 11 : todayMonth - 1
    const prevYear  = todayMonth === 0 ? todayYear - 1 : todayYear
    const prevMaxDay = new Date(prevYear, prevMonth + 1, 0).getDate()
    const prevDueDay = Math.min(payDay, prevMaxDay)
    cycleStart = new Date(prevYear, prevMonth, prevDueDay)
  }
  cycleStart.setHours(0, 0, 0, 0)

  const hasPaidThisCycle = client.last_payment_date
    ? new Date(client.last_payment_date) >= cycleStart
    : false

  // ── REGLA 1: Si pagó este ciclo → AL_DIA o PROXIMO_PAGAR ──
  if (hasPaidThisCycle) {
    // Calcular próxima fecha de vencimiento
    let nextDueMonth = todayDay >= payDay ? todayMonth + 1 : todayMonth
    let nextDueYear  = todayYear
    if (nextDueMonth > 11) { nextDueMonth = 0; nextDueYear++ }
    const nextMaxDay = new Date(nextDueYear, nextDueMonth + 1, 0).getDate()
    const nextDueDay = Math.min(payDay, nextMaxDay)
    const nextDue = new Date(nextDueYear, nextDueMonth, nextDueDay)
    nextDue.setHours(0, 0, 0, 0)
    const daysUntilNext = Math.floor((nextDue.getTime() - today.getTime()) / msPerDay)

    if (daysUntilNext <= 3 && current !== 'PROXIMO_PAGAR') {
      return { newClass: 'PROXIMO_PAGAR', reason: `pago OK, faltan ${daysUntilNext} dias para proximo vencimiento` }
    }
    if (daysUntilNext > 3 && current !== 'AL_DIA') {
      return { newClass: 'AL_DIA', reason: `pago registrado este ciclo, faltan ${daysUntilNext} dias` }
    }
    return null
  }

  // ── Sin pago este ciclo ──

  // RECOGER_EQUIPO ya es protegido — no llega aquí si ya estaba en ese estado

  // REGLA 2: SUSPENDIDO_TEMP → RECOGER_EQUIPO
  // Condición: está en SUSPENDIDO_TEMP Y han pasado ≥30 días desde el vencimiento
  // (día vencimiento + 30 días = ~2 meses desde que debió pagar)
  if (current === 'SUSPENDIDO_TEMP') {
    if (daysSinceDue >= 30) {
      return {
        newClass: 'RECOGER_EQUIPO',
        reason: `${daysSinceDue} dias sin pagar desde vencimiento dia ${payDay}`
      }
    }
    return null  // Sigue en SUSPENDIDO_TEMP
  }

  // REGLA 3: AL_DIA / PROXIMO_PAGAR → SUSPENDIDO_TEMP
  // Condición: pasó la fecha de pago (daysSinceDue > 3 = día 4 sin pagar)
  if (current === 'AL_DIA' || current === 'PROXIMO_PAGAR') {
    if (daysSinceDue > 3) {
      return {
        newClass: 'SUSPENDIDO_TEMP',
        reason: `${daysSinceDue} dias sin pagar desde vencimiento dia ${payDay}`
      }
    }
    // Faltan ≤3 días: PROXIMO_PAGAR
    if (daysSinceDue <= 0 && Math.abs(daysSinceDue) <= 3) {
      // daysUntilDue = -daysSinceDue
      const daysUntilDue = -daysSinceDue
      if (current !== 'PROXIMO_PAGAR') {
        return { newClass: 'PROXIMO_PAGAR', reason: `faltan ${daysUntilDue} dias para vencimiento dia ${payDay}` }
      }
    }
    return null
  }

  return null
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const db = getDb()

    // Obtener todos los clientes activos con su último pago
    const result = await db.execute(`
      SELECT
        c.id,
        c.classification,
        c.dia_pago,
        c.status,
        MAX(p.created_at) AS last_payment_date
      FROM clients c
      LEFT JOIN payments p ON p.client_id = c.id AND p.status = 'paid'
      WHERE c.status = 'active'
      GROUP BY c.id
    `)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const updates: UpdateResult[] = []
    const errors: string[] = []

    for (const row of result.rows) {
      const client: ClientRow = {
        id:                Number(row.id),
        classification:    String(row.classification ?? ''),
        dia_pago:          row.dia_pago ? String(row.dia_pago) : null,
        status:            String(row.status ?? 'active'),
        last_payment_date: row.last_payment_date ? String(row.last_payment_date) : null,
      }

      try {
        const change = calcClassification(client, today)
        if (!change) continue

        await db.execute({
          sql: 'UPDATE clients SET classification = ? WHERE id = ?',
          args: [change.newClass, client.id]
        })

        updates.push({
          id:      client.id,
          from:    client.classification,
          to:      change.newClass,
          dia_pago: client.dia_pago ?? '',
          reason:  change.reason,
        })
      } catch (clientErr) {
        errors.push(`cliente ${client.id}: ${String(clientErr)}`)
      }
    }

    const summary = {
      ok:           true,
      executed_at:  new Date().toISOString(),
      total_clients: result.rows.length,
      total_updated: updates.length,
      updates,
      errors,
    }

    console.log(`[cron/clasificar] ${updates.length} clientes actualizados de ${result.rows.length} totales`)
    if (errors.length) console.error('[cron/clasificar] errores:', errors)

    return NextResponse.json(summary)
  } catch (e) {
    console.error('[cron/clasificar] error fatal:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
