'use client'
import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, ChevronDown, ChevronRight, Phone, Send, FileText, MessageCircle } from 'lucide-react'
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

const DIAS = ['5','10','12','15','20','25','30']
const PROTECTED = ['RECOGER_EQUIPO','NOVEDAD_PAGO','NO_PAGA_AUTORIZADO','SUSPENDIDO_TEMP','SUSPENDIDO','USUARIO_PERDIDO']
const EMPRESA = 'Medifibra S.A.S'
const WA = '333 728 8745'
const CUENTA = '00995202514'
const OBSERVACION_ACTIVA = true
const OBS = 'Observacion: a partir de octubre se realizara un ajuste minimo en el valor de nuestros planes. Agradecemos tu comprension y confianza en MEDIFIBRA.'

function fmt(v: number) { return '$' + v.toLocaleString('es-CO') }

function hoursAgo(iso: string): number {
  return (Date.now() - new Date(iso + (iso.endsWith('Z')?'':'Z')).getTime()) / 3600000
}

function getCurrentPeriod(): string {
  const n = new Date()
  return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')
}

function tabHabilitada(dia: string): boolean {
  const d = parseInt(dia, 10)
  if (isNaN(d)) return false
  return new Date().getDate() >= d - 3
}

function buildMensaje(c: CobranzaClient, linkFactura: string): string {
  const nombre = nombreLimpio(c.name)
  const monto = fmt(c.plan_value + (c.incluye_tv || 0))
  const tv = c.incluye_tv > 0
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
    `Medios de pago: Bancolombia (cuenta de ahorros) o Bre-B, ${CUENTA}`,
    'Envianos el comprobante a este WhatsApp una vez realices el pago.',
  )
  if (OBSERVACION_ACTIVA) {
    partes.push('', OBS)
  }
  partes.push('', `${EMPRESA} | ${WA}`)
  return partes.join('\n')
}

export default function CobranzasTab({ BG, CARD, CARD2, BORDER, TEXT, MUTED }: {
  BG: string; CARD: string; CARD2: string; BORDER: string; TEXT: string; MUTED: string
}) {
  const [clients, setClients] = useState<CobranzaClient[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<number | null>(null)
  const [cobradoTs, setCobradoTs] = useState<Record<number,string>>({})
  const [enviadoTs, setEnviadoTs] = useState<Record<number,string>>({})
  const [openDias, setOpenDias] = useState<Record<string,boolean>>({})
  const period = getCurrentPeriod()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rc, rf] = await Promise.all([
        fetch('/api/cobros'),
        fetch(`/api/facturas-pendientes?period=${getCurrentPeriod()}`)
      ])
      const dc = await rc.json()
      const df = await rf.json()
      const cobros: CobranzaClient[] = dc.clients || []
      const factMap: Record<number,number> = {}
      ;(df.clients || []).forEach((f: {id:number;has_invoice:number}) => { factMap[f.id] = f.has_invoice })
      const merged = cobros.map(c => ({ ...c, has_invoice: factMap[c.id] ?? 0, puntos_tv: (c as CobranzaClient).puntos_tv || 0 }))
      setClients(merged)
      const ts: Record<number,string> = {}
      merged.forEach(c => {
        if (c.cobro_enviado_at && hoursAgo(c.cobro_enviado_at) < 12) ts[c.id] = c.cobro_enviado_at
      })
      setCobradoTs(ts)
      const open: Record<string,boolean> = {}
      DIAS.forEach(d => { open[d] = tabHabilitada(d) })
      setOpenDias(open)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const toggleDia = (dia: string) => {
    if (!tabHabilitada(dia)) return
    setOpenDias(prev => ({ ...prev, [dia]: !prev[dia] }))
  }

  const generarFactura = async (c: CobranzaClient): Promise<string|null> => {
    try {
      const r = await fetch('/api/invoices/generar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, dia_pago: c.dia_pago })
      })
      if (!r.ok) { alert('Error al generar factura'); return null }
      return `${window.location.origin}/factura/${c.id}`
    } catch { return null }
  }

  const enviarCobranza = async (c: CobranzaClient, incluirFactura: boolean) => {
    setSending(c.id)
    try {
      let link = `${window.location.origin}/factura/${c.id}`
      if (incluirFactura) {
        const generado = await generarFactura(c)
        if (!generado) { setSending(null); return }
        link = generado
        setEnviadoTs(prev => ({ ...prev, [c.id]: new Date().toISOString() }))
        setClients(prev => prev.map(x => x.id===c.id ? {...x, has_invoice:1} : x))
      }
      const phone = (c.cellphone ?? '').replace(/\D/g, '')
      const msg = encodeURIComponent(buildMensaje(c, link))
      window.open(`https://wa.me/57${phone}?text=${msg}`, '_blank')
      await fetch('/api/notifications/log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: c.id, channel: 'whatsapp',
          type: 'cobro_enviado', message: `Cobranza enviada a ${c.name}`, status: 'sent' })
      })
      setCobradoTs(prev => ({ ...prev, [c.id]: new Date().toISOString() }))
    } catch (e) { console.error(e) }
    finally { setSending(null) }
  }

  if (loading) return (
    <div className='flex items-center justify-center h-64'>
      <div className='text-center'>
        <div className='w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3'/>
        <p className='text-sm' style={{color:MUTED}}>Cargando cobranzas...</p>
      </div>
    </div>
  )

  const total = clients.length

  return (
    <div className='space-y-4 max-w-5xl mx-auto'>
      <div className='rounded-xl p-4' style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}}>
        <div className='flex items-center justify-between flex-wrap gap-2'>
          <div>
            <h2 className='text-base font-bold' style={{color:TEXT}}>Cobranzas</h2>
            <p className='text-xs mt-0.5' style={{color:MUTED}}>Periodo {period} — Pestanas activas 3 dias antes de cada fecha</p>
          </div>
          <span className='text-2xl font-black' style={{color:'#f87171'}}>{total} <span className='text-sm font-medium' style={{color:MUTED}}>pendientes</span></span>
        </div>
      </div>

      {DIAS.map(dia => {
        const grupo = clients.filter(c => c.dia_pago === dia)
        if (grupo.length === 0) return null
        const habilitada = tabHabilitada(dia)
        const isOpen = openDias[dia] ?? false
        return (
          <div key={dia} className='rounded-xl overflow-hidden'
            style={{border:`1px solid ${habilitada ? '#4f6ef760' : BORDER}`}}>
            <button onClick={() => toggleDia(dia)}
              className='w-full flex items-center justify-between px-4 py-3 transition-colors'
              style={{backgroundColor:CARD, cursor: habilitada?'pointer':'not-allowed', opacity: habilitada?1:0.45}}>
              <div className='flex items-center gap-3'>
                {isOpen ? <ChevronDown className='w-4 h-4' style={{color:MUTED}}/> : <ChevronRight className='w-4 h-4' style={{color:MUTED}}/>}
                <span className='font-bold text-sm' style={{color: habilitada?'#4f6ef7':MUTED}}>Dia {dia}</span>
                {habilitada
                  ? <span className='text-xs px-2 py-0.5 rounded-full font-semibold' style={{backgroundColor:'#4f6ef720',color:'#4f6ef7'}}>Activa</span>
                  : <span className='text-xs px-2 py-0.5 rounded-full' style={{backgroundColor:'#ffffff08',color:MUTED}}>Disponible dia {parseInt(dia)-3}</span>}
              </div>
              <span className='text-sm font-bold' style={{color:TEXT}}>{grupo.length} clientes</span>
            </button>
            {isOpen && habilitada && (
              <div style={{backgroundColor:BG}}>
                {grupo.map((c, i) => {
                  const isProt = PROTECTED.includes(c.classification)
                  const isSending = sending === c.id
                  const recentlySent = cobradoTs[c.id] ? hoursAgo(cobradoTs[c.id]) < 12 : false
                  const facturaEnviada = !!c.has_invoice || !!enviadoTs[c.id]
                  return (
                    <div key={c.id} className='px-4 py-3 text-sm'
                      style={{borderTop:i>0?`1px solid ${BORDER}`:undefined}}>
                      <div className='flex items-start justify-between gap-3 flex-wrap'>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2 flex-wrap'>
                            <span className='font-semibold' style={{color:TEXT}}>{c.name}</span>
                            <span className='text-xs px-1.5 py-0.5 rounded-full font-medium'
                              style={{backgroundColor:'#f8717120',color:'#f87171'}}>
                              {c.classification.replace(/_/g,' ')}
                            </span>
                            {facturaEnviada&&(
                              <span className='text-xs px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1'
                                style={{backgroundColor:'#6ee7b715',color:'#6ee7b7',border:'1px solid #6ee7b740'}}>
                                <CheckCircle className='w-3 h-3'/>Factura enviada
                              </span>
                            )}
                          </div>
                          <div className='flex items-center gap-3 mt-0.5 flex-wrap'>
                            <span className='flex items-center gap-1 text-xs' style={{color:MUTED}}>
                              <Phone className='w-3 h-3'/>{c.cellphone||'—'}
                            </span>
                            <span className='text-xs font-medium' style={{color:'#4f6ef7'}}>{c.plan}</span>
                            <span className='text-xs font-bold' style={{color:TEXT}}>{fmt(c.plan_value+(c.incluye_tv||0))}</span>
                            {c.incluye_tv>0&&<span className='text-xs' style={{color:'#f59e0b'}}>+ MediTV ({c.puntos_tv||0} pts)</span>}
                          </div>
                        </div>
                        {!isProt&&(
                          <div className='flex items-center gap-2 flex-shrink-0 flex-wrap'>
                            {recentlySent&&(
                              <span className='text-xs px-2 py-0.5 rounded-full font-semibold'
                                style={{backgroundColor:'#25d36618',color:'#25d366',border:'1px solid #25d36640'}}>
                                Enviado
                              </span>
                            )}
                            <button onClick={()=>enviarCobranza(c,true)} disabled={isSending}
                              title='Generar factura y enviar por WhatsApp'
                              className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50'
                              style={{backgroundColor:'#4f6ef720',color:'#4f6ef7',border:'1px solid #4f6ef740'}}>
                              {isSending?<div className='w-3.5 h-3.5 border border-blue-500 border-t-transparent rounded-full animate-spin'/>:<FileText className='w-3.5 h-3.5'/>}
                              <span>Factura + Enviar</span>
                            </button>
                            {!recentlySent&&(
                              <button onClick={()=>enviarCobranza(c,false)} disabled={isSending}
                                title='Enviar solo mensaje sin generar factura'
                                className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50'
                                style={{backgroundColor:'#25d36620',color:'#25d366',border:'1px solid #25d36640'}}>
                                <MessageCircle className='w-3.5 h-3.5'/>
                                <span>Enviar</span>
                              </button>
                            )}
                          </div>
                        )}
                        {isProt&&(
                          <span className='text-xs px-2 py-1 rounded' style={{color:MUTED,backgroundColor:CARD}}>Sin accion</span>
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

      {total===0&&(
        <div className='rounded-xl p-12 text-center' style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}}>
          <CheckCircle className='w-10 h-10 mx-auto mb-3' style={{color:'#6ee7b7'}}/>
          <p className='font-semibold' style={{color:TEXT}}>Todos al dia</p>
          <p className='text-sm mt-1' style={{color:MUTED}}>No hay cobranzas pendientes</p>
        </div>
      )}
    </div>
  )
}