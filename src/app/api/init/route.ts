import { initDB } from '@/lib/db'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

let initialized = false

export async function GET() {
  try {
    if (!initialized) {
      await initDB()
      initialized = true
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
