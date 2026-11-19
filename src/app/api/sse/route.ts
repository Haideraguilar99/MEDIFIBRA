import { NextResponse } from 'next/server'

// SSE prohibido por arquitectura MEDIFIBRA — usar polling
export async function GET() {
  return NextResponse.json(
    { error: 'SSE no disponible — usar polling' },
    { status: 410 }
  )
}
