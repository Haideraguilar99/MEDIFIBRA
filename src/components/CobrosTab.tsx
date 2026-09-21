'use client'
import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, Clock, XCircle, MessageCircle, ChevronDown, ChevronRight, Phone } from 'lucide-react'

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
  confirmed: number
  total: number
  open: boolean
}

const PROTECTED = ['RECOGER_EQUIPO','NOVEDAD_PAGO','NO_PAGA_AUTORIZADO','SUSPENDIDO_TEMP','SUSPENDIDO','USUARIO_PERDIDO']

const DIA_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  '5':  { label: 'DÍA 5',  color: '#dc2626', desc: 'Vencido hace 5 días' },
  '10': { label: 'DÍA 10', color: '#ea580c', desc: 'Vence hoy' },
  '12': { label: 'DÍA 12', color: '#f59e0b', desc: 'Próximos 2 días' },
  '15': { label: 'DÍA 15', color: '#4f6ef7', desc: 'Próximos 5 días' },
  '20': { label: 'DÍA 20', color: '#16a34a', desc: 'Al día' },
  '25': { label: 'DÍA 25', color: '#16a34a', desc: 'Al día' },
  '30': { label: 'DÍA 30', color: '#16a34a', desc: 'Al día' },
}

const STATUS_COLORS: Record<string, string> = {
  AL_DIA: '#6ee7b7',
  PROXIMO_PAGAR: '#fb923c',
  DEUDA_PENDIENTE: '#f87171',
  RECORDAR_RECIBO: '#fbbf24',
}

function fmt(v: number) {
  return '$' + v.toLocaleString('es-CO')
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
  const [saving, setSaving] = useState<number | null>(null)
  const [notified, setNotified] = useState<Record<number,string>>({})
  const [groups, setGroups] = useState<Record<string, GroupState>>({})
  const [localClass, setLocalClass] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, rn] = await Promise.all([
        fetch('/api/cobros'),
        fetch('/api/notifications/resumen')
      ])
      const data = await r.json()
      const dn = await rn.json()
      setNotified(dn.notified || {})
      const list: CobrosClient[] = data.clients || []
      setClients(list)
      const g: Record<string, GroupState> = {}
      for (const dia of ['5','10','12','15','20','25','30']) {
        const group = list.filter(c => c.dia_pago === dia)
        const confirmed = group.filter(c => c.classification === 'AL_DIA').length
        g[dia] = { confirmed, total: group.length, open: ['5','10','12','15'].includes(dia) }
      }
      setGroups(g)
      const lc: Record<number, string> = {}
      list.forEach(c => { lc[c.id] = c.classification })
      setLocalClass(lc)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const markClient = async (clientId: number, action: 'paid' | 'pending' | 'debt') => {
    setSaving(clientId)
    const clsMap = { paid: 'AL_DIA', pending: 'PROXIMO_PAGAR', debt: 'DEUDA_PENDIENTE' }
    const newCls = clsMap[action]
    try {
      if (action === 'paid') {
        const client = clients.find(c => c.id === clientId)!
        const payRes = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            amount: client.plan_value,
            period: new Date().toISOString().slice(0, 7),
            method: 'efectivo',
            status: 'paid',
            notes: 'Confirmado desde módulo Cobros'
          })
        })
        if (!payRes.ok) {
          const e = await payRes.json()
          alert('Error al registrar pago: ' + (e.error || payRes.status))
          return
        }
        // El POST /api/payments ya actualiza classification a AL_DIA
        // No necesitamos segundo PUT
      } else {
        const clsRes = await fetch(`/api/clients/${clientId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ classification: newCls })
        })
        if (!clsRes.ok) {
          alert('Error al actualizar estado del cliente')
          return
        }
      }
      setLocalClass(prev => ({ ...prev, [clientId]: newCls }))
      const client = clients.find(c => c.id === clientId)
      if (client) {
        const dia = client.dia_pago
        setGroups(prev => {
          const g = prev[dia] || { confirmed: 0, total: 0, open: false }
          const wasConfirmed = (localClass[clientId] || client.classification) === 'AL_DIA'
          const isNowConfirmed = newCls === 'AL_DIA'
          const delta = (isNowConfirmed ? 1 : 0) - (wasConfirmed ? 1 : 0)
          return { ...prev, [dia]: { ...g, confirmed: g.confirmed + delta } }
        })
      }
    } catch (err) {
      alert('Error inesperado: ' + String(err))
    } finally { setSaving(null) }
  }

  const toggleGroup = (dia: string) => setGroups(prev => ({ ...prev, [dia]: { ...prev[dia], open: !prev[dia].open } }))

  const totalConfirmed = Object.values(groups).reduce((a, g) => a + g.confirmed, 0)
  const totalClients = clients.length
  const pct = totalClients > 0 ? Math.round((totalConfirmed / totalClients) * 100) : 0

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-sm" style={{ color: MUTED }}>Cargando clientes...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="rounded-xl p-5" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold" style={{ color: TEXT }}>Módulo de Cobros</h2>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>Confirma quién pagó, quién debe y quién está próximo</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black" style={{ color: '#4f6ef7' }}>{totalConfirmed}</span>
            <span className="text-sm font-medium ml-1" style={{ color: MUTED }}>/ {totalClients} confirmados</span>
          </div>
        </div>
        <div className="w-full rounded-full h-2" style={{ backgroundColor: CARD2 }}>
          <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: '#4f6ef7' }}/>
        </div>
        <p className="text-xs mt-1.5 text-right" style={{ color: MUTED }}>{pct}% revisado</p>
      </div>

      <div className="flex flex-wrap gap-3 px-1">
        {[
          { icon: CheckCircle, color: '#6ee7b7', label: 'Pagó este mes' },
          { icon: Clock,       color: '#fb923c', label: 'Pendiente / Próximo' },
          { icon: XCircle,     color: '#f87171', label: 'No ha pagado' },
        ].map(({ icon: Icon, color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" style={{ color }}/>
            <span className="text-xs" style={{ color: MUTED }}>{label}</span>
          </div>
        ))}
      </div>

      {['5','10','12','15','20','25','30'].map(dia => {
        const group = clients.filter(c => c.dia_pago === dia)
        if (group.length === 0) return null
        const g = groups[dia] || { confirmed: 0, total: group.length, open: false }
        const diaInfo = DIA_LABELS[dia]
        const gpct = g.total > 0 ? Math.round((g.confirmed / g.total) * 100) : 0

        return (
          <div key={dia} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            <button onClick={() => toggleGroup(dia)}
              className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:opacity-90"
              style={{ backgroundColor: CARD }}>
              <div className="flex items-center gap-3">
                {g.open ? <ChevronDown className="w-4 h-4" style={{ color: MUTED }}/> : <ChevronRight className="w-4 h-4" style={{ color: MUTED }}/>}
                <span className="font-bold text-sm" style={{ color: diaInfo.color }}>{diaInfo.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: diaInfo.color + '22', color: diaInfo.color }}>{diaInfo.desc}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm font-bold" style={{ color: TEXT }}>{g.confirmed}/{g.total}</span>
                  <span className="text-xs ml-1" style={{ color: MUTED }}>confirmados</span>
                </div>
                <div className="w-20 rounded-full h-1.5" style={{ backgroundColor: CARD2 }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${gpct}%`, backgroundColor: diaInfo.color }}/>
                </div>
              </div>
            </button>

            {g.open && (
              <div style={{ backgroundColor: BG }}>
                {group.map((c, i) => {
                  const cls = localClass[c.id] || c.classification
                  const clsColor = STATUS_COLORS[cls] || '#94a3b8'
                  const isSaving = saving === c.id
                  const isProt = PROTECTED.includes(cls)
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 text-sm"
                      style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined, opacity: isSaving ? 0.6 : 1 }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate" style={{ color: TEXT }}>{c.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: clsColor + '20', color: clsColor }}>
                            {cls.replace(/_/g,' ')}
                          </span>
                          {isProt && <span className="text-xs" style={{ color: MUTED }}>● protegido</span>}
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
                      {!isProt ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => markClient(c.id, 'paid')} disabled={isSaving || cls === 'AL_DIA'} title="Pagó"
                            className="p-1.5 rounded-lg transition-all disabled:opacity-30"
                            style={{ backgroundColor: cls === 'AL_DIA' ? '#6ee7b720' : CARD, border: `1px solid ${cls === 'AL_DIA' ? '#6ee7b7' : BORDER}` }}>
                            <CheckCircle className="w-4 h-4" style={{ color: '#6ee7b7' }}/>
                          </button>
                          <button onClick={() => markClient(c.id, 'pending')} disabled={isSaving || cls === 'PROXIMO_PAGAR'} title="Pendiente"
                            className="p-1.5 rounded-lg transition-all disabled:opacity-30"
                            style={{ backgroundColor: cls === 'PROXIMO_PAGAR' ? '#fb923c20' : CARD, border: `1px solid ${cls === 'PROXIMO_PAGAR' ? '#fb923c' : BORDER}` }}>
                            <Clock className="w-4 h-4" style={{ color: '#fb923c' }}/>
                          </button>
                          <button onClick={() => markClient(c.id, 'debt')} disabled={isSaving || cls === 'DEUDA_PENDIENTE'} title="No pagó"
                            className="p-1.5 rounded-lg transition-all disabled:opacity-30"
                            style={{ backgroundColor: cls === 'DEUDA_PENDIENTE' ? '#f8717120' : CARD, border: `1px solid ${cls === 'DEUDA_PENDIENTE' ? '#f87171' : BORDER}` }}>
                            <XCircle className="w-4 h-4" style={{ color: '#f87171' }}/>
                          </button>
                          <div className="flex flex-col items-center gap-0.5">
                            <button onClick={() => onOpenWA(c)} title="WhatsApp"
                              className="p-1.5 rounded-lg transition-all"
                              style={{ backgroundColor: notified[c.id] ? '#25d36620' : CARD, border: `1px solid ${notified[c.id] ? '#25d366' : BORDER}` }}>
                              <MessageCircle className="w-4 h-4" style={{ color: '#25d366' }}/>
                            </button>
                            {notified[c.id] && (
                              <span className="leading-none" style={{ color: '#25d366', fontSize: '9px' }}>
                                {new Date(notified[c.id]).toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded" style={{ color: MUTED, backgroundColor: CARD }}>Sin acción</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
