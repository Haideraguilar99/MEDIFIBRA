'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface Order {
  id: number; order_number: string; task_type: string; task_description: string
  priority: string; status: string; scheduled_date: string; scheduled_time: string
  client_name: string; client_address: string; client_neighborhood: string
  completion_notes: string; completion_photos: string
  tech_rating: number; followup_required: number; started_at: string
}

const RESULTADOS = [
  { id: 'ok',       label: 'Completado sin problemas', icon: '✓', followup: false },
  { id: 'obs',      label: 'Con observaciones',        icon: '◎', followup: false },
  { id: 'followup', label: 'Requiere segunda visita',  icon: '↻', followup: true  },
  { id: 'failed',   label: 'No se pudo realizar',      icon: '✕', followup: true  },
]

const S_LABEL: Record<string, string> = {
  pending: 'Pendiente', in_progress: 'En progreso',
  completed: 'Completado', cancelled: 'Cancelado'
}
const S_COLOR: Record<string, string> = {
  pending: '#f59e0b', in_progress: '#22c55e',
  completed: '#475569', cancelled: '#ef4444'
}

const LABEL = (title: string) => (
  <div style={{ color: '#374151', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
    {title}
  </div>
)

export default function OrdenPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const [order, setOrder]       = useState<Order | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [saving, setSaving]     = useState(false)

  const [resultado, setResultado] = useState('')
  const [notas, setNotas]         = useState('')
  const [fotos, setFotos]         = useState<string[]>([])
  const [estrellas, setEstrellas] = useState(0)

  const fileRef = useRef<HTMLInputElement>(null)
  const token = () => typeof window !== 'undefined' ? localStorage.getItem('tech_token') : null

  const fetchOrder = useCallback(async () => {
    const t = token()
    if (!t) { router.replace('/tecnico'); return }
    try {
      const res = await fetch(`/api/tecnico/ordenes/${id}`, {
        headers: { Authorization: `Bearer ${t}` }
      })
      if (res.status === 401) { router.replace('/tecnico'); return }
      if (!res.ok) { setError('Orden no encontrada'); setLoading(false); return }
      const { order: o } = await res.json()
      setOrder(o)
      if (o.completion_notes) setNotas(o.completion_notes)
      if (o.tech_rating)      setEstrellas(Number(o.tech_rating))
      if (o.completion_photos) {
        try {
          const p = JSON.parse(o.completion_photos)
          if (Array.isArray(p)) setFotos(p)
        } catch {}
      }
      if (Number(o.followup_required) === 1) setResultado('followup')
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }, [id, router])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  async function compressPhoto(file: File): Promise<string> {
    return new Promise(resolve => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const max = 900
        let w = img.width, h = img.height
        if (w > max) { h = Math.round(h * max / w); w = max }
        if (h > max) { w = Math.round(w * max / h); h = max }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        URL.revokeObjectURL(url)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      img.src = url
    })
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || fotos.length >= 4) return
    try {
      const compressed = await compressPhoto(file)
      setFotos(p => [...p, compressed])
    } catch { setError('Error al procesar la foto') }
    e.target.value = ''
  }

  async function callPut(body: Record<string, unknown>) {
    const t = token()
    if (!t) throw new Error('Sin sesión')
    const res = await fetch(`/api/tecnico/ordenes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Error')
    return data.order as Order
  }

  async function iniciar() {
    setSaving(true); setError('')
    try {
      const updated = await callPut({ status: 'in_progress' })
      setOrder(updated)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  async function completar() {
    if (!resultado) { setError('Selecciona el resultado del trabajo'); return }
    setSaving(true); setError('')
    try {
      const needsFollowup = resultado === 'followup' || resultado === 'failed'
      const updated = await callPut({
        status:            'completed',
        completion_notes:  notas,
        completion_photos: fotos,
        tech_rating:       estrellas,
        rating_comment:    '',
        followup_required: needsFollowup ? 1 : 0,
        followup_notes:    needsFollowup ? notas : '',
      })
      setOrder(updated)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  /* ── Loading / Error ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', fontFamily: 'system-ui,sans-serif' }}>
      Cargando...
    </div>
  )

  if (!order) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ color: '#ef4444' }}>{error || 'Orden no encontrada'}</div>
      <button onClick={() => router.back()} style={{ color: '#374151', background: '#0f1117', border: '1px solid #1c1f27', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem' }}>
        ← Volver
      </button>
    </div>
  )

  const isPending  = order.status === 'pending'
  const isActive   = order.status === 'in_progress'
  const isDone     = order.status === 'completed'

  /* ── Fotos existentes en modo completado ── */
  const existingPhotos = (() => {
    try {
      const p: string[] = JSON.parse(order.completion_photos || '[]')
      return Array.isArray(p) ? p : []
    } catch { return [] }
  })()

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', fontFamily: 'system-ui,-apple-system,sans-serif', fontSize: '0.9rem' }}>

      {/* Header fijo */}
      <div style={{ background: '#0f1117', borderBottom: '1px solid #1c1f27', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', padding: '0.125rem 0.375rem', lineHeight: 1, borderRadius: '4px' }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {order.order_number || `Orden #${order.id}`}
          </div>
          <div style={{ fontSize: '0.7rem', color: S_COLOR[order.status] ?? '#64748b' }}>
            {S_LABEL[order.status] ?? order.status}
          </div>
        </div>
      </div>

      {/* Tarjeta cliente */}
      <div style={{ margin: '0.75rem', background: '#0f1117', border: '1px solid #1c1f27', borderRadius: '8px', padding: '0.875rem' }}>
        <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: '0.2rem' }}>{order.client_name}</div>
        {order.client_address && (
          <div style={{ color: '#4b5563', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
            📍 {order.client_address}{order.client_neighborhood ? ` · ${order.client_neighborhood}` : ''}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ background: '#1c1f27', color: '#6b7280', padding: '0.175rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>
            {order.task_type}
          </span>
          {order.scheduled_date && (
            <span style={{ background: '#1c1f27', color: '#4b5563', padding: '0.175rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>
              📅 {order.scheduled_date}{order.scheduled_time ? ` ${order.scheduled_time}` : ''}
            </span>
          )}
        </div>
        {order.task_description && (
          <div style={{ marginTop: '0.5rem', color: '#374151', fontSize: '0.77rem', lineHeight: 1.5 }}>{order.task_description}</div>
        )}
      </div>

      {/* ── PENDING ── */}
      {isPending && (
        <div style={{ margin: '0.75rem' }}>
          <div style={{ background: '#0f1117', border: '1px solid #1c1f27', borderRadius: '8px', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#374151', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Al iniciar la orden se registrará la hora de comienzo y el estado pasará a <strong style={{ color: '#22c55e' }}>En progreso</strong>.
            </div>
            <button
              onClick={iniciar}
              disabled={saving}
              style={{ width: '100%', background: saving ? '#1c1f27' : '#0f2040', color: saving ? '#374151' : '#60a5fa', border: `1px solid ${saving ? '#1c1f27' : '#1d4ed8'}`, borderRadius: '8px', padding: '0.875rem', fontSize: '0.95rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
            >
              {saving ? 'Iniciando...' : '▶  Iniciar orden'}
            </button>
          </div>
        </div>
      )}

      {/* ── IN_PROGRESS — Formulario ── */}
      {isActive && (
        <div style={{ padding: '0 0.75rem 5.5rem' }}>

          {/* Resultado */}
          <div style={{ marginBottom: '1.25rem' }}>
            {LABEL('Resultado del trabajo *')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
              {RESULTADOS.map(r => {
                const sel = resultado === r.id
                const borderColor = sel
                  ? (r.id === 'ok' ? '#15803d' : r.id === 'obs' ? '#92400e' : r.id === 'followup' ? '#1d4ed8' : '#991b1b')
                  : '#1c1f27'
                return (
                  <button
                    key={r.id}
                    onClick={() => setResultado(r.id)}
                    style={{ background: sel ? '#0f1117' : '#0a0a0f', border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '0.75rem 0.6rem', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' }}
                  >
                    <div style={{ fontSize: '1rem', marginBottom: '0.3rem', color: sel ? '#e2e8f0' : '#1c1f27' }}>{r.icon}</div>
                    <div style={{ fontSize: '0.72rem', color: sel ? '#c4cdd8' : '#374151', lineHeight: 1.35 }}>{r.label}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Observaciones */}
          <div style={{ marginBottom: '1.25rem' }}>
            {LABEL('Observaciones')}
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Describe brevemente lo realizado o el inconveniente encontrado..."
              rows={3}
              style={{ width: '100%', background: '#0a0a0f', color: '#e2e8f0', border: '1px solid #1c1f27', borderRadius: '8px', padding: '0.75rem', fontSize: '0.875rem', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5, fontFamily: 'system-ui,sans-serif' }}
            />
          </div>

          {/* Fotos */}
          <div style={{ marginBottom: '1.25rem' }}>
            {LABEL(`Fotos de evidencia (${fotos.length}/4)`)}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {fotos.map((f, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={f} alt="" style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #1c1f27', display: 'block' }} />
                  <button
                    onClick={() => setFotos(p => p.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', background: '#450a0a', color: '#fca5a5', border: 'none', cursor: 'pointer', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  >✕</button>
                </div>
              ))}
              {fotos.length < 4 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{ width: '72px', height: '72px', background: '#0a0a0f', border: '1px dashed #1c1f27', borderRadius: '6px', cursor: 'pointer', color: '#374151', fontSize: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  title="Agregar foto"
                >+</button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhoto}
              style={{ display: 'none' }}
            />
            <div style={{ color: '#1c1f27', fontSize: '0.68rem', marginTop: '0.375rem' }}>
              Toca + para tomar foto con la cámara
            </div>
          </div>

          {/* Calificación */}
          <div style={{ marginBottom: '1.25rem' }}>
            {LABEL('Calificación del servicio')}
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setEstrellas(s === estrellas ? 0 : s)}
                  style={{ fontSize: '2rem', color: s <= estrellas ? '#f59e0b' : '#1c1f27', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, transition: 'color 0.1s' }}
                >★</button>
              ))}
              {estrellas > 0 && (
                <span style={{ color: '#374151', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                  {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][estrellas]}
                </span>
              )}
            </div>
          </div>

          {/* Error inline */}
          {error && (
            <div style={{ background: '#1c0a0a', border: '1px solid #450a0a', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#f87171', fontSize: '0.8rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* ── COMPLETED — resumen ── */}
      {isDone && (
        <div style={{ margin: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ background: '#051a0a', border: '1px solid #14532d', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ color: '#22c55e', fontWeight: 700, marginBottom: '0.5rem' }}>✓ Orden completada</div>
            {order.completion_notes && (
              <div style={{ color: '#4b5563', fontSize: '0.82rem', lineHeight: 1.5 }}>{order.completion_notes}</div>
            )}
            {Number(order.tech_rating) > 0 && (
              <div style={{ marginTop: '0.5rem', color: '#f59e0b', fontSize: '1.1rem', letterSpacing: '2px' }}>
                {'★'.repeat(Number(order.tech_rating))}
                <span style={{ color: '#1c1f27' }}>{'★'.repeat(5 - Number(order.tech_rating))}</span>
              </div>
            )}
            {Number(order.followup_required) === 1 && (
              <div style={{ marginTop: '0.5rem', color: '#f59e0b', fontSize: '0.78rem' }}>⚠ Requiere seguimiento</div>
            )}
          </div>

          {existingPhotos.length > 0 && (
            <div style={{ background: '#0f1117', border: '1px solid #1c1f27', borderRadius: '8px', padding: '0.875rem' }}>
              {LABEL('Evidencia fotográfica')}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {existingPhotos.map((p, i) => (
                  <img key={i} src={p} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #1c1f27' }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botón fijo — Completar */}
      {isActive && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0a0a0f', borderTop: '1px solid #1c1f27', padding: '0.875rem 1rem' }}>
          <button
            onClick={completar}
            disabled={saving || !resultado}
            style={{
              width: '100%',
              background:   saving || !resultado ? '#0f1117' : '#052e16',
              color:        saving || !resultado ? '#374151' : '#4ade80',
              border:       `1px solid ${saving || !resultado ? '#1c1f27' : '#15803d'}`,
              borderRadius: '8px', padding: '0.9rem',
              fontSize:     '0.95rem', fontWeight: 700,
              cursor:       saving || !resultado ? 'not-allowed' : 'pointer',
              transition:   'all 0.15s'
            }}
          >
            {saving ? 'Guardando...' : '✓  Completar orden'}
          </button>
        </div>
      )}
    </div>
  )
}
