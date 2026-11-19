import { initDB } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Bloqueado completamente en producción — la DB ya está inicializada
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'No disponible en producción' }, { status: 403 })
    }

    // Requiere CRON_SECRET en desarrollo como segunda línea de defensa
    const auth = req.headers.get('authorization')
    if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await initDB()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[init] Error interno:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
