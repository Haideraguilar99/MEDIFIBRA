import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { computeClassification } from '@/lib/classification'
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await db.execute(`
      SELECT p.*, c.name as client_name, c.plan, c.cellphone
      FROM payments p
      LEFT JOIN clients c ON p.client_id = c.id
      ORDER BY p.created_at DESC`)
    const stats = await db.execute(`
      SELECT
        COUNT(*) as total,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status='paid'    THEN amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status='pending' THEN amount ELSE 0 END) as pending_amount
      FROM payments`)
    return NextResponse.json({ payments: result.rows, stats: stats.rows[0] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.client_id || !body.amount || !body.period) {
      return NextResponse.json(
        { error: 'client_id, amount y period son requeridos' },
        { status: 400 }
      )
    }

    const payStatus = body.status ?? 'paid'

    // ── Insertar el pago ──────────────────────────────────────────────────
    const result = await db.execute({
      sql: `INSERT INTO payments (client_id, amount, period, method, status, notes)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        body.client_id,
        body.amount,
        body.period,
        body.method ?? 'efectivo',
        payStatus,
        body.notes ?? '',
      ],
    })
    const rowId = result.lastInsertRowid?.toString() ?? '0'

    // ── Recalcular clasificación con el motor central ─────────────────────
    // Leemos el cliente para tener dia_pago y la fecha del pago recién creado
    const clientRow = await db.execute({
      sql: 'SELECT classification, dia_pago FROM clients WHERE id = ?',
      args: [body.client_id],
    })

    if (clientRow.rows[0]) {
      const current     = String(clientRow.rows[0].classification ?? '')
      const diaPago     = clientRow.rows[0].dia_pago
        ? String(clientRow.rows[0].dia_pago)
        : null

      // Último pago pagado — si acabamos de registrar uno 'paid', lo incluimos
      let lastPaymentDate: string | null = null
      if (payStatus === 'paid') {
        // El pago que acabamos de insertar es el más reciente
        const now = new Date()
        lastPaymentDate = now.toISOString()
      } else {
        // Para pagos 'pending', consultar el último pago real
        const lastPaid = await db.execute({
          sql: `SELECT MAX(created_at) as lp FROM payments
                WHERE client_id = ? AND status = 'paid'`,
          args: [body.client_id],
        })
        lastPaymentDate = lastPaid.rows[0]?.lp
          ? String(lastPaid.rows[0].lp)
          : null
      }

      const { classification: newClass } = computeClassification({
        currentClassification: current,
        diaPago,
        lastPaymentDate,
      })

      await db.execute({
        sql:  'UPDATE clients SET classification = ?, status = ? WHERE id = ?',
        args: [
          newClass,
          payStatus === 'paid' ? 'active' : 'active',
          body.client_id,
        ],
      })
    }

    // ── Leer resultados finales y emitir SSE ──────────────────────────────
    const newPayment = await db.execute({
      sql: `SELECT p.*, c.name as client_name, c.plan, c.cellphone
            FROM payments p
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE p.id = ?`,
      args: [rowId],
    })
    const updatedClient = await db.execute({
      sql:  'SELECT * FROM clients WHERE id = ?',
      args: [body.client_id],
    })

    broadcast('new-payment',    newPayment.rows[0])
    broadcast('update-client',  updatedClient.rows[0])

    return NextResponse.json({ payment: newPayment.rows[0] }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
