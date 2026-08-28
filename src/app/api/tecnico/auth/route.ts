import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { signTechJWT } from '@/lib/tecnico-auth'

export async function POST(req: Request) {
  try {
    const { cedula } = await req.json()
    if (!cedula) return NextResponse.json({ error: 'Cédula requerida' }, { status: 400 })

    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT id, name, cedula, role, active, photo_url FROM technicians WHERE cedula = ? AND active = 1',
      args: [cedula]
    })

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Técnico no encontrado o inactivo' }, { status: 401 })
    }

    const tech = result.rows[0]
    const token = await signTechJWT({
      techId: tech.id as number,
      cedula: tech.cedula as string,
      name: tech.name as string,
      role: tech.role as string
    })

    return NextResponse.json({
      token,
      tech: { id: tech.id, name: tech.name, cedula: tech.cedula, role: tech.role, photo_url: tech.photo_url }
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
