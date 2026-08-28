'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Order {
  id: number; order_number: string; task_type: string; task_description: string
  priority: string; status: string; scheduled_date: string; scheduled_time: string
  client_name: string; client_cellphone: string; client_address: string
  client_neighborhood: string; gps_lat: number; gps_lng: number
  followup_required: number; tech_rating: number
}
interface Stats {
  total: number; completadas: number; pendientes: number; en_progreso: number
  avg_duracion: number; promedio: number; total_ratings: number
}
interface TechData { id: number; name: string; cedula: string; role: string; photo_url: string }

const PRIORITY_COLORS: Record<string, string> = {
  urgente: 'bg-red-900 text-red-300 border-red-700',
  alta: 'bg-orange-900 text-orange-300 border-orange-700',
  normal: 'bg-blue-900 text-blue-300 border-blue-700',
  baja: 'bg-gray-800 text-gray-400 border-gray-600'
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  en_progreso: 'bg-green-900 text-green-300 border-green-700',
  completado: 'bg-gray-800 text-gray-400 border-gray-600',
  cancelado: 'bg-red-900 text-red-400 border-red-700'
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', en_progreso: 'En progreso', completado: 'Completado', cancelado: 'Cancelado'
}

export default function TecnicoDashboard() {
  const router = useRouter()
  const [tech, setTech] = useState<TechData | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [filter, setFilter] = useState<'todas' | 'pending' | 'en_progreso' | 'completado'>('todas')
  const [loading, setLoading] = useState(true)

  const getToken = () => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('tech_token')
  }

  const fetchData = useCallback(async () => {
    const token = getToken()
    if (!token) { router.push('/tecnico'); return }
    try {
      const techData = JSON.parse(localStorage.getItem('tech_data') ?? '{}')
      setTech(techData)
      const [ordersRes, statsRes] = await Promise.all([
        fetch('/api/tecnico/ordenes', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/tecnico/stats', { headers: { Authorization: `Bearer ${token}` } })
      ])
      if (ordersRes.status === 401) { router.push('/tecnico'); return }
      const ordersData = await ordersRes.json()
      const statsData = await statsRes.json()
      setOrders(ordersData.orders ?? [])
      setStats(statsData.stats ?? null)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [router])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tech_token') : null
    if (!token) { router.push('/tecnico'); return }
    fetchData()
  }, [fetchData, router])

  function logout() {
    localStorage.removeItem('tech_token'); localStorage.removeItem('tech_data')
    router.push('/tecnico')
  }

  const filtered = filter === 'todas' ? orders : orders.filter(o => o.status === filter)

  if (loading) return (
    <div className="min-h-screen bg-[#0d1b3e] flex items-center justify-center">
      <div className="text-blue-300 text-lg">Cargando órdenes...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0d1b3e] text-white">
      {/* Header */}
      <div className="bg-[#1a2d5a] border-b border-blue-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-white">{tech?.name ?? 'Técnico'}</h1>
          <p className="text-blue-400 text-xs">{tech?.role} · CC {tech?.cedula}</p>
        </div>
        <button onClick={logout} className="text-blue-400 hover:text-white text-sm px-3 py-1 rounded-lg border border-blue-700 hover:border-blue-500 transition-colors">
          Salir
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 p-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-white' },
            { label: 'Pendientes', value: stats.pendientes, color: 'text-yellow-400' },
            { label: 'En curso', value: stats.en_progreso, color: 'text-green-400' },
            { label: '★ Prom.', value: stats.promedio ? Number(stats.promedio).toFixed(1) : '—', color: 'text-amber-400' }
          ].map(s => (
            <div key={s.label} className="bg-[#1a2d5a] rounded-xl p-3 text-center border border-blue-800">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-blue-400 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
        {(['todas', 'pending', 'en_progreso', 'completado'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#1a2d5a] border-blue-800 text-blue-300'
            }`}
          >
            {f === 'todas' ? 'Todas' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {/* Órdenes */}
      <div className="px-4 pb-6 space-y-3">
        {filtered.length === 0 && (
          <div className="text-center text-blue-600 py-12">No hay órdenes en este filtro</div>
        )}
        {filtered.map(order => (
          <div
            key={order.id}
            onClick={() => router.push(`/tecnico/orden/${order.id}`)}
            className="bg-[#1a2d5a] rounded-2xl p-4 border border-blue-800 active:border-blue-500 cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{order.client_name}</p>
                <p className="text-blue-400 text-sm truncate">{order.task_type}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status] ?? STATUS_COLORS.pending}`}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[order.priority] ?? PRIORITY_COLORS.normal}`}>
                  {order.priority}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-blue-400">
              {order.scheduled_date && <span>📅 {order.scheduled_date} {order.scheduled_time}</span>}
              {order.client_address && <span className="truncate">📍 {order.client_neighborhood || order.client_address}</span>}
            </div>
            {order.followup_required === 1 && (
              <div className="mt-2 text-xs text-amber-400">⚠️ Requiere seguimiento</div>
            )}
            {order.status === 'completado' && order.tech_rating > 0 && (
              <div className="mt-2 text-xs text-amber-400">{'★'.repeat(order.tech_rating)} Calificado</div>
            )}
          </div>
        ))}
      </div>

      {/* FAB refresh */}
      <button
        onClick={fetchData}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-500 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl"
        title="Actualizar"
      >
        ↻
      </button>
    </div>
  )
}
