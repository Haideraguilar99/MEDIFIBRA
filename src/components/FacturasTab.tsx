'use client'
import { useEffect, useState, useCallback } from 'react'
import { FileText, MessageCircle, CheckCircle, Calendar } from 'lucide-react'

type FacturaClient = {
  id: number
  name: string
  cellphone: string
  plan: string
  plan_value: number
  incluye_tv: number
  dia_pago: string
  has_invoice: number
}

const DIAS = ['5','10','12','15','20','25','30']
const LOCK_HOURS = 12

function fmt(v: number) { return '$' + v.toLocaleString('es-CO') }

function getActiveDia(): string {
  const today = new Date()
  const target = today.getDate() + 5
  for (const dia of DIAS) { if (parseInt(dia) >= target) return dia }
  return '5'
}

function getCurrentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
}

function hoursAgo(isoStr: string): number {
  return (Date.now() - new Date(isoStr + (isoStr.endsWith('Z') ? '' : 'Z')).getTime()) / 3600000
}

export default function FacturasTab({
  BG, CARD, CARD2, BORDER, TEXT, MUTED
}: {
  BG: string; CARD: string; CARD2: string; BORDER: string; TEXT: string; MUTED: string
}) {
  const [activeTab, setActiveTab] = useState<string>(getActiveDia())
  const [allClients, setAllClients] = useState<FacturaClient[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<number|null>(null)
  // enviadoTs: timestamp ISO cuando se genero+envio la factura (local, 12h)
  const [enviadoTs, setEnviadoTs] = useState<Record<number, string>>({})

  const period = getCurrentPeriod()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/facturas-pendientes?period=${period}`)
      if (!r.ok) throw new Error('Error')
      const data = await r.json()
      setAllClients(data.clients as FacturaClient[])
    } catch {}
    finally { setLoading(false) }
  }, [period])

  useEffect(() => { load() }, [load])

  // Determina si un cliente esta bloqueado: ya tenia factura en DB O se genero en esta sesion (<12h)
  function isLocked(c: FacturaClient): boolean {
    if (c.has_invoice) return true
    const ts = enviadoTs[c.id]
    if (!ts) return false
    return hoursAgo(ts) < LOCK_HOURS
  }

  const generarYEnviar = async (c: FacturaClient) => {
    if (isLocked(c)) return
    setSending(c.id)
    try {
      const r = await fetch('/api/invoices/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, dia_pago: c.dia_pago }),
      })
      if (!r.ok) { alert('Error al generar factura'); return }

      const phone = (c.cellphone ?? '').replace(/\D/g, '')
      const monto = fmt(c.plan_value + (c.incluye_tv || 0))
      const linkFactura = `${window.location.origin}/factura/${c.id}`
      const msg = encodeURIComponent(
        `Medifibra S.A.S -- Factura de Servicio\n\nHola ${c.name},\n\nTe enviamos tu factura correspondiente al periodo ${period}.\n\nPlan: ${c.plan}\nValor: ${monto}\n\nVer factura: ${linkFactura}\n\nRealiza tu pago antes del dia ${c.dia_pago} de este mes.\n-- Medifibra S.A.S | 333 728 8745`
      )
      window.open(`https://wa.me/57${phone}?text=${msg}`, '_blank')

      setEnviadoTs(prev => ({ ...prev, [c.id]: new Date().toISOString() }))
      // Marcar en el state local como has_invoice para que quede bloqueado
      setAllClients(prev => prev.map(x => x.id === c.id ? { ...x, has_invoice: 1 } : x))
    } catch {
      alert('Error inesperado')
    } finally {
      setSending(null)
    }
  }

  const tabClients = allClients.filter(c => c.dia_pago === activeTab)
  const pendientes = tabClients.filter(c => !isLocked(c))
  const activeDia  = getActiveDia()

  return (
    <div className="space-y-4 max-w-5xl mx-auto">

      {/* Header */}
      <div className="rounded-xl p-5" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-3 mb-1">
          <Calendar className="w-5 h-5" style={{ color: '#4f6ef7' }}/>
          <h2 className="text-base font-bold" style={{ color: TEXT }}>Facturacion por Fecha</h2>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: '#4f6ef720', color: '#4f6ef7' }}>
            Periodo {period}
          </span>
        </div>
        <p className="text-xs" style={{ color: MUTED }}>
          Genera y envia la factura a cada cliente 5 dias antes de su fecha de pago. La pestana resaltada es la que vence hoy +5 dias.
        </p>
      </div>

      {/* Pestanas */}
      <div className="flex gap-2 flex-wrap">
        {DIAS.map(dia => {
          const grupo = allClients.filter(c => c.dia_pago === dia)
          const pend  = grupo.filter(c => !isLocked(c)).length
          const isActive   = dia === activeDia
          const isSelected = dia === activeTab
          return (
            <button key={dia} onClick={() => setActiveTab(dia)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                backgroundColor: isSelected ? '#4f6ef7' : isActive ? '#4f6ef720' : CARD,
                color: isSelected ? '#ffffff' : isActive ? '#4f6ef7' : MUTED,
                border: `2px solid ${isSelected ? '#4f6ef7' : isActive ? '#4f6ef7' : BORDER}`,
              }}>
              Dia {dia}
              {pend > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-black"
                  style={{
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#f8717120',
                    color: isSelected ? '#ffffff' : '#f87171',
                  }}>
                  {pend}
                </span>
              )}
              {isActive && !isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"/>
              )}
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : tabClients.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#6ee7b7' }}/>
          <p className="font-semibold" style={{ color: TEXT }}>Sin clientes en dia {activeTab}</p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>No hay clientes activos con fecha de pago dia {activeTab}.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: CARD2, borderBottom: `1px solid ${BORDER}` }}>
            <span className="text-sm font-bold" style={{ color: TEXT }}>
              Dia {activeTab} — {tabClients.length} clientes
              {pendientes.length < tabClients.length && (
                <span className="ml-2 text-xs font-medium" style={{ color: '#6ee7b7' }}>
                  ({tabClients.length - pendientes.length} ya facturados)
                </span>
              )}
            </span>
            {pendientes.length > 0 && (
              <button
                onClick={async () => {
                  if (!confirm(`Generar y enviar factura a ${pendientes.length} clientes pendientes del dia ${activeTab}?`)) return
                  for (const c of pendientes) { await generarYEnviar(c) }
                }}
                className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all"
                style={{ backgroundColor: '#4f6ef720', color: '#4f6ef7', border: '1px solid #4f6ef7' }}>
                Enviar pendientes ({pendientes.length})
              </button>
            )}
          </div>

          {tabClients.map((c, i) => {
            const locked    = isLocked(c)
            const isSending = sending === c.id
            const ts        = enviadoTs[c.id]
            const fromDb    = !!c.has_invoice && !ts

            return (
              <div key={c.id}
                className="flex items-center gap-3 px-4 py-3.5 text-sm"
                style={{
                  backgroundColor: locked ? (i % 2 === 0 ? CARD : BG) : (i % 2 === 0 ? CARD : BG),
                  borderTop: i > 0 ? `1px solid ${BORDER}` : undefined,
                  opacity: isSending ? 0.6 : 1,
                }}>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold" style={{ color: locked ? MUTED : TEXT }}>{c.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: '#4f6ef720', color: '#4f6ef7' }}>
                      {c.plan}
                    </span>
                    {c.incluye_tv > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
                        + MediTV
                      </span>
                    )}
                    {locked && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                        style={{ backgroundColor: '#6ee7b715', color: '#6ee7b7', border: '1px solid #6ee7b740' }}>
                        <CheckCircle className="w-3 h-3"/>
                        {fromDb ? 'Factura generada' : 'Factura enviada'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs" style={{ color: MUTED }}>{c.cellphone || '—'}</span>
                    <span className="text-xs font-bold" style={{ color: locked ? MUTED : '#6ee7b7' }}>
                      {fmt(c.plan_value + (c.incluye_tv || 0))}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={`/factura/${c.id}`} target="_blank" rel="noopener noreferrer"
                    title="Ver factura PDF"
                    className="p-1.5 rounded-lg"
                    style={{ backgroundColor: CARD2, border: `1px solid ${BORDER}`, color: MUTED }}>
                    <FileText className="w-3.5 h-3.5"/>
                  </a>
                  {locked ? (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ backgroundColor: CARD2, color: MUTED, border: `1px solid ${BORDER}`, cursor: 'default' }}>
                      <CheckCircle className="w-3.5 h-3.5"/>
                      <span>Enviada</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => generarYEnviar(c)}
                      disabled={isSending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      style={{ backgroundColor: '#25d36620', color: '#25d366', border: '1px solid #25d366' }}>
                      {isSending
                        ? <div className="w-3.5 h-3.5 border border-green-500 border-t-transparent rounded-full animate-spin"/>
                        : <MessageCircle className="w-3.5 h-3.5"/>}
                      <span>{isSending ? 'Enviando...' : 'Generar y enviar'}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
