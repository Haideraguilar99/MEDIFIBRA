'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Order {
  id: number; order_number: string; task_type: string; priority: string
  status: string; scheduled_date: string; scheduled_time: string
  client_name: string; client_address: string; client_neighborhood: string
  followup_required: number; tech_rating: number
}
interface Stats {
  total: number; completadas: number; pendientes: number
  in_progress: number; promedio: number | null
}
interface TechData { id: number; name: string; cedula: string; role: string }

const S_LABEL: Record<string, string> = {
  pending: 'Pendiente', in_progress: 'En progreso',
  completed: 'Completado', cancelled: 'Cancelado'
}
const S_COLOR: Record<string, string> = {
  pending: '#f59e0b', in_progress: '#22c55e',
  completed: '#374151', cancelled: '#ef4444'
}
const P_COLOR: Record<string, string> = {
  urgente: '#ef4444', alta: '#f59e0b', normal: '#4b5563', baja: '#1c1f27'
}

export default function TecnicoDashboard() {
  const router = useRouter()
  const [tech, setTech] = useState<TechData | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [filter, setFilter] = useState<'todas' | 'pending' | 'in_progress' | 'completed'>('todas')
  const [loading, setLoading] = useState(true)
  const fetchRef = useRef<() => void>(() => {})

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('tech_token') : null

  const fetchData = useCallback(async () => {
    const token = getToken()
    if (!token) { router.replace('/tecnico'); return }
    try {
      const techData = JSON.parse(localStorage.getItem('tech_data') ?? '{}')
      setTech(techData)
      const [oRes, sRes] = await Promise.all([
        fetch('/api/tecnico/ordenes', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/tecnico/stats',   { headers: { Authorization: `Bearer ${token}` } })
      ])
      if (oRes.status === 401 || sRes.status === 401) { clearAuthAndRedirect(); return }
      const [oData, sData] = await Promise.all([oRes.json(), sRes.json()])
      setOrders(oData.orders ?? [])
      setStats(sData.stats ?? null)
    } catch (e) { console.error('[dashboard]', e) }
    finally { setLoading(false) }
  }, [router])

  fetchRef.current = fetchData

  useEffect(() => {
    if (!getToken()) { router.replace('/tecnico'); return }
    fetchData()
  }, [fetchData, router])

  // SSE — actualización en tiempo real
  useEffect(() => {
    const es = new EventSource('/api/sse')
    es.onmessage = () => { fetchRef.current() }
    es.onerror = () => {}
    return () => es.close()
  }, [])

  function clearAuthAndRedirect() {
    localStorage.removeItem('tech_token')
    localStorage.removeItem('tech_data')
    router.replace('/tecnico')
  }

  function logout() {
    clearAuthAndRedirect()
  }

  const filtered = filter === 'todas' ? orders : orders.filter(o => o.status === filter)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', fontFamily: 'system-ui,sans-serif' }}>
      Cargando...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', fontFamily: 'system-ui,-apple-system,sans-serif', fontSize: '0.9rem' }}>

      {/* Header */}
      <div style={{ background: '#0f1117', borderBottom: '1px solid #1c1f27', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem' }}>{tech?.name ?? 'Técnico'}</div>
          <div style={{ color: '#374151', fontSize: '0.7rem', marginTop: '0.1rem' }}>{tech?.role} · CC {tech?.cedula}</div>
        </div>
        <button onClick={logout} style={{ color: '#374151', background: 'none', border: '1px solid #1c1f27', borderRadius: '6px', padding: '0.375rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer' }}>
          Salir
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem', padding: '0.75rem' }}>
          {[
            { label: 'Total',      value: stats.total,                                               color: '#94a3b8' },
            { label: 'Pendientes', value: stats.pendientes,                                          color: '#f59e0b' },
            { label: 'En curso',   value: stats.in_progress ?? 0,                                   color: '#22c55e' },
            { label: '★ Prom.',    value: stats.promedio ? Number(stats.promedio).toFixed(1) : '—', color: '#f59e0b' }
          ].map(s => (
            <div key={s.label} style={{ background: '#0f1117', border: '1px solid #1c1f27', borderRadius: '8px', padding: '0.6rem 0.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.6rem', color: '#374151', marginTop: '0.15rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.4rem', padding: '0 0.75rem 0.75rem', overflowX: 'auto' }}>
        {(['todas', 'pending', 'in_progress', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flexShrink: 0, padding: '0.35rem 0.8rem', borderRadius: '20px',
              fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
              background: filter === f ? '#0f2040' : '#0f1117',
              color:      filter === f ? '#93c5fd' : '#374151',
              border: `1px solid ${filter === f ? '#1d4ed8' : '#1c1f27'}`,
              transition: 'all 0.15s'
            }}
          >
            {f === 'todas' ? 'Todas' : S_LABEL[f]}
          </button>
        ))}
      </div>

      {/* Órdenes */}
      <div style={{ padding: '0 0.75rem 5rem' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#1c1f27', padding: '3rem 1rem', fontSize: '0.85rem' }}>
            Sin órdenes en este filtro
          </div>
        )}
        {filtered.map(order => (
          <div
            key={order.id}
            onClick={() => router.push(`/tecnico/orden/${order.id}`)}
            style={{ background: '#0f1117', border: '1px solid #1c1f27', borderRadius: '8px', padding: '0.875rem', marginBottom: '0.5rem', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.375rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {order.client_name}
                </div>
                <div style={{ color: '#4b5563', fontSize: '0.75rem', marginTop: '0.1rem' }}>{order.task_type}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
                <span style={{ fontSize: '0.67rem', padding: '0.15rem 0.5rem', borderRadius: '4px', color: S_COLOR[order.status] ?? '#6b7280', background: '#0a0a0f', border: `1px solid ${S_COLOR[order.status] ?? '#1c1f27'}30` }}>
                  {S_LABEL[order.status] ?? order.status}
                </span>
                {order.priority !== 'normal' && (
                  <span style={{ fontSize: '0.65rem', color: P_COLOR[order.priority] ?? '#4b5563' }}>● {order.priority}</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: '#374151', flexWrap: 'wrap' }}>
              {order.scheduled_date && <span>{order.scheduled_date}{order.scheduled_time ? ` ${order.scheduled_time}` : ''}</span>}
              {(order.client_neighborhood || order.client_address) && (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                  {order.client_neighborhood || order.client_address}
                </span>
              )}
            </div>
            {Number(order.followup_required) === 1 && (
              <div style={{ marginTop: '0.375rem', fontSize: '0.68rem', color: '#f59e0b' }}>Seguimiento requerido</div>
            )}
          </div>
        ))}
      </div>

      {/* FAB refresh */}
      <button
        onClick={() => fetchData()}
        style={{ position: 'fixed', bottom: '1.25rem', right: '1.25rem', width: '44px', height: '44px', borderRadius: '50%', background: '#0f1117', border: '1px solid #1c1f27', color: '#4b5563', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}
        title="Actualizar"
      >↻</button>
    </div>
  )
}
