'use client'
import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, ChevronDown, ChevronRight, Phone, FileText, AlertTriangle, Clock } from 'lucide-react'
import { nombreLimpio } from '@/lib/wa-templates'

type CobranzaClient = {
  id: number
  name: string
  cellphone: string
  plan: string
  plan_value: number
  classification: string
  dia_pago: string
  incluye_tv: number
  puntos_tv: number
  cobro_enviado_at?: string
  has_invoice?: number
}

// Días reales de la BD — en orden numérico
const DIAS = ['1', '5', '15', '20', '25', '30']

const EMPRESA  = 'Medifibra S.A.S'
const WA       = '333 728 8745'
const CUENTA   = '00995202514'
const OBSERVACION_ACTIVA = true
const OBS = 'Observacion: a partir de octubre se realizara un ajuste minimo en el valor de nuestros planes. Agradecemos tu comprension y confianza en MEDIFIBRA.'

function fmt(v: number) { return '$' + v.toLocaleString('es-CO') }

function hoursAgo(iso: string): number {
  return (Date.now() - new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).getTime()) / 3_600_000
}

function getCurrentPeriod(): string {
  const n = new Date()
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0')
}

function buildMensaje(c: CobranzaClient, linkFactura: string): string {
  const nombre = nombreLimpio(c.name)
  const monto  = fmt(c.plan_value)
  const tv     = c.incluye_tv > 0
  const puntos = c.puntos_tv || 0
  const partes: string[] = [
    `*${EMPRESA.toUpperCase()}* | Recordatorio de pago`,
    '',
    `Hola ${nombre},`,
    '',
    'Te informamos que tu fecha de pago se acerca. A continuacion el detalle de tu servicio:',
    '',
    `*Plan:* ${c.plan}`,
  ]
  if (tv) {
    partes.push(`*MediTV:* incluido (${puntos} punto${puntos !== 1 ? 's' : ''} TV)`)
  }
  partes.push(
    `*Fecha de pago:* dia ${c.dia_pago} de cada mes`,
    `*Valor a pagar:* ${monto}`,
    '',
    `*Ver factura:* ${linkFactura}`,
    '',
    '*Medios de pago:*',
    `  • Bancolombia Ahorros: ${CUENTA}`,
    '  • Nequi: 3015080961',
    '  • Efectivo: comunicate con nosotros',
    '',
    'Envianos el comprobante a este WhatsApp una vez realices el pago.'
  )
  if (OBSERVACION_ACTIVA) {
    partes.push('', OBS)
  }
  partes.push('', `${EMPRESA} | ${WA}`)
  return partes.join('\n')
}

// Badge de clasificación
function ClaseBadge({ cls }: { cls: string }) {
  const esSusp = cls === 'SUSPENDIDO_TEMP'
  return (
    <span
      className='text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1'
      style={{
        backgroundColor: esSusp ? '#f8717120' : '#fb923c20',
        color:           esSusp ? '#f87171'   : '#fb923c',
        border:          `1px solid ${esSusp ? '#f8717140' : '#fb923c40'}`,
      }}
    >
      {esSusp
        ? <><AlertTriangle className='w-3 h-3' />Suspendido Temp</>
        : <><Clock className='w-3 h-3' />Próximo a pagar</>}
    </span>
  )
}

export default function CobranzasTab({
  BG, CARD, BORDER, TEXT, MUTED,
}: {
  BG: string; CARD: string; CARD2?: string; BORDER: string; TEXT: string; MUTED: string
}) {
  const [clients,   setClients]   = useState<CobranzaClient[]>([])
  const [loading,   setLoading]   = useState(true)
  const [sending,   setSending]   = useState<number | null>(null)
  const [cobradoTs, setCobradoTs] = useState<Record<number, string>>({})
  const [enviadoTs, setEnviadoTs] = useState<Record<number, string>>({})
  const [openDias,  setOpenDias]  = useState<Record<string, boolean>>({})
  const period = getCurrentPeriod()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rc, rf] = await Promise.all([
        fetch('/api/cobros'),
        fetch(`/api/facturas-pendientes?period=${getCurrentPeriod()}`),
      ])
      const dc = await rc.json()
      const df = await rf.json()

      const cobros: CobranzaClient[] = dc.clients || []
      const factMap: Record<number, number> = {}
      ;(df.clients || []).forEach((f: { id: number; has_invoice: number }) => {
        factMap[f.id] = f.has_invoice
      })

      const merged = cobros.map(c => ({ ...c, has_invoice: factMap[c.id] ?? 0 }))
      setClients(merged)

      // Marcar enviados recientes
      const ts: Record<number, string> = {}
      merged.forEach(c => {
        if (c.cobro_enviado_at && hoursAgo(c.cobro_enviado_at) < 12) {
          ts[c.id] = c.cobro_enviado_at
        }
      })
      setCobradoTs(ts)

      // Abrir automáticamente todas las pestañas que tengan clientes
      const open: Record<string, boolean> = {}
      DIAS.forEach(d => {
        const tieneClientes = merged.some(c => c.dia_pago === d)
        open[d] = tieneClientes
      })
      setOpenDias(open)
    } catch (e) {
      console.error('[CobranzasTab] error cargando:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toggleDia = (dia: string) => {
    setOpenDias(prev => ({ ...prev, [dia]: !prev[dia] }))
  }

  const generarFactura = async (c: CobranzaClient): Promise<string | null> => {
    try {
      const r = await fetch('/api/invoices/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, dia_pago: c.dia_pago }),
      })
      if (!r.ok) { alert('Error al generar factura'); return null }
      return `https://medifibra-filc.vercel.app/factura/${c.id}`
    } catch {
      return null
    }
  }

  const enviarCobranza = async (c: CobranzaClient, incluirFactura: boolean) => {
    setSending(c.id)
    try {
      let link = `https://medifibra-filc.vercel.app/factura/${c.id}`
      if (incluirFactura) {
        const generado = await generarFactura(c)
        if (!generado) { setSending(null); return }
        link = generado
        setEnviadoTs(prev => ({ ...prev, [c.id]: new Date().toISOString() }))
        setClients(prev => prev.map(x => x.id === c.id ? { ...x, has_invoice: 1 } : x))
      }
      const phone = (c.cellphone ?? '').replace(/\D/g, '')
      const msg   = encodeURIComponent(buildMensaje(c, link))
      window.open(`https://wa.me/57${phone}?text=${msg}`, '_blank')
      await fetch('/api/notifications/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: c.id, channel: 'whatsapp',
          type: 'cobro_enviado', message: `Cobranza enviada a ${c.name}`, status: 'sent',
        }),
      })
      setCobradoTs(prev => ({ ...prev, [c.id]: new Date().toISOString() }))
    } catch (e) {
      console.error('[CobranzasTab] error enviando:', e)
    } finally {
      setSending(null)
    }
  }

  if (loading) return (
    <div className='flex items-center justify-center h-64'>
      <div className='text-center'>
        <div className='w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3' />
        <p className='text-sm' style={{ color: MUTED }}>Cargando cobranzas...</p>
      </div>
    </div>
  )

  // Totales para el header
  const totalClientes  = clients.length
  const totalSuspTemp  = clients.filter(c => c.classification === 'SUSPENDIDO_TEMP').length
  const totalProximo   = clients.filter(c => c.classification === 'PROXIMO_PAGAR').length

  // Días que realmente tienen clientes (puede haber días fuera de DIAS)
  const diasConClientes = Array.from(new Set(clients.map(c => c.dia_pago)))
    .sort((a, b) => parseInt(a) - parseInt(b))

  return (
    <div className='space-y-4 max-w-5xl mx-auto'>

      {/* Header */}
      <div className='rounded-xl p-4' style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
        <div className='flex items-center justify-between flex-wrap gap-3'>
          <div>
            <h2 className='text-base font-bold' style={{ color: TEXT }}>Cobranzas</h2>
            <p className='text-xs mt-0.5' style={{ color: MUTED }}>
              Periodo {period} — clientes Próximos a pagar y Suspendidos temporalmente
            </p>
          </div>
          <div className='flex items-center gap-4 flex-wrap'>
            <div className='text-center'>
              <div className='text-xl font-black' style={{ color: '#fb923c' }}>{totalProximo}</div>
              <div className='text-xs' style={{ color: MUTED }}>Próximos</div>
            </div>
            <div className='text-center'>
              <div className='text-xl font-black' style={{ color: '#f87171' }}>{totalSuspTemp}</div>
              <div className='text-xs' style={{ color: MUTED }}>Susp. Temp</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-black' style={{ color: '#f87171' }}>{totalClientes}</div>
              <div className='text-xs' style={{ color: MUTED }}>Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pestañas por día — dinámicas según clientes reales */}
      {diasConClientes.map(dia => {
        const grupo     = clients.filter(c => c.dia_pago === dia)
        const isOpen    = openDias[dia] ?? true
        const nSusp     = grupo.filter(c => c.classification === 'SUSPENDIDO_TEMP').length
        const nProximo  = grupo.filter(c => c.classification === 'PROXIMO_PAGAR').length

        return (
          <div key={dia} className='rounded-xl overflow-hidden'
            style={{ border: `1px solid ${nSusp > 0 ? '#f8717160' : '#4f6ef760'}` }}>

            {/* Cabecera de la pestaña */}
            <button
              onClick={() => toggleDia(dia)}
              className='w-full flex items-center justify-between px-4 py-3 transition-colors'
              style={{ backgroundColor: CARD }}
            >
              <div className='flex items-center gap-3 flex-wrap'>
                {isOpen
                  ? <ChevronDown  className='w-4 h-4' style={{ color: MUTED }} />
                  : <ChevronRight className='w-4 h-4' style={{ color: MUTED }} />}
                <span className='font-bold text-sm' style={{ color: '#4f6ef7' }}>
                  Día {dia}
                </span>
                {nSusp > 0 && (
                  <span className='text-xs px-2 py-0.5 rounded-full font-semibold'
                    style={{ backgroundColor: '#f8717120', color: '#f87171', border: '1px solid #f8717140' }}>
                    {nSusp} suspendido{nSusp > 1 ? 's' : ''}
                  </span>
                )}
                {nProximo > 0 && (
                  <span className='text-xs px-2 py-0.5 rounded-full font-semibold'
                    style={{ backgroundColor: '#fb923c20', color: '#fb923c', border: '1px solid #fb923c40' }}>
                    {nProximo} próximo{nProximo > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <span className='text-sm font-bold' style={{ color: TEXT }}>
                {grupo.length} cliente{grupo.length !== 1 ? 's' : ''}
              </span>
            </button>

            {/* Lista de clientes */}
            {isOpen && (
              <div style={{ backgroundColor: BG }}>
                {grupo.map((c, i) => {
                  const isSending       = sending === c.id
                  const recentlySent    = cobradoTs[c.id] ? hoursAgo(cobradoTs[c.id]) < 12 : false
                  const facturaEnviada  = !!c.has_invoice || !!enviadoTs[c.id]

                  return (
                    <div key={c.id} className='px-4 py-3 text-sm'
                      style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}>
                      <div className='flex items-start justify-between gap-3 flex-wrap'>

                        {/* Info del cliente */}
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2 flex-wrap'>
                            <span className='font-semibold' style={{ color: TEXT }}>{c.name}</span>
                            <ClaseBadge cls={c.classification} />
                            {facturaEnviada && (
                              <span className='text-xs px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1'
                                style={{ backgroundColor: '#6ee7b715', color: '#6ee7b7', border: '1px solid #6ee7b740' }}>
                                <CheckCircle className='w-3 h-3' />Factura enviada
                              </span>
                            )}
                          </div>
                          <div className='flex items-center gap-3 mt-0.5 flex-wrap'>
                            <span className='flex items-center gap-1 text-xs' style={{ color: MUTED }}>
                              <Phone className='w-3 h-3' />{c.cellphone || '—'}
                            </span>
                            <span className='text-xs font-medium' style={{ color: '#4f6ef7' }}>{c.plan}</span>
                            <span className='text-xs font-bold' style={{ color: TEXT }}>{fmt(c.plan_value)}</span>
                            {c.incluye_tv > 0 && (
                              <span className='text-xs' style={{ color: '#f59e0b' }}>
                                + MediTV ({c.puntos_tv || 0} pts)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className='flex items-center gap-2 flex-shrink-0 flex-wrap'>
                          {recentlySent && (
                            <span className='text-xs px-2 py-0.5 rounded-full font-semibold'
                              style={{ backgroundColor: '#25d36618', color: '#25d366', border: '1px solid #25d36640' }}>
                              Enviado ✓
                            </span>
                          )}
                          <button
                            onClick={() => enviarCobranza(c, true)}
                            disabled={isSending}
                            title='Generar factura y enviar por WhatsApp'
                            className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50'
                            style={{ backgroundColor: '#4f6ef720', color: '#4f6ef7', border: '1px solid #4f6ef740' }}
                          >
                            {isSending
                              ? <div className='w-3.5 h-3.5 border border-blue-500 border-t-transparent rounded-full animate-spin' />
                              : <FileText className='w-3.5 h-3.5' />}
                            <span>Emitir Factura</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Sin pendientes */}
      {totalClientes === 0 && (
        <div className='rounded-xl p-12 text-center' style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <CheckCircle className='w-10 h-10 mx-auto mb-3' style={{ color: '#6ee7b7' }} />
          <p className='font-semibold' style={{ color: TEXT }}>Todos al día</p>
          <p className='text-sm mt-1' style={{ color: MUTED }}>No hay cobranzas pendientes</p>
        </div>
      )}
    </div>
  )
}
