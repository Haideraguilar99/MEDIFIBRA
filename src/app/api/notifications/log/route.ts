import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const b = await req.json()

    if (!b.client_id || !b.channel || !b.type) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: client_id, channel, type' },
        { status: 400 }
      )
    }

    const result = await db.execute({
      sql: `INSERT INTO notifications_log
              (client_id, channel, type, message, status, sent_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        b.client_id,
        b.channel,
        b.type,
        b.message ?? '',
        b.status ?? 'sent',
      ],
    })

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid?.toString() ?? '0',
    })
  } catch (error) {
    console.error('[notifications/log] Error:', error)
    return NextResponse.json(
      { error: 'Error al registrar la notificación', detail: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const result = await db.execute(`
      SELECT nl.*, c.name as client_name, c.cellphone
      FROM notifications_log nl
      LEFT JOIN clients c ON c.id = nl.client_id
      ORDER BY nl.sent_at DESC
      LIMIT 100
    `)
    return NextResponse.json({ logs: result.rows, total: result.rows.length })
  } catch (error) {
    console.error('[notifications/log] GET Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
