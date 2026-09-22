'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, X, CreditCard, CheckCircle, RefreshCw, AlertTriangle, Clock, Calendar } from 'lucide-react'

type UpcomingClient = {
  id: number
  name: string
  cellphone: string
  phone: string
  plan: string
  plan_value: number
  dia_pago: string
  paymentDay: number
  daysUntilPayment: number
  neighborhood: string
  address: string
  status: string
  classification: string
}

type Props = {
  dark: boolean
  BG: string
  BG2: string
  CARD: string
  BORDER: string
  MUTED: string
  TEXT: string
  LIGHT: string
  onGoToCobros?: () => void
}

function formatCOP(n: number | string): string {
  return '$' + Number(n).toLocaleString('es-CO')
}

function getInvoiceNum(clientId: number): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return 'MF-' + y + m + '-' + String(clientId).padStart(4, '0')
}

function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25, 659.25]
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.28
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.22, t + 0.06)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65)
      osc.start(t)
      osc.stop(t + 0.7)
    })
  } catch { /* sin Web Audio API */ }
}

const URGENCY: Record<number, { label: string; color: string; bg: string; border: string }> = {
  0: { label: 'Vence HOY',        color: '#ef4444', bg: '#2d0a0a', border: '#991b1b' },
  1: { label: 'Vence manana',     color: '#f97316', bg: '#2a1400', border: '#9a3412' },
  2: { label: 'Vence en 2 dias',  color: '#fb923c', bg: '#271200', border: '#9a3412' },
  3: { label: 'Vence en 3 dias',  color: '#eab308', bg: '#1c1400', border: '#92400e' },
  4: { label: 'Vence en 4 dias',  color: '#a3e635', bg: '#0f1f02', border: '#365314' },
  5: { label: 'Vence en 5 dias',  color: '#22c55e', bg: '#052e16', border: '#166534' },
}

export default function NotificationBell({
  dark, BG, BG2, CARD, BORDER, MUTED, TEXT, LIGHT, onGoToCobros,
}: Props) {
  const [open,     setOpen]     = useState(false)
  const [clients,  setClients]  = useState<UpcomingClient[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const prevCountRef = useRef<number>(-1)
  const firstLoad    = useRef(true)

  const fetchUpcoming = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notifications/upcoming-payments', { cache: 'no-store', credentials: 'include' })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const data = await res.json()
      const incoming: UpcomingClient[] = data.clients ?? []
      setClients(incoming)
      const newCount = incoming.length
      if (firstLoad.current) {
        if (newCount > 0) playChime()
        firstLoad.current = false
      } else if (newCount > prevCountRef.current && prevCountRef.current >= 0) {
        playChime()
      }
      prevCountRef.current = newCount
    } catch (err) {
      console.error('[NotificationBell]', err)
      setError('No se pudo cargar. Verifica la conexion.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUpcoming()
    const interval = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      fetchUpcoming(true)
    }, 5 * 60 * 1000)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchUpcoming(true) }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchUpcoming])

  const handleToggle = () => {
    setOpen(o => {
      if (!o) fetchUpcoming()
      return !o
    })
  }

  const handleIrCobros = () => {
    setOpen(false)
    if (onGoToCobros) onGoToCobros()
  }

  const totalCount  = clients.length
  const badgeLabel  = totalCount > 99 ? '99+' : String(totalCount)
  const groupedDays = [0, 1, 2, 3, 4, 5].filter(d => clients.some(c => c.daysUntilPayment === d))

  return (
    <div className="relative">
      <style>{`
        @keyframes bellPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.18); opacity: 0.85; }
        }
        @keyframes bellTilt {
          0%, 100% { transform: rotate(0deg); }
          15%       { transform: rotate(-12deg); }
          30%       { transform: rotate(12deg); }
          45%       { transform: rotate(-8deg); }
          60%       { transform: rotate(8deg); }
          75%       { transform: rotate(-4deg); }
          90%       { transform: rotate(4deg); }
        }
        @keyframes badgePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          50%       { box-shadow: 0 0 0 4px rgba(239,68,68,0); }
        }
      `}</style>

      <button
        onClick={handleToggle}
        title={totalCount + ' cliente' + (totalCount !== 1 ? 's' : '') + ' proximo' + (totalCount !== 1 ? 's' : '') + ' a pagar'}
        className="relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 hover:opacity-80 active:scale-95"
        style={{ backgroundColor: CARD, border: '1px solid ' + (totalCount > 0 ? '#f59e0b' : BORDER) }}
      >
        <Bell
          className="w-5 h-5"
          style={{
            color: totalCount > 0 ? '#f59e0b' : LIGHT,
            animation: totalCount > 0 ? 'bellTilt 2.5s ease-in-out infinite' : 'none',
          }}
        />
        {totalCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-extrabold text-white rounded-full leading-none select-none"
            style={{
              backgroundColor: '#ef4444',
              animation: 'badgePulse 1.8s ease-in-out infinite, bellPulse 2.5s ease-in-out infinite',
            }}
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-12 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
            style={{
              width: '22rem',
              maxHeight: '82vh',
              backgroundColor: BG2,
              border: '1px solid ' + BORDER,
              boxShadow: dark
                ? '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(37,99,235,0.15)'
                : '0 25px 60px rgba(0,0,0,0.18)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 flex-shrink-0"
              style={{ borderBottom: '1px solid ' + BORDER }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: totalCount > 0 ? '#1c1400' : '#0d1f0d', border: '1px solid ' + (totalCount > 0 ? '#92400e' : '#166534') }}>
                  <Bell className="w-4 h-4" style={{ color: totalCount > 0 ? '#eab308' : '#4ade80' }} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold leading-tight" style={{ color: TEXT }}>Recordatorios de Pago</h3>
                  <p className="text-xs leading-tight truncate" style={{ color: MUTED }}>
                    {loading ? 'Actualizando...' : totalCount === 0 ? 'Sin vencimientos proximos' : totalCount + ' cliente' + (totalCount !== 1 ? 's' : '') + ' proximo' + (totalCount !== 1 ? 's' : '') + ' a pagar'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => fetchUpcoming()} disabled={loading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ color: '#2563eb', backgroundColor: '#1e3a8a22', border: '1px solid #1e3a8a44' }}>
                  <RefreshCw className={'w-3 h-3 ' + (loading ? 'animate-spin' : '')} />
                  <span>Actualizar</span>
                </button>
                <button onClick={() => setOpen(false)}
                  className="flex items-center justify-center w-7 h-7 rounded-lg hover:opacity-70"
                  style={{ color: MUTED }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Boton ir a cobros */}
            {totalCount > 0 && (
              <div className="px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid ' + BORDER }}>
                <button onClick={handleIrCobros}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90"
                  style={{ backgroundColor: '#1e3a8a', color: '#93c5fd', border: '1px solid #2563eb' }}>
                  <CreditCard className="w-3.5 h-3.5" />
                  Ir al modulo de Cobros ({totalCount} pendientes)
                </button>
              </div>
            )}

            {/* Lista */}
            <div className="overflow-y-auto flex-1 px-3 py-3 space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-sm"
                  style={{ backgroundColor: '#2d0a0a', border: '1px solid #991b1b', color: '#fca5a5' }}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {!loading && !error && totalCount === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full mb-3"
                    style={{ backgroundColor: '#052e16', border: '1px solid #166534' }}>
                    <CheckCircle className="w-7 h-7 text-green-400" />
                  </div>
                  <p className="font-bold text-sm" style={{ color: TEXT }}>Todo en orden</p>
                  <p className="text-xs mt-1 max-w-[200px] leading-relaxed" style={{ color: MUTED }}>
                    No hay clientes con vencimientos en los proximos 5 dias
                  </p>
                </div>
              )}

              {loading && clients.length === 0 && (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: CARD }} />
                  ))}
                </div>
              )}

              {groupedDays.map(days => {
                const group = clients.filter(c => c.daysUntilPayment === days)
                const u = URGENCY[days]
                return (
                  <div key={days}>
                    <div className="flex items-center gap-2 mb-2 px-0.5">
                      <span className="text-xs font-black uppercase tracking-wider" style={{ color: u.color }}>{u.label}</span>
                      <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: u.bg, color: u.color, border: '1px solid ' + u.border }}>
                        {group.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {group.map(client => (
                        <div key={client.id} className="rounded-xl p-3 transition-all"
                          style={{ backgroundColor: CARD, border: '1px solid ' + (days === 0 ? u.border : BORDER) }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-sm truncate" style={{ color: TEXT }}>{client.name}</p>
                              <p className="text-xs mt-0.5" style={{ color: MUTED }}>{client.cellphone || client.phone || '—'}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-extrabold" style={{ color: '#22c55e' }}>{formatCOP(client.plan_value)}</p>
                              <div className="flex items-center justify-end gap-1 mt-0.5">
                                <Calendar className="w-2.5 h-2.5" style={{ color: MUTED }} />
                                <span className="text-xs" style={{ color: MUTED }}>dia {client.dia_pago || client.paymentDay}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 px-2 py-1.5 rounded-lg"
                            style={{ backgroundColor: BG, border: '1px solid ' + BORDER }}>
                            <CreditCard className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#2563eb' }} />
                            <span className="text-xs font-semibold truncate flex-1" style={{ color: TEXT }}>{client.plan}</span>
                            <span className="text-xs font-mono" style={{ color: MUTED }}>{getInvoiceNum(client.id)}</span>
                            <Clock className="w-3 h-3 flex-shrink-0" style={{ color: u.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 flex items-center justify-between gap-2 flex-shrink-0"
              style={{ borderTop: '1px solid ' + BORDER }}>
              <span className="text-xs" style={{ color: MUTED }}>Se actualiza cada 5 min</span>
              <span className="text-xs font-mono" style={{ color: MUTED }}>
                {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
