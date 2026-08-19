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
}

function formatCOP(n: number | string): string {
  return `$${Number(n).toLocaleString('es-CO')}`
}

function sanitizePhone(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (digits.startsWith('57') && digits.length >= 12) return digits.slice(2)
  if (digits.startsWith('0') && digits.length === 11) return digits.slice(1)
  return digits
}

function getInvoiceNum(clientId: number): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `MF-${y}${m}-${String(clientId).padStart(4, '0')}`
}

function getPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function buildWhatsAppLink(client: UpcomingClient): string {
  const phone = sanitizePhone(client.cellphone || client.phone || '')
  const invoiceNum = getInvoiceNum(client.id)
  const period = getPeriod()
  const dueDay = client.dia_pago || String(client.paymentDay)

  const lines = [
    `👋 Hola *${client.name}*,`,
    ``,
    `Te saludamos del equipo de *MEDIFIBRA* 📡`,
    ``,
    `Te recordamos que tu factura de internet vence el día *${dueDay}* de este mes.`,
    ``,
    `📋 *Detalles de tu factura:*`,
    `• Plan: *${client.plan}*`,
    `• Valor: *${formatCOP(client.plan_value)}*`,
    `• N° Factura: *${invoiceNum}*`,
    `• Período: ${period}`,
    ``,
    `💳 *Métodos de pago:*`,
    `• Bancolombia: 009-952025-14`,
    `• Nequi: 301 508 0961`,
    `• Bre-B`,
    ``,
    `⚡ Paga a tiempo y evita interrupciones en tu servicio.`,
    `¡Gracias por confiar en MEDIFIBRA! 🙏`,
    ``,
    `_Medifibra · Conéctate con velocidad real_ 🌐`,
  ]

  return `https://wa.me/57${phone}?text=${encodeURIComponent(lines.join('\n'))}`
}

function playChime() {
  try {
    const Ctx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.16
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.22, t + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
      osc.start(t)
      osc.stop(t + 0.6)
    })
  } catch { /* sin Web Audio API */ }
}

const URGENCY: Record<number, { label: string; color: string; bg: string; border: string; icon: string }> = {
  0: { label: 'Vence HOY',       color: '#ef4444', bg: '#2d0a0a', border: '#991b1b', icon: '🚨' },
  1: { label: 'Vence MAÑANA',    color: '#f97316', bg: '#2a1400', border: '#9a3412', icon: '⚠️' },
  3: { label: 'Vence en 3 días', color: '#eab308', bg: '#1c1400', border: '#92400e', icon: '🔔' },
  5: { label: 'Vence en 5 días', color: '#22c55e', bg: '#052e16', border: '#166534', icon: '📅' },
}

export default function NotificationBell({
  dark, BG, BG2, CARD, BORDER, MUTED, TEXT, LIGHT,
}: Props) {
  const [open,    setOpen]    = useState(false)
  const [clients, setClients] = useState<UpcomingClient[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [btnState, setBtnState] = useState<Record<number, 'idle' | 'sending' | 'sent'>>({})
  const prevCountRef = useRef<number>(-1)
  const firstLoad    = useRef(true)

  const fetchUpcoming = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/notifications/upcoming-payments', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
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
      setError('No se pudo cargar. Verifica la conexión.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUpcoming()
    const interval = setInterval(() => fetchUpcoming(true), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchUpcoming])

  const handleToggle = () => {
    setOpen(o => {
      if (!o) fetchUpcoming()
      return !o
    })
  }

  const handleSend = async (client: UpcomingClient) => {
    setBtnState(p => ({ ...p, [client.id]: 'sending' }))
    fetch('/api/notifications/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: client.id,
        channel:   'whatsapp',
        type:      'payment_reminder',
        message:   `Recordatorio pago – ${client.plan} – ${formatCOP(client.plan_value)} – ${getInvoiceNum(client.id)}`,
        status:    'sent',
      }),
    }).catch(() => {})
    window.open(buildWhatsAppLink(client), '_blank', 'noopener,noreferrer')
    setBtnState(p => ({ ...p, [client.id]: 'sent' }))
    setTimeout(() => {
      setBtnState(p => ({ ...p, [client.id]: 'idle' }))
    }, 12_000)
  }

  const totalCount  = clients.length
  const badgeLabel  = totalCount > 99 ? '99+' : String(totalCount)
  const groupedDays = [0, 1, 3, 5].filter(d => clients.some(c => c.daysUntilPayment === d))

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        title={`${totalCount} cliente${totalCount !== 1 ? 's' : ''} próximo${totalCount !== 1 ? 's' : ''} a pagar`}
        className="relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 hover:opacity-80 active:scale-95"
        style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}
      >
        <Bell
          className={`w-5 h-5 transition-colors ${totalCount > 0 ? 'text-yellow-400' : ''}`}
          style={totalCount === 0 ? { color: LIGHT } : {}}
        />
        {totalCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-extrabold text-white rounded-full leading-none select-none"
            style={{
              backgroundColor: '#ef4444',
              boxShadow: '0 0 0 2px ' + (dark ? '#0b0f19' : '#f0f4f8'),
              animation: 'bellPulse 2s ease-in-out infinite',
            }}
          >
            {badgeLabel}
          </span>
        )}
      </button>

      <style>{`
        @keyframes bellPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.15); }
        }
      `}</style>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-12 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
            style={{
              width: '22rem',
              maxHeight: '82vh',
              backgroundColor: BG2,
              border: `1px solid ${BORDER}`,
              boxShadow: dark
                ? '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(37,99,235,0.15)'
                : '0 25px 60px rgba(0,0,0,0.18)',
            }}
          >
            <div
              className="flex items-center justify-between gap-3 px-4 py-3 flex-shrink-0"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: totalCount > 0 ? '#1c1400' : '#0d1f0d', border: `1px solid ${totalCount > 0 ? '#92400e' : '#166534'}` }}
                >
                  <Bell className="w-4 h-4" style={{ color: totalCount > 0 ? '#eab308' : '#4ade80' }} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold leading-tight" style={{ color: TEXT }}>
                    Recordatorios de Pago
                  </h3>
                  <p className="text-xs leading-tight truncate" style={{ color: MUTED }}>
                    {loading
                      ? 'Actualizando...'
                      : totalCount === 0
                      ? 'Sin vencimientos próximos'
                      : `${totalCount} cliente${totalCount !== 1 ? 's' : ''} próximo${totalCount !== 1 ? 's' : ''} a pagar`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => fetchUpcoming()}
                  disabled={loading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80 active:scale-95 disabled:opacity-40"
                  style={{ color: '#2563eb', backgroundColor: '#1e3a8a22', border: '1px solid #1e3a8a44' }}
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:opacity-70"
                  style={{ color: MUTED }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-3 py-3 space-y-4">
              {error && (
                <div
                  className="flex items-start gap-2 p-3 rounded-xl text-sm"
                  style={{ backgroundColor: '#2d0a0a', border: '1px solid #991b1b', color: '#fca5a5' }}
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {!loading && !error && totalCount === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div
                    className="flex items-center justify-center w-14 h-14 rounded-full mb-3"
                    style={{ backgroundColor: '#052e16', border: '1px solid #166534' }}
                  >
                    <CheckCircle className="w-7 h-7 text-green-400" />
                  </div>
                  <p className="font-bold text-sm" style={{ color: TEXT }}>¡Todo en orden!</p>
                  <p className="text-xs mt-1 max-w-[200px] leading-relaxed" style={{ color: MUTED }}>
                    No hay clientes con vencimientos en los próximos 5 días
                  </p>
                </div>
              )}

              {loading && clients.length === 0 && (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: CARD }} />
                  ))}
                </div>
              )}

              {groupedDays.map(days => {
                const group = clients.filter(c => c.daysUntilPayment === days)
                const u = URGENCY[days]
                return (
                  <div key={days}>
                    <div className="flex items-center gap-2 mb-2 px-0.5">
                      <span className="text-sm leading-none">{u.icon}</span>
                      <span className="text-xs font-black uppercase tracking-wider" style={{ color: u.color }}>
                        {u.label}
                      </span>
                      <span
                        className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: u.bg, color: u.color, border: `1px solid ${u.border}` }}
                      >
                        {group.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {group.map(client => {
                        const state = btnState[client.id] ?? 'idle'
                        return (
                          <div
                            key={client.id}
                            className="rounded-xl p-3 transition-all"
                            style={{
                              backgroundColor: CARD,
                              border: `1px solid ${BORDER}`,
                              boxShadow: days === 0 ? `0 0 0 1px ${u.border}` : 'none',
                            }}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0">
                                <p className="font-bold text-sm truncate leading-tight" style={{ color: TEXT }}>
                                  {client.name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-xs" style={{ color: MUTED }}>
                                    📱 {client.cellphone || client.phone || '—'}
                                  </span>
                                  {client.neighborhood && (
                                    <span className="text-xs" style={{ color: MUTED }}>
                                      · 📍 {client.neighborhood}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-extrabold" style={{ color: '#22c55e' }}>
                                  {formatCOP(client.plan_value)}
                                </p>
                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                  <Calendar className="w-2.5 h-2.5" style={{ color: MUTED }} />
                                  <span className="text-xs" style={{ color: MUTED }}>
                                    día {client.dia_pago || client.paymentDay}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div
                              className="flex items-center gap-2 px-2.5 py-2 rounded-lg mb-2.5"
                              style={{ backgroundColor: BG, border: `1px solid ${BORDER}` }}
                            >
                              <CreditCard className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#2563eb' }} />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold truncate" style={{ color: TEXT }}>
                                  {client.plan}
                                </p>
                                <p className="text-xs font-mono" style={{ color: MUTED }}>
                                  N° {getInvoiceNum(client.id)}
                                </p>
                              </div>
                              <Clock className="w-3 h-3 flex-shrink-0" style={{ color: u.color }} />
                            </div>

                            <button
                              onClick={() => handleSend(client)}
                              disabled={state === 'sending'}
                              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{
                                backgroundColor: state === 'sent' ? '#052e16' : '#075e54',
                                color:           state === 'sent' ? '#4ade80' : '#ffffff',
                                border: `1px solid ${state === 'sent' ? '#166534' : '#128c7e'}`,
                              }}
                            >
                              {state === 'sending' && (
                                <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Abriendo WhatsApp...</>
                              )}
                              {state === 'sent' && (
                                <><CheckCircle className="w-3.5 h-3.5" />Recordatorio enviado ✓</>
                              )}
                              {state === 'idle' && (
                                <>
                                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0" aria-hidden="true">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                  </svg>
                                  Recordar pago por WhatsApp
                                </>
                              )}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div
              className="px-4 py-2.5 flex items-center justify-between gap-2 flex-shrink-0"
              style={{ borderTop: `1px solid ${BORDER}` }}
            >
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
