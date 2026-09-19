import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const r = await db.execute({ sql: 'SELECT * FROM clients WHERE id=?', args: [id] })
    if (!r.rows[0]) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    return NextResponse.json({ client: r.rows[0] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const b = await req.json()
    // Leer estado actual — sin esto, campos ausentes llegan undefined y Turso falla
    const cur = await db.execute({ sql: 'SELECT * FROM clients WHERE id=?', args: [id] })
    if (!cur.rows[0]) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = cur.rows[0] as any
    await db.execute({
      sql: `UPDATE clients SET
              name=?,email=?,phone=?,cellphone=?,address=?,city=?,neighborhood=?,commune=?,
              consumption_date=?,payment_date=?,plan=?,plan_value=?,reference=?,
              status=?,classification=?,notes=?,
              cedula=?,punto_referencia=?,foto_fachada=?,telefono_alternativo=?,
              fecha_instalacion=?,incluye_tv=?,dia_pago=?,referido_nombre=?,referido_telefono=?
            WHERE id=?`,
      args: [
        b.name             ?? c.name             ?? '',
        b.email            ?? c.email            ?? '',
        b.phone            ?? c.phone            ?? '',
        b.cellphone        ?? c.cellphone        ?? '',
        b.address          ?? c.address          ?? '',
        b.city             ?? c.city             ?? '',
        b.neighborhood     ?? c.neighborhood     ?? '',
        b.commune          ?? c.commune          ?? '',
        b.consumption_date ?? c.consumption_date ?? '',
        b.payment_date     ?? c.payment_date     ?? '',
        b.plan             ?? c.plan             ?? '',
        b.plan_value       ?? c.plan_value       ?? 0,
        b.reference        ?? c.reference        ?? '',
        b.status           ?? c.status           ?? 'active',
        b.classification   ?? c.classification   ?? 'AL_DIA',
        b.notes            ?? c.notes            ?? '',
        b.cedula           ?? c.cedula           ?? '',
        b.punto_referencia     ?? c.punto_referencia     ?? '',
        b.foto_fachada         ?? c.foto_fachada         ?? '',
        b.telefono_alternativo ?? c.telefono_alternativo ?? '',
        b.fecha_instalacion    ?? c.fecha_instalacion    ?? '',
        b.incluye_tv !== undefined ? b.incluye_tv : (c.incluye_tv ?? 0),
        b.dia_pago         ?? c.dia_pago         ?? '30',
        b.referido_nombre     ?? c.referido_nombre     ?? '',
        b.referido_telefono   ?? c.referido_telefono   ?? '',
        id
      ]
    })
    const updated = await db.execute({ sql: 'SELECT * FROM clients WHERE id=?', args: [id] })
    broadcast('update-client', updated.rows[0])
    return NextResponse.json({ client: updated.rows[0] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    // Verificar que el cliente existe
    const check = await db.execute({ sql: 'SELECT id FROM clients WHERE id=?', args: [id] })
    if (!check.rows[0]) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    // Borrar TODOS los registros relacionados antes del cliente
    // (Turso no ejecuta ON DELETE CASCADE automáticamente sin PRAGMA por conexión)
    await db.execute({ sql: 'DELETE FROM notifications_log WHERE client_id=?', args: [id] })
    await db.execute({ sql: 'DELETE FROM invoices WHERE client_id=?', args: [id] })
    await db.execute({ sql: 'DELETE FROM payments WHERE client_id=?', args: [id] })
    await db.execute({ sql: 'DELETE FROM equipment_records WHERE client_id=?', args: [id] })
    await db.execute({ sql: 'DELETE FROM client_ratings WHERE client_id=?', args: [id] })
    await db.execute({ sql: 'DELETE FROM service_followup WHERE client_id=?', args: [id] })
    await db.execute({ sql: 'DELETE FROM tickets WHERE client_id=?', args: [id] })
    await db.execute({ sql: 'DELETE FROM equipment WHERE client_id=?', args: [id] })
    await db.execute({ sql: 'DELETE FROM streaming_accounts WHERE client_id=?', args: [id] })
    // work_orders: borrar evidencias primero, luego las órdenes
    const orders = await db.execute({ sql: 'SELECT id FROM work_orders WHERE client_id=?', args: [id] })
    for (const row of orders.rows) {
      await db.execute({ sql: 'DELETE FROM service_evidence WHERE work_order_id=?', args: [row.id] })
    }
    await db.execute({ sql: 'DELETE FROM work_orders WHERE client_id=?', args: [id] })
    // Finalmente borrar el cliente
    await db.execute({ sql: 'DELETE FROM clients WHERE id=?', args: [id] })
    broadcast('delete-client', { id })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
