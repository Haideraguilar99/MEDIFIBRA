'use client'
import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, MessageCircle, ChevronDown, ChevronRight, Phone, Send } from 'lucide-react'

type CobrosClient = {
  id: number
  name: string
  cellphone: string
  plan: string
  plan_value: number
  classification: string
  dia_pago: string
  incluye_tv: number
}

type GroupState = {
  total: number
  open: boolean
}

const PROTECTED = ['RECOGER_EQUIPO','NOVEDAD_PAGO','NO_PAGA_AUTORIZADO','SUSPENDIDO_TEMP','SUSPENDIDO','USUARIO_PERDIDO']

const DIA_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  '5':  { label: 'DIA 5',  color: '#dc2626', desc: 'Vencido' },
  '10': { label: 'DIA 10', color: '#ea580c', desc: 'Vence hoy' },
  '12': { label: 'DIA 12', color: '#f59e0b', desc: 'Proximos 2 dias' },
  '15': { label: 'DIA 15', color: '#4f6ef7', desc: 'Proximos 5 dias' },
  '20': { label: 'DIA 20', color: '#16a34a', desc: 'Al dia' },
  '25': { label: 'DIA 25', color: '#16a34a', desc: 'Al dia' },
  '30': { label: 'DIA 30', color: '#16a34a', desc: 'Al dia' },
}

function fmt(v: number) {
  return '$' + v.toLocaleString('es-CO')
}

function minutesAgo(isoStr: string): number {
  const sent = new Date(isoStr + 'Z').getTime()
  return Math.floor((Date.now() - sent) / 60000)
}

export default function CobrosTab({
  BG, CARD, CARD2, BORDER, TEXT, MUTED,
  onOpenWA
}: {
  BG: string; CARD: string; CARD2: string; BORDER: string; TEXT: string; MUTED: string
  onOpenWA: (c: CobrosClient) => void
}) {
  const [clients, setClients] = useState<CobrosClient[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<number | null>(null)
  const [cobradoTs, setCobradoTs] = useState<Record<number, string>>({})
  const [groups, setGroups] = useState<Record<string, GroupState>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/cobros')
      const data = await r.json()
      const list: CobrosClient[] = (data.clients || []).filter(
        (c: CobrosClient) => c.classification !== 'AL_DIA'
      )
      setClients(list)

      const g: Record<string, GroupState> = {}
      for (const dia of ['5','10','12','15','20','25','30']) {
        const group = list.filter(c => c.dia_pago === dia)
        g[dia] = { total: group.length, open: ['5','10','12','15'].includes(dia) }
      }
      setGroups(g)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const enviarCobro = async (c: CobrosClient) => {
    setSending(c.id)
    try {
      const phone = (c.cellphone ?? '').replace(/\D/g, '')
      const monto = fmt(c.plan_value + (c.incluye_tv || 0))
      const msg = encodeURIComponent(
        `Medifibra S.A.S -- Cobro\n\nHola ${c.name},\n\nTe recordamos que tienes un pago pendiente.\n\nPlan: ${c.plan}\nValor: ${monto}\n\nEnvianos tu comprobante a este WhatsApp una vez realices el pago.\n-- Medifibra S.A.S | 333 728 8745`
      )
      window.open(`https://wa.me/57${phone}?text=${msg}`, '_blank')

      await fetch('/api/notifications/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: c.id,
          channel: 'whatsapp',
          type: 'cobro_enviado',
          message: `Cobro enviado a ${c.name}`,
          status: 'sent',
        }),
      })
      setCobradoTs(prev => ({ ...prev, [c.id]: new Date().toISOString() }))
    } catch {}
    finally { setSending(null) }
  }

  const markPaid = async (clientId: number, planValue: number) => {
    try {
      await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          amount: planValue,
          period: new Date().toISOString().slice(0, 7),
          method: 'efectivo',
          status: 'paid',
          notes: 'Confirmado desde modulo Cobros',
        }),
      })
      setClients(prev => prev.filter(c => c.id !== clientId))
      setGroups(prev => {
        const client = clients.find(c => c.id === clientId)
        if (!client) return prev
        const dia = client.dia_pago
        const g = prev[dia]
        if (!g) return prev
        return { ...prev, [dia]: { ...g, total: Math.max(0, g.total - 1) } }
      })
    } catch {
      alert('Error al registrar pago')
    }
  }

  const toggleGroup = (dia: string) =>
    setGroups(prev => ({ ...prev, [dia]: { ...prev[dia], open: !prev[dia].open } }))

  const totalPendiente = clients.length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-sm" style={{ color: MUTED }}>Cargando cobros...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="rounded-xl p-5" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold" style={{ color: TEXT }}>Modulo de Cobros</h2>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>Clientes con pago pendiente — los que pagan desaparecen automaticamente</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black" style={{ color: '#f87171' }}>{totalPendiente}</span>
            <span className="text-sm font-medium ml-1" style={{ color: MUTED }}>pendientes</span>
          </div>
        </div>
      </div>

      {['5','10','12','15','20','25','30'].map(dia => {
        const group = clients.filter(c => c.dia_pago === dia)
        if (group.length === 0) return null
        const g = groups[dia] || { total: group.length, open: false }
        const diaInfo = DIA_LABELS[dia]

        return (
          <div key={dia} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            <button onClick={() => toggleGroup(dia)}
              className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:opacity-90"
              style={{ backgroundColor: CARD }}>
              <div className="flex items-center gap-3">
                {g.open
                  ? <ChevronDown className="w-4 h-4" style={{ color: MUTED }}/>
                  : <ChevronRight className="w-4 h-4" style={{ color: MUTED }}/>}
                <span className="font-bold text-sm" style={{ color: diaInfo.color }}>{diaInfo.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: diaInfo.color + '22', color: diaInfo.color }}>{diaInfo.desc}</span>
              </div>
              <span className="text-sm font-bold" style={{ color: TEXT }}>{group.length} pendientes</span>
            </button>

            {g.open && (
              <div style={{ backgroundColor: BG }}>
                {group.map((c, i) => {
                  const isProt = PROTECTED.includes(c.classification)
                  const isSending = sending === c.id
                  const ts = cobradoTs[c.id]
                  const mins = ts ? minutesAgo(ts) : null
                  const recentlySent = mins !== null && mins < 120

                  return (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 text-sm"
                      style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate" style={{ color: TEXT }}>{c.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: '#f8717120', color: '#f87171' }}>
                            {c.classification.replace(/_/g,' ')}
                          </span>
                          {isProt && <span className="text-xs" style={{ color: MUTED }}>protegido</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs" style={{ color: MUTED }}>
                            <Phone className="w-3 h-3"/>{c.cellphone || '—'}
                          </span>
                          <span className="text-xs font-medium" style={{ color: '#4f6ef7' }}>{c.plan}</span>
                          <span className="text-xs font-bold" style={{ color: TEXT }}>{fmt(c.plan_value)}</span>
                          {c.incluye_tv > 0 && <span className="text-xs" style={{ color: MUTED }}>+ TV</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {recentlySent && (
                          <span className="text-xs px-2 py-1 rounded-full font-semibold"
                            style={{ backgroundColor: '#25d36620', color: '#25d366' }}>
                            Enviado hace {mins}m
                          </span>
                        )}
                        {!isProt && (
                          <>
                            <button
                              onClick={() => enviarCobro(c)}
                              disabled={isSending}
                              title="Enviar cobro por WhatsApp"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                              style={{
                                backgroundColor: recentlySent ? '#25d36620' : '#dcfce7',
                                color: '#16a34a',
                                border: `1px solid ${recentlySent ? '#25d366' : '#bbf7d0'}`,
                              }}>
                              {isSending
                                ? <div className="w-3.5 h-3.5 border border-green-600 border-t-transparent rounded-full animate-spin"/>
                                : <Send className="w-3.5 h-3.5"/>}
                              <span className="hidden sm:inline">{recentlySent ? 'Reenviar' : 'Enviar'}</span>
                            </button>
                            <button
                              onClick={() => markPaid(c.id, c.plan_value)}
                              title="Marcar como pagado — desaparece de la lista"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                              style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                              <CheckCircle className="w-3.5 h-3.5"/>
                              <span className="hidden sm:inline">Cobrado</span>
                            </button>
                            <button onClick={() => onOpenWA(c)} title="WhatsApp personalizado"
                              className="p-1.5 rounded-lg transition-all"
                              style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
                              <MessageCircle className="w-4 h-4" style={{ color: '#25d366' }}/>
                            </button>
                          </>
                        )}
                        {isProt && (
                          <span className="text-xs px-2 py-1 rounded" style={{ color: MUTED, backgroundColor: CARD }}>Sin accion</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {totalPendiente === 0 && (
        <div className="rounded-xl p-12 text-center" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#6ee7b7' }}/>
          <p className="font-semibold" style={{ color: TEXT }}>Todos al dia</p>
          <p className="text-sm mt-1" style={{ color: MUTED }}>No hay cobros pendientes por ahora</p>
        </div>
      )}
    </div>
  )
}
