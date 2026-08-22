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
      sql: `SELECT
              wo.*,
              t.name         AS technician_name,
              t.cellphone    AS technician_phone,
              t.role         AS technician_role,
              t.cedula       AS technician_cedula,
              t.photo_url    AS technician_photo,
              c.name         AS client_name,
              c.address      AS client_address,
              c.cellphone    AS client_phone,
              c.plan         AS client_plan,
              c.status       AS client_status,
              c.neighborhood AS client_neighborhood,
              c.commune      AS client_commune,
              c.cedula       AS client_cedula,
              c.punto_referencia AS client_punto_referencia
            FROM work_orders wo
            LEFT JOIN technicians t ON wo.technician_id = t.id
            LEFT JOIN clients     c ON wo.client_id     = c.id
            WHERE wo.id = ?`,
      args: [id]
    });

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ workOrder: result.rows[0] });
  } catch (e) {
    console.error('[GET /api/work-orders/[id]]', e);
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
      technician_id, client_id, task_type, task_description,
      priority, scheduled_date, scheduled_time,
      status, notes, whatsapp_tech_sent, whatsapp_client_sent
    } = body;

    await db.execute({
      sql: `UPDATE work_orders
            SET technician_id=?, client_id=?, task_type=?, task_description=?,
                priority=?, scheduled_date=?, scheduled_time=?, status=?,
                notes=?, whatsapp_tech_sent=?, whatsapp_client_sent=?,
                updated_at=datetime('now')
            WHERE id=?`,
      args: [
        technician_id, client_id, task_type, task_description || '',
        priority || 'normal', scheduled_date || '', scheduled_time || '',
        status || 'pending', notes || '',
        whatsapp_tech_sent ?? 0, whatsapp_client_sent ?? 0,
        id
      ]
    });

    return NextResponse.json({ message: 'Orden actualizada' });
  } catch (e) {
    console.error('[PUT /api/work-orders/[id]]', e);
    return NextResponse.json({ error: 'Error al actualizar orden' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    await db.execute({ sql: 'DELETE FROM work_orders WHERE id=?', args: [id] });
    return NextResponse.json({ message: 'Orden eliminada' });
  } catch (e) {
    console.error('[DELETE /api/work-orders/[id]]', e);
    return NextResponse.json({ error: 'Error al eliminar orden' }, { status: 500 });
  }
}
