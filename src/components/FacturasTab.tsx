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
  has_invoice: boolean
}

const DIAS = ['5','10','12','15','20','25','30']

function fmt(v: number) { return '$' + v.toLocaleString('es-CO') }

function getActiveDia(): string {
  const today = new Date()
  const d = today.getDate()
  const target = d + 5
  // Buscar el día fijo >= target dentro del mes
  for (const dia of DIAS) {
    if (parseInt(dia) >= target) return dia
  }
  // Si ninguno en este mes, el primero del siguiente (día 5)
  return '5'
}

function getCurrentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
}

export default function FacturasTab({
  BG, CARD, CARD2, BORDER, TEXT, MUTED
}: {
  BG: string; CARD: string; CARD2: string; BORDER: string; TEXT: string; MUTED: string
}) {
  const [activeTab, setActiveTab]     = useState<string>(getActiveDia())
  const [clients,   setClients]       = useState<Record<string, FacturaClient[]>>({})
  const [loading,   setLoading]       = useState(true)
  const [sending,   setSending]       = useState<number|null>(null)
  const [done,      setDone]          = useState<Record<number, boolean>>({})

  const period = getCurrentPeriod()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Cargar clientes activos con su dia_pago y si ya tienen factura este período
      const r = await fetch(`/api/facturas-pendientes?period=${period}`)
      if (!r.ok) throw new Error('Error cargando')
      const data = await r.json()
      const map: Record<string, FacturaClient[]> = {}
      for (const dia of DIAS) { map[dia] = [] }
      for (const c of (data.clients as FacturaClient[])) {
        if (map[c.dia_pago] && !c.has_invoice) {
          map[c.dia_pago].push(c)
        }
      }
      setClients(map)
    } catch {}
    finally { setLoading(false) }
  }, [period])

  useEffect(() => { load() }, [load])

  const generarYEnviar = async (c: FacturaClient) => {
    setSending(c.id)
    try {
      // 1. Generar factura individual
      const r = await fetch('/api/invoices/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, dia_pago: c.dia_pago }),
      })
      if (!r.ok) { alert('Error al generar factura'); return }

      // 2. Abrir WhatsApp con link a la factura
      const phone = (c.cellphone ?? '').replace(/\D/g, '')
      const monto = fmt(c.plan_value + (c.incluye_tv || 0))
      const linkFactura = `${window.location.origin}/factura/${c.id}`
      const msg = encodeURIComponent(
        `Medifibra S.A.S -- Factura de Servicio\n\nHola ${c.name},\n\nTe enviamos tu factura correspondiente al periodo ${period}.\n\nPlan: ${c.plan}\nValor: ${monto}\n\nVer factura: ${linkFactura}\n\nRealiza tu pago antes del dia ${c.dia_pago} de este mes.\n-- Medifibra S.A.S | 333 728 8745`
      )
      window.open(`https://wa.me/57${phone}?text=${msg}`, '_blank')

      // 3. Marcar como hecho localmente
      setDone(prev => ({ ...prev, [c.id]: true }))
      setClients(prev => ({
        ...prev,
        [c.dia_pago]: (prev[c.dia_pago] || []).filter(x => x.id !== c.id)
      }))
    } catch {
      alert('Error inesperado')
    } finally {
      setSending(null)
    }
  }

  const tabClients = clients[activeTab] || []
  const activeDia  = getActiveDia()

  const diaLabel = (dia: string) => {
    const count = (clients[dia] || []).length
    return { count, isActive: dia === activeDia }
  }

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

      {/* Pestanas por dia */}
      <div className="flex gap-2 flex-wrap">
        {DIAS.map(dia => {
          const { count, isActive } = diaLabel(dia)
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
              {count > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-black"
                  style={{
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#f8717120',
                    color: isSelected ? '#ffffff' : '#f87171',
                  }}>
                  {count}
                </span>
              )}
              {isActive && !isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"/>
              )}
            </button>
          )
        })}
      </div>

      {/* Lista de clientes de la pestana activa */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : tabClients.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#6ee7b7' }}/>
          <p className="font-semibold" style={{ color: TEXT }}>Dia {activeTab} al dia</p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            Todos los clientes con fecha de pago dia {activeTab} ya tienen su factura generada este periodo.
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: CARD2, borderBottom: `1px solid ${BORDER}` }}>
            <span className="text-sm font-bold" style={{ color: TEXT }}>
              Clientes dia {activeTab} — {tabClients.length} pendientes
            </span>
            <button
              onClick={async () => {
                if (!confirm(`Generar y enviar factura a los ${tabClients.length} clientes del dia ${activeTab}?`)) return
                for (const c of tabClients) { await generarYEnviar(c) }
              }}
              className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all"
              style={{ backgroundColor: '#4f6ef720', color: '#4f6ef7', border: '1px solid #4f6ef7' }}>
              Enviar todos ({tabClients.length})
            </button>
          </div>

          {tabClients.map((c, i) => {
            const isSending = sending === c.id
            const isDone = done[c.id]
            return (
              <div key={c.id}
                className="flex items-center gap-3 px-4 py-3.5 text-sm transition-all"
                style={{
                  backgroundColor: isDone ? '#6ee7b708' : i % 2 === 0 ? CARD : BG,
                  borderTop: i > 0 ? `1px solid ${BORDER}` : undefined,
                  opacity: isSending ? 0.6 : 1,
                }}>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold" style={{ color: TEXT }}>{c.name}</span>
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
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs" style={{ color: MUTED }}>{c.cellphone || '—'}</span>
                    <span className="text-xs font-bold" style={{ color: '#6ee7b7' }}>
                      {fmt(c.plan_value + (c.incluye_tv || 0))}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={`/factura/${c.id}`} target="_blank" rel="noopener noreferrer"
                    title="Ver factura PDF"
                    className="p-1.5 rounded-lg transition-all"
                    style={{ backgroundColor: CARD2, border: `1px solid ${BORDER}`, color: MUTED }}>
                    <FileText className="w-3.5 h-3.5"/>
                  </a>
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
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
