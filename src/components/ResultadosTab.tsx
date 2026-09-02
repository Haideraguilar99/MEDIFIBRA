'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Star, MapPin, Camera, Wrench, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface ResultadosTabProps {
  dark: boolean; BG: string; CARD: string; CARD2: string
  BORDER: string; TEXT: string; MUTED: string
}
interface Photo     { id: number; phase: string; photo_url: string; caption: string }
interface Equip     { id: number; action: string; equipment_type: string; brand: string; model: string; serial: string; condition: string }
interface CompletedOrder {
  id: number; order_number: string; task_type: string; priority: string
  technician_name: string; client_name: string; client_address: string
  client_neighborhood: string; client_plan: string
  scheduled_date: string; started_at: string; completed_at: string
  duration_minutes: number; completion_notes: string
  gps_lat: number; gps_lng: number; gps_address: string
  followup_required: number; followup_notes: string
  tech_rating: number; rating_comment: string
  photos: Photo[]; equipment: Equip[]
  rating: { stars: number; comment: string } | null
}

const TASK_COLORS: Record<string,string> = {
  INSTALACION_SERVICIO:'#16a34a', ESTUDIO_ZONA:'#2563eb', RETIRO_EQUIPOS:'#dc2626',
  ACTUALIZACION:'#7c3aed', REPARACION:'#ea580c', SOPORTE:'#0891b2',
  INSTALACION_ELECTRICA:'#ca8a04', OTRA:'#475569',
}
const TASK_LABELS: Record<string,string> = {
  INSTALACION_SERVICIO:'Instalación de Servicio', ESTUDIO_ZONA:'Estudio de Zona',
  RETIRO_EQUIPOS:'Retiro de Equipos', ACTUALIZACION:'Actualización',
  REPARACION:'Reparación', SOPORTE:'Soporte Técnico',
  INSTALACION_ELECTRICA:'Instalación Eléctrica', OTRA:'Otra Área',
}
const ACTION_MAP: Record<string,{label:string;color:string}> = {
  installed:{label:'Instalado',color:'#16a34a'}, instalado:{label:'Instalado',color:'#16a34a'},
  removed:{label:'Retirado',color:'#dc2626'},   retirado:{label:'Retirado',color:'#dc2626'},
  replaced:{label:'Reemplazado',color:'#d97706'},reemplazado:{label:'Reemplazado',color:'#d97706'},
}

function StarRating({ n, size=16 }:{ n:number; size?:number }) {
  return (
    <span style={{ display:'inline-flex', gap:2 }}>
      {[1,2,3,4,5].map(i=>(
        <Star key={i} size={size} fill={i<=n?'#f59e0b':'none'} color={i<=n?'#f59e0b':'#4b5563'}/>
      ))}
    </span>
  )
}

function fmtDate(s:string) {
  if (!s) return '—'
  try { return new Date(s).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'}) }
  catch { return s }
}
function fmtDur(m:number) {
  if (!m||m<=0) return '—'
  return m<60?`${m} min`:`${Math.floor(m/60)}h ${m%60}min`
}

export default function ResultadosTab({ BG,CARD,CARD2,BORDER,TEXT,MUTED }:ResultadosTabProps) {
  const ACCENT = '#2563EB'
  const [orders,   setOrders]    = useState<CompletedOrder[]>([])
  const [loading,  setLoading]   = useState(false)
  const [expanded, setExpanded]  = useState<Set<number>>(new Set())
  const [filterT,  setFilterT]   = useState('all')
  const [tabs,     setTabs]      = useState<Record<number,string>>({})
  const [phases,   setPhases]    = useState<Record<number,string>>({})

  const iS: React.CSSProperties = {
    background:CARD2, border:`1px solid ${BORDER}`, color:TEXT,
    borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', cursor:'pointer'
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/resultados')
      const d = await r.json()
      setOrders(d.orders ?? [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ fetchData() },[fetchData])

  const techs   = Array.from(new Set(orders.map(o=>o.technician_name).filter(Boolean)))
  const filtered = filterT==='all' ? orders : orders.filter(o=>o.technician_name===filterT)

  const rated   = orders.filter(o=>o.tech_rating>0)
  const avgStar = rated.length>0 ? rated.reduce((s,o)=>s+o.tech_rating,0)/rated.length : 0
  const durOrd  = orders.filter(o=>o.duration_minutes>0)
  const avgDur  = durOrd.length>0 ? Math.round(durOrd.reduce((s,o)=>s+o.duration_minutes,0)/durOrd.length) : 0

  function toggle(id:number) {
    setExpanded(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })
  }

  return (
    <div style={{ padding:'0 0 60px', background:BG }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ color:TEXT, fontWeight:800, fontSize:22, margin:0 }}>Resultados & Reseñas</h2>
          <p style={{ color:MUTED, fontSize:14, margin:'4px 0 0' }}>Órdenes completadas con evidencias fotográficas y calificaciones</p>
        </div>
        <button onClick={fetchData} disabled={loading} style={{ background:CARD, color:MUTED, border:`1px solid ${BORDER}`, borderRadius:8, padding:'8px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
          <RefreshCw size={13}/> {loading?'Cargando...':'Actualizar'}
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:24 }}>
        {[
          { label:'Completadas',      value:String(orders.length),                             color:'#16a34a' },
          { label:'Calificación prom',value:avgStar>0?`${avgStar.toFixed(1)} ★`:'—',          color:'#f59e0b' },
          { label:'Duración prom',    value:fmtDur(avgDur),                                   color:ACCENT    },
          { label:'Con seguimiento',  value:String(orders.filter(o=>o.followup_required===1).length), color:'#ea580c' },
        ].map(s=>(
          <div key={s.label} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:'16px 14px', textAlign:'center' }}>
            <div style={{ fontSize:26, fontWeight:900, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:12, color:MUTED, marginTop:6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filter ── */}
      <div style={{ display:'flex', gap:10, marginBottom:20, alignItems:'center', flexWrap:'wrap' }}>
        <label style={{ color:MUTED, fontSize:13, fontWeight:600 }}>Técnico:</label>
        <select value={filterT} onChange={e=>setFilterT(e.target.value)} style={iS}>
          <option value="all">Todos</option>
          {techs.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ color:MUTED, fontSize:13, marginLeft:'auto' }}>
          {filtered.length} orden{filtered.length!==1?'es':''} completada{filtered.length!==1?'s':''}
        </span>
      </div>

      {/* ── Cards ── */}
      {loading ? (
        <div style={{ color:MUTED, textAlign:'center', padding:60, fontSize:15 }}>Cargando resultados...</div>
      ) : filtered.length===0 ? (
        <div style={{ background:CARD, borderRadius:12, padding:60, textAlign:'center', border:`1px solid ${BORDER}` }}>
          <CheckCircle size={36} color={MUTED} style={{ marginBottom:12 }}/>
          <div style={{ color:MUTED, fontSize:15 }}>No hay órdenes completadas aún</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {filtered.map(order=>{
            const isOpen = expanded.has(order.id)
            const tab    = tabs[order.id]   ?? 'info'
            const phase  = phases[order.id] ?? 'antes'
            const tColor = TASK_COLORS[order.task_type] ?? '#475569'
            const tLabel = TASK_LABELS[order.task_type] ?? order.task_type
            const pPhotos= order.photos.filter(p=>p.phase===phase)
            const stars  = order.rating?.stars ?? order.tech_rating ?? 0

            return (
              <div key={order.id} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden' }}>

                {/* green bar = ORDEN LISTA */}
                <div style={{ height:3, background:'#16a34a' }}/>

                {/* Header clickable */}
                <div style={{ padding:'16px 20px', cursor:'pointer' }} onClick={()=>toggle(order.id)}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:8, marginBottom:10 }}>
                        <span style={{ background:'#052e16', color:'#4ade80', border:'1px solid #166534', borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:800, display:'inline-flex', alignItems:'center', gap:4 }}>
                          <CheckCircle size={11}/> ORDEN LISTA
                        </span>
                        <span style={{ color:ACCENT, fontWeight:800, fontSize:13, fontFamily:'monospace' }}>{order.order_number}</span>
                        <span style={{ background:tColor+'18', color:tColor, border:`1px solid ${tColor}33`, borderRadius:4, padding:'2px 9px', fontSize:12, fontWeight:700 }}>{tLabel}</span>
                        {order.followup_required===1 && (
                          <span style={{ background:'#431407', color:'#fb923c', border:'1px solid #9a3412', borderRadius:4, padding:'2px 8px', fontSize:11, fontWeight:700 }}>! Seguimiento</span>
                        )}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'3px 16px' }}>
                        <span style={{ color:MUTED, fontSize:13 }}><strong style={{ color:TEXT }}>{order.technician_name??'—'}</strong></span>
                        <span style={{ color:MUTED, fontSize:13 }}><strong style={{ color:TEXT }}>{order.client_name??'—'}</strong></span>
                        {order.client_address && <span style={{ color:MUTED, fontSize:13 }}>{order.client_neighborhood?`${order.client_address}, ${order.client_neighborhood}`:order.client_address}</span>}
                        {order.completed_at   && <span style={{ color:MUTED, fontSize:13 }}>{fmtDate(order.completed_at)}</span>}
                        {order.duration_minutes>0 && <span style={{ color:MUTED, fontSize:13 }}>{fmtDur(order.duration_minutes)}</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
                      {stars>0 && (
                        <div style={{ textAlign:'center' }}>
                          <StarRating n={stars} size={14}/>
                          <div style={{ color:MUTED, fontSize:11, marginTop:2 }}>{stars}/5</div>
                        </div>
                      )}
                      <span style={{ color:MUTED }}>{isOpen?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ borderTop:`1px solid ${BORDER}`, padding:'0 20px 20px' }}>

                    {/* Sub-tabs */}
                    <div style={{ display:'flex', gap:4, padding:'14px 0', flexWrap:'wrap' }}>
                      {[
                        { key:'info',    label:'Detalles' },
                        { key:'fotos',   label:`Fotos (${order.photos.length})` },
                        { key:'equipos', label:`Equipos (${order.equipment.length})` },
                        { key:'rating',  label:'Calificacion' },
                      ].map(t=>(
                        <button key={t.key} onClick={()=>setTabs(p=>({...p,[order.id]:t.key}))} style={{ background:tab===t.key?ACCENT:CARD2, color:tab===t.key?'#fff':MUTED, border:`1px solid ${tab===t.key?ACCENT:BORDER}`, borderRadius:7, padding:'6px 14px', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Detalles */}
                    {tab==='info' && (
                      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:10 }}>
                          {[
                            { label:'Programado',    value:fmtDate(order.scheduled_date) },
                            { label:'Iniciado',      value:fmtDate(order.started_at) },
                            { label:'Completado',    value:fmtDate(order.completed_at) },
                            { label:'Duración total',value:fmtDur(order.duration_minutes) },
                          ].map(item=>(
                            <div key={item.label} style={{ background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, padding:'10px 14px' }}>
                              <div style={{ color:MUTED, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{item.label}</div>
                              <div style={{ color:TEXT, fontSize:14, fontWeight:600 }}>{item.value}</div>
                            </div>
                          ))}
                        </div>
                        {order.completion_notes && (
                          <div>
                            <div style={{ color:MUTED, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Notas de Completar</div>
                            <div style={{ background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, padding:'12px 14px', color:TEXT, fontSize:14, lineHeight:1.6 }}>{order.completion_notes}</div>
                          </div>
                        )}
                        {order.followup_required===1 && order.followup_notes && (
                          <div>
                            <div style={{ color:'#fb923c', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Pendiente de Seguimiento</div>
                            <div style={{ background:'#431407', border:'1px solid #9a3412', borderRadius:8, padding:'12px 14px', color:'#fb923c', fontSize:14 }}>{order.followup_notes}</div>
                          </div>
                        )}
                        {(order.gps_lat!==0 && order.gps_lng!==0) && (
                          <div>
                            <div style={{ color:MUTED, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Ubicación GPS</div>
                            <a href={`https://www.google.com/maps?q=${order.gps_lat},${order.gps_lng}`} target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#1e3a5f', color:'#60a5fa', border:'1px solid #1d4ed8', borderRadius:8, padding:'9px 16px', fontSize:13, fontWeight:600, textDecoration:'none' }}>
                              <MapPin size={14}/> Ver en Google Maps
                              {order.gps_address && <span style={{ color:MUTED, fontWeight:400 }}>— {order.gps_address}</span>}
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fotos */}
                    {tab==='fotos' && (
                      <div>
                        <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
                          {['antes','durante','despues'].map(ph=>{
                            const cnt = order.photos.filter(p=>p.phase===ph).length
                            return (
                              <button key={ph} onClick={()=>setPhases(p=>({...p,[order.id]:ph}))} style={{ background:phase===ph?'#1e3a5f':CARD2, color:phase===ph?'#60a5fa':MUTED, border:`1px solid ${phase===ph?'#1d4ed8':BORDER}`, borderRadius:7, padding:'6px 14px', cursor:'pointer', fontSize:13, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6 }}>
                                {ph==='antes'?'Antes':ph==='durante'?'Durante':'Despues'}
                                <span style={{ background:cnt>0?'#2563eb':CARD, color:cnt>0?'#fff':MUTED, borderRadius:10, padding:'0 6px', fontSize:11, fontWeight:700 }}>{cnt}</span>
                              </button>
                            )
                          })}
                        </div>
                        {pPhotos.length===0 ? (
                          <div style={{ color:MUTED, textAlign:'center', padding:'32px 0', fontSize:14 }}>
                            <Camera size={28} color={MUTED} style={{ display:'block', margin:'0 auto 8px' }}/>
                            Sin fotos en esta fase
                          </div>
                        ) : (
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
                            {pPhotos.map(photo=>(
                              <div key={photo.id} style={{ borderRadius:10, overflow:'hidden', border:`1px solid ${BORDER}`, background:CARD2 }}>
                                <a href={photo.photo_url} target="_blank" rel="noreferrer">
                                  <img
                                    src={`/api/img-proxy?url=${encodeURIComponent(photo.photo_url)}`}
                                    alt={photo.caption||'Evidencia'}
                                    style={{ width:'100%', height:150, objectFit:'cover', display:'block' }}
                                    onError={e=>{
                                      const t = e.target as HTMLImageElement
                                      t.style.display='none'
                                      const p = t.parentElement
                                      if (p) { const d=document.createElement('div'); d.style.cssText=`height:150px;display:flex;align-items:center;justify-content:center;color:${MUTED};font-size:12px;`; d.textContent='Imagen no disponible'; p.prepend(d) }
                                    }}
                                  />
                                </a>
                                {photo.caption && (
                                  <div style={{ padding:'8px 10px', color:MUTED, fontSize:12, borderTop:`1px solid ${BORDER}` }}>{photo.caption}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Equipos */}
                    {tab==='equipos' && (
                      <div>
                        {order.equipment.length===0 ? (
                          <div style={{ color:MUTED, textAlign:'center', padding:'32px 0', fontSize:14 }}>
                            <Wrench size={28} color={MUTED} style={{ display:'block', margin:'0 auto 8px' }}/>
                            Sin equipos registrados
                          </div>
                        ) : (
                          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                            {order.equipment.map(eq=>{
                              const ac = ACTION_MAP[eq.action] ?? { label:eq.action, color:MUTED }
                              return (
                                <div key={eq.id} style={{ background:CARD2, border:`1px solid ${BORDER}`, borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                                  <span style={{ background:ac.color+'18', color:ac.color, border:`1px solid ${ac.color}33`, borderRadius:4, padding:'2px 10px', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>{ac.label}</span>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ color:TEXT, fontWeight:700, fontSize:14 }}>{eq.equipment_type}</div>
                                    <div style={{ color:MUTED, fontSize:13, marginTop:2 }}>
                                      {[eq.brand,eq.model].filter(Boolean).join(' · ')}
                                      {eq.serial && <span style={{ fontFamily:'monospace', marginLeft:8, color:ACCENT }}>S/N: {eq.serial}</span>}
                                    </div>
                                  </div>
                                  {eq.condition && <span style={{ color:MUTED, fontSize:12, whiteSpace:'nowrap' }}>{eq.condition}</span>}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Calificación */}
                    {tab==='rating' && (
                      <div style={{ textAlign:'center', padding:'24px 0' }}>
                        {stars>0 ? (
                          <div>
                            <StarRating n={stars} size={36}/>
                            <div style={{ color:TEXT, fontSize:36, fontWeight:900, margin:'12px 0 4px' }}>
                              {stars}<span style={{ color:MUTED, fontSize:20 }}>/5</span>
                            </div>
                            <div style={{ color:MUTED, fontSize:13, marginBottom:16 }}>Calificación del cliente</div>
                            {(order.rating?.comment||order.rating_comment) && (
                              <div style={{ background:CARD2, border:`1px solid ${BORDER}`, borderRadius:10, padding:'14px 20px', color:TEXT, fontSize:15, fontStyle:'italic', maxWidth:400, margin:'0 auto' }}>
                                "{order.rating?.comment||order.rating_comment}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ color:MUTED }}>
                            <Star size={32} color={MUTED} style={{ display:'block', margin:'0 auto 10px' }}/>
                            <div style={{ fontSize:14 }}>Sin calificación aún</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
