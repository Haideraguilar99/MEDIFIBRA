import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT * FROM technicians WHERE id = ?',
      args: [id]
    });
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Técnico no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ technician: result.rows[0] });
  } catch (e) {
    console.error('[GET /api/technicians/[id]]', e);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await req.json();
    const {
      name, cedula, phone, cellphone, email,
      photo_url, role, specialty, status, notes
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    await db.execute({
      sql: `UPDATE technicians
            SET name=?, cedula=?, phone=?, cellphone=?, email=?,
                photo_url=?, role=?, specialty=?, status=?, notes=?
            WHERE id=?`,
      args: [
        name.trim(), cedula || '', phone || '', cellphone || '', email || '',
        photo_url || '', role || 'Técnico', specialty || '', status || 'active',
        notes || '', id
      ]
    });

    return NextResponse.json({ message: 'Técnico actualizado' });
  } catch (e) {
    console.error('[PUT /api/technicians/[id]]', e);
    return NextResponse.json({ error: 'Error al actualizar técnico' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    // Verificar si tiene órdenes activas
    const active = await db.execute({
      sql: `SELECT COUNT(*) as c FROM work_orders
            WHERE technician_id = ? AND status IN ('pending','in_progress')`,
      args: [id]
    });
    const count = Number((active.rows[0] as unknown as { c: number }).c ?? 0);
    if (count > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: tiene ${count} orden(es) activa(s)` },
        { status: 409 }
      );
    }

    await db.execute({ sql: 'DELETE FROM technicians WHERE id=?', args: [id] });
    return NextResponse.json({ message: 'Técnico eliminado' });
  } catch (e) {
    console.error('[DELETE /api/technicians/[id]]', e);
    return NextResponse.json({ error: 'Error al eliminar técnico' }, { status: 500 });
  }
}
