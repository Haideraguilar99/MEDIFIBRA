import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const b = await req.json()

    if (!b.name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    if (!b.cedula?.trim()) return NextResponse.json({ error: 'Cédula requerida' }, { status: 400 })
    if (!b.cellphone?.trim()) return NextResponse.json({ error: 'Celular requerido' }, { status: 400 })
    if (!b.address?.trim()) return NextResponse.json({ error: 'Dirección requerida' }, { status: 400 })

    // Verificar celular duplicado
    if (b.cellphone) {
      const dup = await db.execute({
        sql: 'SELECT id, name FROM clients WHERE cellphone = ? LIMIT 1',
        args: [b.cellphone],
      })
      if (dup.rows[0]) {
        return NextResponse.json({
          error: `Este celular ya está registrado. Contáctanos al 333 728 8745.`
        }, { status: 409 })
      }
    }

    const result = await db.execute({
      sql: `INSERT INTO clients
              (name, email, phone, cellphone, address, city, neighborhood, commune,
               consumption_date, payment_date, plan, plan_value, reference, status,
               classification, notes, cedula, punto_referencia, foto_fachada,
               telefono_alternativo, fecha_instalacion, incluye_tv, dia_pago,
               referido_nombre, referido_telefono, puntos_tv)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        b.name.trim(), b.email ?? '', b.phone ?? '', b.cellphone.trim(),
        b.address.trim(), b.city ?? 'Medellín', b.neighborhood ?? '', b.commune ?? '',
        '', '', '', 0, '', 'active',
        'SIN_FECHA', 'Registro via formulario público', b.cedula.trim(),
        b.punto_referencia ?? '', '', b.telefono_alternativo ?? '',
        '', 0, '', '', '', 0,
      ],
    })

    const rowId = result.lastInsertRowid?.toString() ?? '0'
    return NextResponse.json({ ok: true, id: rowId }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
