import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { safeError } from '@/lib/errors'
export const dynamic = 'force-dynamic'

// Rate limiting en memoria por IP — previene spam de registros
const REG_RATE_LIMIT_MAX = 5
const REG_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hora
const regRateLimitMap = new Map<string, { count: number; firstAttempt: number }>()

function checkRegRateLimit(ip: string): boolean {
  if (!ip || ip === 'unknown') return true // no bloquear si no hay IP
  const now = Date.now()
  const entry = regRateLimitMap.get(ip)
  if (!entry) { regRateLimitMap.set(ip, { count: 1, firstAttempt: now }); return true }
  if (now - entry.firstAttempt > REG_RATE_LIMIT_WINDOW_MS) {
    regRateLimitMap.set(ip, { count: 1, firstAttempt: now }); return true
  }
  if (entry.count >= REG_RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    // Validar Content-Type
    const ct = req.headers.get('content-type')
    if (!ct?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type inválido' }, { status: 415 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'

    // Rate limiting: máx 5 registros por IP por hora
    if (!checkRegRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intente nuevamente en 1 hora.' },
        { status: 429 }
      )
    }

    const b = await req.json()

    // Validaciones obligatorias con longitud máxima
    if (!b.name?.trim() || String(b.name).length > 100)
      return NextResponse.json({ error: 'Nombre requerido (máx 100 caracteres)' }, { status: 400 })
    if (!b.cedula?.trim())
      return NextResponse.json({ error: 'Cédula requerida' }, { status: 400 })
    if (!b.cellphone?.trim())
      return NextResponse.json({ error: 'Celular requerido' }, { status: 400 })
    if (!b.address?.trim() || String(b.address).length > 200)
      return NextResponse.json({ error: 'Dirección requerida (máx 200 caracteres)' }, { status: 400 })

    // Validar formato cédula colombiana: solo dígitos, 6-10 chars
    if (!/^[0-9]{6,10}$/.test(String(b.cedula).trim())) {
      return NextResponse.json({ error: 'Formato de cédula inválido (solo dígitos, 6-10 caracteres)' }, { status: 400 })
    }

    // Validar formato celular colombiano: solo dígitos, 10 chars
    if (!/^[0-9]{10}$/.test(String(b.cellphone).trim())) {
      return NextResponse.json({ error: 'Formato de celular inválido (10 dígitos)' }, { status: 400 })
    }

    // Validar email si se proporciona
    if (b.email && String(b.email).length > 0) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(b.email)) || String(b.email).length > 100) {
        return NextResponse.json({ error: 'Formato de email inválido' }, { status: 400 })
      }
    }

    // Verificar celular duplicado
    const dup = await db.execute({
      sql: 'SELECT id FROM clients WHERE cellphone = ? LIMIT 1',
      args: [b.cellphone.trim()],
    })
    if (dup.rows[0]) {
      return NextResponse.json({
        error: 'Este celular ya está registrado. Contáctanos al 333 728 8745.'
      }, { status: 409 })
    }

    // Verificar cédula duplicada
    const dupCedula = await db.execute({
      sql: 'SELECT id FROM clients WHERE cedula = ? LIMIT 1',
      args: [b.cedula.trim()],
    })
    if (dupCedula.rows[0]) {
      return NextResponse.json({
        error: 'Esta cédula ya está registrada. Contáctanos al 333 728 8745.'
      }, { status: 409 })
    }

    const result = await db.execute({
      sql: `INSERT INTO clients
              (name, email, phone, cellphone, address, city, neighborhood, commune,
               consumption_date, payment_date, plan, plan_value, reference, status,
               classification, notes, cedula, punto_referencia, foto_fachada,
               telefono_alternativo, fecha_instalacion, incluye_tv, dia_pago,
               referido_nombre, referido_telefono, puntos_tv, ip_address)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        b.name.trim(), b.email?.trim() ?? '', b.phone?.trim() ?? '', b.cellphone.trim(),
        b.address.trim(), b.city?.trim() ?? 'Medellín', b.neighborhood?.trim() ?? '', b.commune?.trim() ?? '',
        '', '', '', 0, '', 'active',
        'SIN_FECHA', 'Registro via formulario público', b.cedula.trim(),
        b.punto_referencia?.trim() ?? '', '', b.telefono_alternativo?.trim() ?? '',
        '', 0, '', '', '', 0, ip,
      ],
    })

    const rowId = result.lastInsertRowid?.toString() ?? '0'
    return NextResponse.json({ ok: true, id: rowId }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 })
  }
}
