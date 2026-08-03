const clients = new Map<string, ReadableStreamDefaultController>()

export function addSSEClient(id: string, controller: ReadableStreamDefaultController) {
  clients.set(id, controller)
}

export function removeSSEClient(id: string) {
  clients.delete(id)
}

export function broadcast(event: string, data: unknown) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  const encoder = new TextEncoder()
  for (const [id, ctrl] of clients) {
    try {
      ctrl.enqueue(encoder.encode(msg))
    } catch {
      clients.delete(id)
    }
  }
}
