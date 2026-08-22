import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const result = await db.execute(
      'SELECT * FROM technicians ORDER BY name ASC'
    );
    return NextResponse.json({ technicians: result.rows });
  } catch (e) {
    console.error('[GET /api/technicians]', e);
    return NextResponse.json({ error: 'Error al obtener técnicos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const {
      name, cedula, phone, cellphone, email,
      photo_url, role, specialty, status, notes
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const result = await db.execute({
      sql: `INSERT INTO technicians
              (name, cedula, phone, cellphone, email, photo_url, role, specialty, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        name.trim(),
        cedula || '',
        phone || '',
        cellphone || '',
        email || '',
        photo_url || '',
        role || 'Técnico',
        specialty || '',
        status || 'active',
        notes || ''
      ]
    });

    return NextResponse.json({
      id: result.lastInsertRowid?.toString() ?? '0',
      message: 'Técnico creado exitosamente'
    }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/technicians]', e);
    return NextResponse.json({ error: 'Error al crear técnico' }, { status: 500 });
  }
}
