import { addSSEClient, removeSSEClient } from '@/lib/sse'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const id = crypto.randomUUID()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      addSSEClient(id, controller)
      controller.enqueue(encoder.encode(`event: connected\ndata: {"id":"${id}"}\n\n`))
    },
    cancel() {
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
