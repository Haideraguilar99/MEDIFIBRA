import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

const CRON_SECRET = process.env.CRON_SECRET

// ─── Autenticación ───────────────────────────────────────────────────────────
function isAuthorized(req: NextRequest): boolean {
  // Opción A: header Bearer (cron automático / curl)
  const authHeader = req.headers.get('authorization')
  if (authHeader && CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
    return true
  }
  // Opción B: cookie admin (ejecución manual desde panel)
  const cookie = req.cookies.get('mf_token')
  if (cookie?.value) {
    return true
  }
  return false
}

// ─── Lógica de período ───────────────────────────────────────────────────────
// Retorna el período del mes anterior en formato YYYY-MM
// Ej: si hoy es 2026-11-04 → retorna '2026-10'
function getPreviousPeriod(today: Date): string {
  const year  = today.getFullYear()
  const month = today.getMonth() // 0-based: nov=10
  if (month === 0) {
    return `${year - 1}-12`
  }
  const prevMonth = month.toString().padStart(2, '0')
  return `${year}-${prevMonth}`
}

// ─── Validación de día de ejecución ─────────────────────────────────────────
// Solo permite ejecución el día 4 del mes, salvo que se fuerce con ?force=true
function isValidExecutionDay(today: Date, force: boolean): boolean {
  if (force) return true
  return today.getDate() === 4
}

// ─── Handler principal ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // 1. Seguridad
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: 'No autorizado' },
      { status: 401 }
    )
  }

  // 2. Validar día de ejecución
  const today      = new Date()
  const forceParam = req.nextUrl.searchParams.get('force') === 'true'

  if (!isValidExecutionDay(today, forceParam)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Este endpoint solo debe ejecutarse el día 4 del mes. Hoy es día ${today.getDate()}. Usa ?force=true para forzar.`,
        today: today.toISOString(),
      },
      { status: 400 }
    )
  }

  // 3. Determinar período a cerrar
  const previousPeriod = getPreviousPeriod(today)

  const db = getDb()

  try {
    // 4. Diagnóstico previo: contar registros afectables
    const [diagPaid, diagPending, diagAlready] = await Promise.all([
      db.execute({
        sql: `SELECT COUNT(*) as total FROM payments
              WHERE period = ? AND status = 'paid' AND archived = 0`,
        args: [previousPeriod],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as total FROM payments
              WHERE period = ? AND status = 'pending' AND archived = 0`,
        args: [previousPeriod],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as total FROM payments
              WHERE period = ? AND archived = 1`,
        args: [previousPeriod],
      }),
    ])

    const countPaid    = Number(diagPaid.rows[0]?.total    ?? 0)
    const countPending = Number(diagPending.rows[0]?.total ?? 0)
    const alreadyDone  = Number(diagAlready.rows[0]?.total ?? 0)

    // 5. Guardia: si ya se ejecutó este mes, informar sin re-ejecutar
    if (alreadyDone > 0 && !forceParam) {
      return NextResponse.json(
        {
          ok: false,
          error: `El corte del período ${previousPeriod} ya fue ejecutado. Se encontraron ${alreadyDone} registros archivados. Usa ?force=true para re-ejecutar.`,
          period: previousPeriod,
          already_archived: alreadyDone,
          executed_at: today.toISOString(),
        },
        { status: 400 }
      )
    }

    // 6. Ejecutar cierre en batch atómico
    // Operación única: archivar TODOS los pagos del período anterior (paid + pending)
    const batchResult = await db.batch([
      {
        // 6a. Archivar pagos confirmados del período anterior
        sql: `UPDATE payments
              SET archived = 1
              WHERE period = ? AND status = 'paid' AND archived = 0`,
        args: [previousPeriod],
      },
      {
        // 6b. Archivar pagos pendientes del período anterior
        //     (deudas que no se cobraron — quedan como registro histórico)
        sql: `UPDATE payments
              SET archived = 1
              WHERE period = ? AND status = 'pending' AND archived = 0`,
        args: [previousPeriod],
      },
    ])

    // 7. Extraer filas afectadas de cada operación del batch
    const archivedPaid    = Number(batchResult[0]?.rowsAffected ?? 0)
    const archivedPending = Number(batchResult[1]?.rowsAffected ?? 0)
    const totalArchived   = archivedPaid + archivedPending

    // 8. Verificación post-ejecución
    const verify = await db.execute({
      sql: `SELECT COUNT(*) as remaining FROM payments
            WHERE period = ? AND archived = 0`,
      args: [previousPeriod],
    })
    const remaining = Number(verify.rows[0]?.remaining ?? 0)

    // 9. Respuesta estructurada
    return NextResponse.json(
      {
        ok: true,
        message: `Corte del período ${previousPeriod} ejecutado correctamente.`,
        executed_at: today.toISOString(),
        period_closed: previousPeriod,
        forced: forceParam,
        summary: {
          paid_archived:    archivedPaid,
          pending_archived: archivedPending,
          total_archived:   totalArchived,
          remaining_active: remaining,
        },
        diagnostics: {
          pre_execution: {
            paid_to_archive:    countPaid,
            pending_to_archive: countPending,
            already_archived:   alreadyDone,
          },
        },
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[corte-mensual] Error:', message)
    return NextResponse.json(
      {
        ok: false,
        error: 'Error interno al ejecutar el corte mensual.',
        detail: message,
        period: previousPeriod,
        executed_at: today.toISOString(),
      },
      { status: 500 }
    )
  }
}
