import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { safeError } from '@/lib/errors'
export const dynamic = 'force-dynamic'

// Valores permitidos para validación
const PLANES_VALIDOS = ['FIBRA 50 MBPS','FIBRA 100 MBPS','FIBRA 150 MBPS','FIBRA 200 MBPS','FIBRA 300 MBPS','FIBRA 500 MBPS']
const DIAS_VALIDOS   = ['','1','5','10','12','15','20','25','30']
const STATUS_VALIDOS = ['active','inactive']
const IMPORT_MAX     = 1000  // máximo registros por importación

export async function POST(req: NextRequest) {
  try {
    // Autenticación obligatoria — solo admin puede importar
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Validar Content-Type
    const ct = req.headers.get('content-type')
    if (!ct?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type debe ser application/json' }, { status: 415 })
    }

    const body = await req.json()
    const { clients } = body

    if (!Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json({ error: 'Sin datos' }, { status: 400 })
    }

    // Límite de volumen — previene abuso de recursos en Turso
    if (clients.length > IMPORT_MAX) {
      return NextResponse.json(
        { error: `Máximo ${IMPORT_MAX} registros por importación. Recibidos: ${clients.length}` },
        { status: 400 }
      )
    }

    let inserted = 0
    let skipped  = 0
    const errors: string[] = []

    for (const c of clients) {
      // Validaciones obligatorias
      if (!c.name || !c.cellphone || !c.plan) {
        skipped++
        continue
      }

      // Validar longitud máxima de campos de texto
      if (String(c.name).length > 100 || String(c.cellphone).length > 20) {
        errors.push(`${c.name}: nombre o celular demasiado largo`)
        skipped++
        continue
      }

      // Validar formato de celular colombiano (7-10 dígitos)
      if (!/^[0-9]{7,10}$/.test(String(c.cellphone).trim())) {
        errors.push(`${c.name}: formato de celular inválido (${c.cellphone})`)
        skipped++
        continue
      }

      // Validar plan_value — debe ser positivo
      const planValue = Number(c.plan_value ?? 0)
      if (isNaN(planValue) || planValue < 0) {
        errors.push(`${c.name}: plan_value inválido (${c.plan_value})`)
        skipped++
        continue
      }

      // Validar dia_pago si se proporciona
      const diaPago = String(c.dia_pago ?? '')
      if (!DIAS_VALIDOS.includes(diaPago)) {
        errors.push(`${c.name}: dia_pago inválido (${c.dia_pago})`)
        skipped++
        continue
      }

      // Validar status si se proporciona
      const status = String(c.status ?? 'active')
      if (!STATUS_VALIDOS.includes(status)) {
        errors.push(`${c.name}: status inválido (${c.status})`)
        skipped++
        continue
      }

      // Clasificación inicial según regla de negocio definitiva
      const classification = diaPago ? 'AL_DIA' : 'SIN_FECHA'

      try {
        await db.execute({
          sql: `INSERT INTO clients
                  (name, email, phone, cellphone, address, city, neighborhood, commune,
                   consumption_date, payment_date, plan, plan_value, reference,
                   status, notes, dia_pago, classification)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          args: [
            String(c.name).trim(),
            String(c.email        ?? ''),
            String(c.phone        ?? ''),
            String(c.cellphone).trim(),
            String(c.address      ?? ''),
            String(c.city         ?? ''),
            String(c.neighborhood ?? ''),
            String(c.commune      ?? ''),
            String(c.consumption_date ?? ''),
            String(c.payment_date     ?? ''),
            String(c.plan).trim(),
            planValue,
            String(c.reference    ?? ''),
            status,
            String(c.notes        ?? ''),
            diaPago,
            classification,
          ]
        })
        inserted++
      } catch (e) {
        // Log real en servidor, mensaje genérico en respuesta
        console.error(`[import] Error insertando ${c.name}:`, e)
        errors.push(`${c.name}: error al insertar registro`)
      }
    }

    return NextResponse.json({ inserted, skipped, errors })
  } catch (error) {
    console.error('[import] Error general:', error)
    return NextResponse.json({ error: safeError(error) }, { status: 500 })
  }
}
