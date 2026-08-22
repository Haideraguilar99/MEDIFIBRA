import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function buildOrderNumber(id: bigint | number): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `OS-${y}${m}${day}-${String(id).padStart(4, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const techId = searchParams.get('technician_id');
    const status = searchParams.get('status');
    const limit = Number(searchParams.get('limit') ?? 100);

    let sql = `
      SELECT
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
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    if (techId)  { sql += ' AND wo.technician_id = ?'; args.push(techId); }
    if (status)  { sql += ' AND wo.status = ?';        args.push(status); }

    sql += ` ORDER BY wo.created_at DESC LIMIT ?`;
    args.push(limit);

    const result = await db.execute({ sql, args });
    return NextResponse.json({ workOrders: result.rows });
  } catch (e) {
    console.error('[GET /api/work-orders]', e);
    return NextResponse.json({ error: 'Error al obtener órdenes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const {
      technician_id, client_id, task_type,
      task_description, priority,
      scheduled_date, scheduled_time,
      notes, created_by
    } = body;

    if (!technician_id || !client_id || !task_type) {
      return NextResponse.json(
        { error: 'technician_id, client_id y task_type son requeridos' },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: `INSERT INTO work_orders
              (technician_id, client_id, task_type, task_description,
               priority, scheduled_date, scheduled_time, notes, created_by, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      args: [
        technician_id, client_id, task_type,
        task_description || '', priority || 'normal',
        scheduled_date || '', scheduled_time || '',
        notes || '', created_by || 'Mariana'
      ]
    });

    const newId = result.lastInsertRowid ?? BigInt(0);
    const orderNumber = buildOrderNumber(newId);

    await db.execute({
      sql: 'UPDATE work_orders SET order_number=? WHERE id=?',
      args: [orderNumber, newId.toString()]
    });

    return NextResponse.json({
      id: newId.toString(),
      order_number: orderNumber,
      message: 'Orden creada exitosamente'
    }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/work-orders]', e);
    return NextResponse.json({ error: 'Error al crear orden' }, { status: 500 });
  }
}
