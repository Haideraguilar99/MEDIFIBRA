import { db } from '@/lib/db'
import { signToken, verifyPassword, COOKIE_NAME } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password)
      return NextResponse.json({ error: 'Credenciales requeridas' }, { status: 400 })

    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE username = ? AND active = 1',
      args: [username]
    })
    const user = result.rows[0]
    if (!user || !verifyPassword(password, String(user.password_hash)))
      return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })

    const token = await signToken({
      id: Number(user.id),
      username: String(user.username),
      role: String(user.role)
    })
    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, username: user.username, role: user.role }
    })
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })
    return res
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
