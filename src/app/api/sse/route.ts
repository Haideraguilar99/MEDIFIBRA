import { addSSEClient, removeSSEClient } from '@/lib/sse'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  const id = crypto.randomUUID()
  const encoder = new TextEncoder()
  let interval: ReturnType<typeof setInterval>

  const stream = new ReadableStream({
    start(controller) {
      addSSEClient(id, controller)
      controller.enqueue(encoder.encode(`event: connected\ndata: {"id":"${id}"}\n\n`))
      // Heartbeat cada 25s para mantener conexión viva en Vercel
      interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          clearInterval(interval)
          removeSSEClient(id)
        }
      }, 25000)
    },
    cancel() {
      clearInterval(interval)
      removeSSEClient(id)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    }
  })
}
