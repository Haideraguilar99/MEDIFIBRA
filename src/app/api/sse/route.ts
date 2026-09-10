import { addSSEClient, removeSSEClient } from '@/lib/sse'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 55

export async function GET() {
  const id = crypto.randomUUID()
  const encoder = new TextEncoder()
  let interval: ReturnType<typeof setInterval>

  const stream = new ReadableStream({
    start(controller) {
      addSSEClient(id, controller)
      controller.enqueue(encoder.encode(`event: connected\ndata: {"id":"${id}"}\n\n`))
      // Heartbeat cada 45s — dentro del maxDuration de 55s
      interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          clearInterval(interval)
          removeSSEClient(id)
        }
      }, 45000)
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
