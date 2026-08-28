'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, MessageCircle, FileText, Phone, Wrench, Search, X, Calendar, RefreshCw } from 'lucide-react';

interface Technician { id:number; name:string; cedula:string; phone:string; cellphone:string; email:string; photo_url:string; role:string; specialty:string; status:string; notes:string; created_at:string; }
interface ClientResult { id:number; name:string; address:string; neighborhood:string; commune:string; cellphone:string; plan:string; status:string; cedula:string; punto_referencia:string; }
interface WorkOrder { id:number; order_number:string; technician_id:number; client_id:number; task_type:string; task_description:string; priority:string; scheduled_date:string; scheduled_time:string; status:string; notes:string; created_by:string; whatsapp_tech_sent:number; whatsapp_client_sent:number; created_at:string; technician_name?:string; technician_phone?:string; technician_role?:string; client_name?:string; client_address?:string; client_phone?:string; client_plan?:string; client_status?:string; client_neighborhood?:string; client_punto_referencia?:string; }

const TASK_TYPES = [
  { value:'INSTALACION_SERVICIO',  label:'Instalacion de Servicio', color:'#16a34a' },
  { value:'ESTUDIO_ZONA',          label:'Estudio de Zona',          color:'#2563eb' },
  { value:'RETIRO_EQUIPOS',        label:'Retiro de Equipos',        color:'#dc2626' },
  { value:'ACTUALIZACION',         label:'Actualizacion',            color:'#7c3aed' },
  { value:'REPARACION',            label:'Reparacion',               color:'#ea580c' },
  { value:'SOPORTE',               label:'Soporte Tecnico',          color:'#0891b2' },
  { value:'INSTALACION_ELECTRICA', label:'Instalacion Electrica',    color:'#ca8a04' },
  { value:'OTRA',                  label:'Otra Area',                color:'#475569' },
];
const PRIORITIES = [
  { value:'low',    label:'Baja',    color:'#475569' },
  { value:'normal', label:'Normal',  color:'#2563eb' },
  { value:'high',   label:'Alta',    color:'#ea580c' },
  { value:'urgent', label:'Urgente', color:'#dc2626' },
];
const ORDER_STATUSES = [
  { value:'pending',     label:'Pendiente',  color:'#ca8a04' },
  { value:'in_progress', label:'En proceso', color:'#2563eb' },
  { value:'completed',   label:'Completada', color:'#16a34a' },
  { value:'cancelled',   label:'Cancelada',  color:'#475569' },
];
const TECH_ROLES = ['Tecnico Lider','Tecnico','Auxiliar Tecnico','Instalador','Supervisor'];
const EMPTY_T = { name:'',cedula:'',phone:'',cellphone:'',email:'',photo_url:'',role:'Tecnico',specialty:'',status:'active',notes:'' };
const EMPTY_O = { technician_id:0,client_id:0,task_type:'',task_description:'',priority:'normal',scheduled_date:'',scheduled_time:'',notes:'',created_by:'Mariana' };

const tCfg = (v:string) => TASK_TYPES.find(t=>t.value===v);
const pCfg = (v:string) => PRIORITIES.find(p=>p.value===v);
const sCfg = (v:string) => ORDER_STATUSES.find(s=>s.value===v);



interface TecnicosTabProps {
  dark: boolean
  BG: string
  CARD: string
  CARD2: string
  BORDER: string
  TEXT: string
  MUTED: string
}

export default function TecnicosTab({ dark, BG, CARD, CARD2, BORDER, TEXT, MUTED }: TecnicosTabProps) {
  const ACCENT = '#2563EB'
  // Objeto C mapeado a props del dashboard (modo claro/oscuro)
  const C = {
    bg: BG,
    card: CARD,
    card2: CARD2,
    border: BORDER,
    text: TEXT,
    muted: MUTED,
    accent: ACCENT,
  }


  const iS: React.CSSProperties = {
    background: CARD2, border: `1px solid ${BORDER}`, color: TEXT,
    borderRadius: 8, padding: '10px 14px', width: '100%',
    outline: 'none', fontSize: 14, boxSizing: 'border-box',
  };

  const [technicians,setTechnicians]=useState<Technician[]>([]);
  const [workOrders,setWorkOrders]=useState<WorkOrder[]>([]);
  const [loadT,setLoadT]=useState(false);
  const [loadO,setLoadO]=useState(false);
  const [saving,setSaving]=useState(false);
  const [showTM,setShowTM]=useState(false);
  const [editT,setEditT]=useState<Technician|null>(null);
  const [tForm,setTForm]=useState({...EMPTY_T});
  const [showOM,setShowOM]=useState(false);
  const [editO,setEditO]=useState<WorkOrder|null>(null);
  const [oForm,setOForm]=useState({...EMPTY_O});
  const [cs,setCs]=useState('');
  const [cRes,setCRes]=useState<ClientResult[]>([]);
  const [selC,setSelC]=useState<ClientResult|null>(null);
  const [searchingC,setSearchingC]=useState(false);
  const [showCD,setShowCD]=useState(false);
  const [oTab,setOTab]=useState<'all'|'pending'|'in_progress'|'completed'|'cancelled'>('all');

  const fetchT=useCallback(async()=>{ setLoadT(true); try{ const r=await fetch('/api/technicians'); const d=await r.json(); setTechnicians(d.technicians??[]); }catch(e){console.error(e);}finally{setLoadT(false);} },[]);
  const fetchO=useCallback(async()=>{ setLoadO(true); try{ const r=await fetch('/api/work-orders?limit=200'); const d=await r.json(); setWorkOrders(d.workOrders??[]); }catch(e){console.error(e);}finally{setLoadO(false);} },[]);
  useEffect(()=>{ fetchT(); fetchO(); },[fetchT,fetchO]);

  useEffect(()=>{
    if(!cs.trim()){setCRes([]);return;}
    const t=setTimeout(async()=>{ setSearchingC(true); try{ const r=await fetch(`/api/clients?search=${encodeURIComponent(cs)}&limit=10`); const d=await r.json(); setCRes(d.clients??[]); setShowCD(true); }catch(_e){}finally{setSearchingC(false);} },350);
    return()=>clearTimeout(t);
  },[cs]);

  function openNT(){ setEditT(null); setTForm({...EMPTY_T}); setShowTM(true); }
  function openET(t:Technician){ setEditT(t); setTForm({name:t.name,cedula:t.cedula,phone:t.phone,cellphone:t.cellphone,email:t.email,photo_url:t.photo_url,role:t.role,specialty:t.specialty,status:t.status,notes:t.notes}); setShowTM(true); }
  async function saveT(){ if(!tForm.name.trim()){alert('El nombre es requerido');return;} setSaving(true); try{ const r=await fetch(editT?`/api/technicians/${editT.id}`:'/api/technicians',{method:editT?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(tForm)}); if(!r.ok){const e=await r.json();alert(e.error??'Error');return;} setShowTM(false);fetchT(); }finally{setSaving(false);} }
  async function delT(id:number,name:string){ if(!confirm(`Eliminar a ${name}?`))return; const r=await fetch(`/api/technicians/${id}`,{method:'DELETE'}); if(!r.ok){const e=await r.json();alert(e.error??'Error');return;} fetchT(); }

  function openNO(){ setEditO(null); setOForm({...EMPTY_O}); setSelC(null); setCs(''); setShowOM(true); }
  function openEO(o:WorkOrder){ setEditO(o); setOForm({technician_id:o.technician_id,client_id:o.client_id,task_type:o.task_type,task_description:o.task_description,priority:o.priority,scheduled_date:o.scheduled_date,scheduled_time:o.scheduled_time,notes:o.notes,created_by:o.created_by}); setSelC({id:o.client_id,name:o.client_name??'',address:o.client_address??'',neighborhood:o.client_neighborhood??'',commune:'',cellphone:o.client_phone??'',plan:o.client_plan??'',status:o.client_status??'',cedula:'',punto_referencia:o.client_punto_referencia??''}); setCs(o.client_name??'');setShowOM(true); }
  async function saveO(){ if(!oForm.technician_id){alert('Selecciona un tecnico');return;} if(!oForm.client_id){alert('Selecciona un cliente');return;} if(!oForm.task_type){alert('Selecciona el tipo de tarea');return;} setSaving(true); try{ const url=editO?`/api/work-orders/${editO.id}`:'/api/work-orders'; const body=editO?{...oForm,status:editO.status,whatsapp_tech_sent:editO.whatsapp_tech_sent,whatsapp_client_sent:editO.whatsapp_client_sent}:oForm; const r=await fetch(url,{method:editO?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); if(!r.ok){const e=await r.json();alert(e.error??'Error');return;} setShowOM(false);fetchO(); }finally{setSaving(false);} }
  async function delO(id:number,num:string){ if(!confirm(`Eliminar orden ${num}?`))return; await fetch(`/api/work-orders/${id}`,{method:'DELETE'}); fetchO(); }
  async function chgStatus(id:number,status:string,o:WorkOrder){ await fetch(`/api/work-orders/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...o,status})}); fetchO(); }

  async function waT(o:WorkOrder){ const t=tCfg(o.task_type); const msg=[`ORDEN DE SERVICIO - MEDIFIBRA S.A.S`,`Orden: ${o.order_number}`,``,`Tecnico: ${o.technician_name}`,`Tarea: ${t?.label??o.task_type}`,`Fecha: ${o.scheduled_date||'Por definir'}${o.scheduled_time?' a las '+o.scheduled_time:''}`,``,`CLIENTE:`,`Nombre: ${o.client_name}`,`Direccion: ${o.client_address??''}${o.client_neighborhood?', '+o.client_neighborhood:''}`,o.client_punto_referencia?`Referencia: ${o.client_punto_referencia}`:'',`Telefono: ${o.client_phone}`,`Plan: ${o.client_plan}`,o.task_description?`\nDescripcion: ${o.task_description}`:'',o.notes?`\nNovedades: ${o.notes}`:'',``,`Confirme recibido.`,`Mariana - Medifibra S.A.S`].filter(Boolean).join('\n').trim(); window.open(`https://wa.me/57${o.technician_phone}?text=${encodeURIComponent(msg)}`,'_blank'); await fetch(`/api/work-orders/${o.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...o,whatsapp_tech_sent:1})}); fetchO(); }
  async function waC(o:WorkOrder){ const t=tCfg(o.task_type); const msg=[`MEDIFIBRA S.A.S - Agendamiento de Visita Tecnica`,`Orden: ${o.order_number}`,``,`Estimado(a) ${o.client_name},`,``,`Le informamos que hemos programado una visita tecnica:`,`Servicio: ${t?.label??o.task_type}`,`Fecha: ${o.scheduled_date||'Por definir'}${o.scheduled_time?' a las '+o.scheduled_time+' hrs':''}`,`Tecnico asignado: ${o.technician_name}`,``,`Direccion registrada: ${o.client_address??''}`,``,`Para dudas comuniquese al 333 728 8745`,``,`Medifibra S.A.S - "Conectate con velocidad real"`].join('\n'); window.open(`https://wa.me/57${o.client_phone}?text=${encodeURIComponent(msg)}`,'_blank'); await fetch(`/api/work-orders/${o.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...o,whatsapp_client_sent:1})}); fetchO(); }

  const filtered=workOrders.filter(o=>oTab==='all'||o.status===oTab);
  const stats={ total:workOrders.length, pending:workOrders.filter(o=>o.status==='pending').length, in_progress:workOrders.filter(o=>o.status==='in_progress').length, completed:workOrders.filter(o=>o.status==='completed').length };

  const Btn=({onClick,title,color,bg,children}:{onClick:()=>void;title:string;color:string;bg:string;children:React.ReactNode})=>(
    <button onClick={onClick} title={title} style={{ background:bg, color, border:`1px solid ${color}33`, borderRadius:6, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{children}</button>
  );

  return (
    <div style={{ padding:'0 0 60px', background:BG }}>

      {/* ── PERSONAL TECNICO ── */}
      <div style={{ marginBottom:40 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <h2 style={{ color:TEXT, fontWeight:800, fontSize:22, margin:0 }}>Personal Técnico</h2>
            <p style={{ color:MUTED, fontSize:14, margin:'4px 0 0' }}>{technicians.length} técnico{technicians.length!==1?'s':''} registrado{technicians.length!==1?'s':''}</p>
          </div>
          <button onClick={openNT} style={{ background:ACCENT, color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', cursor:'pointer', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={15}/> Nuevo Técnico
          </button>
        </div>

        {loadT
          ? <div style={{ color:MUTED, textAlign:'center', padding:40 }}>Cargando...</div>
          : technicians.length===0
            ? <div style={{ background:CARD, borderRadius:12, padding:48, textAlign:'center', border:`1px solid ${BORDER}` }}>
                <Wrench size={32} color={MUTED} style={{ marginBottom:12 }}/>
                <div style={{ color:MUTED, fontSize:15 }}>No hay técnicos registrados.</div>
              </div>
            : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
                {technicians.map(t=>(
                  <div key={t.id} style={{ background:CARD, borderRadius:12, border:`1px solid ${BORDER}`, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ height:3, background:t.status==='active'?'#16a34a':'#94a3b8' }}/>
                    <div style={{ padding:20 }}>
                      <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                        <div style={{ width:56, height:56, borderRadius:10, background:CARD2, border:`2px solid ${BORDER}`, flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:MUTED, fontWeight:800 }}>
                          {t.photo_url
                            ? <img src={`/api/img-proxy?url=${encodeURIComponent(t.photo_url)}`} alt={t.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
                            : t.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:16, color:TEXT, marginBottom:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.name}</div>
                          <span style={{ background:ACCENT+'18', color:ACCENT, border:`1px solid ${ACCENT}33`, borderRadius:4, padding:'2px 8px', fontSize:12, fontWeight:700 }}>{t.role}</span>
                        </div>
                        <span style={{ background:t.status==='active'?'#F0FDF4':'#F1F5F9', color:t.status==='active'?'#16a34a':'#64748b', border:`1px solid ${t.status==='active'?'#BBF7D0':'#CBD5E1'}`, borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
                          {t.status==='active'?'Activo':'Inactivo'}
                        </span>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:12 }}>
                        {t.specialty && <div style={{ fontSize:13, color:MUTED, fontStyle:'italic' }}>{t.specialty}</div>}
                        {t.cedula    && <div style={{ fontSize:14, color:MUTED }}>C.C. {t.cedula}</div>}
                        {t.cellphone && <div style={{ fontSize:14, color:MUTED, display:'flex', alignItems:'center', gap:5 }}><Phone size={12}/>{t.cellphone}</div>}
                        {t.email     && <div style={{ fontSize:13, color:MUTED }}>{t.email}</div>}
                      </div>
                      <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${BORDER}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ color:MUTED, fontSize:13 }}>{workOrders.filter(o=>o.technician_id===t.id&&o.status!=='completed'&&o.status!=='cancelled').length} orden(es) activa(s)</span>
                        <div style={{ display:'flex', gap:6 }}>
                          <Btn onClick={()=>openET(t)} title="Editar" color={ACCENT} bg={ACCENT+'15'}><Pencil size={13}/></Btn>
                          <Btn onClick={()=>delT(t.id,t.name)} title="Eliminar" color="#DC2626" bg="#FEF2F2"><Trash2 size={13}/></Btn>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
        }
      </div>

      {/* ── ORDENES DE SERVICIO ── */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:12 }}>
          <div>
            <h2 style={{ color:TEXT, fontWeight:800, fontSize:22, margin:0 }}>Órdenes de Servicio</h2>
            <p style={{ color:MUTED, fontSize:14, margin:'4px 0 0' }}>Asignación y seguimiento de tareas</p>
          </div>
          <button onClick={openNO} style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', cursor:'pointer', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={15}/> Nueva Orden
          </button>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:12, marginBottom:18 }}>
          {[
            {label:'Total',       value:stats.total,       color:TEXT,       border:'#E2E8F0'},
            {label:'Pendientes',  value:stats.pending,     color:'#D97706',  border:'#FDE68A'},
            {label:'En proceso',  value:stats.in_progress, color:'#2563EB',  border:'#BFDBFE'},
            {label:'Completadas', value:stats.completed,   color:'#16a34a',  border:'#BBF7D0'},
          ].map(s=>(
            <div key={s.label} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:'16px 14px', textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize:32, fontWeight:900, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:13, color:MUTED, marginTop:6, fontWeight:500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:16, flexWrap:'wrap', alignItems:'center', background:CARD, padding:4, borderRadius:10, border:`1px solid ${BORDER}` }}>
          {[{key:'all',label:'Todas'},{key:'pending',label:'Pendientes'},{key:'in_progress',label:'En proceso'},{key:'completed',label:'Completadas'},{key:'cancelled',label:'Canceladas'}].map(tab=>(
            <button key={tab.key} onClick={()=>setOTab(tab.key as typeof oTab)} style={{ background:oTab===tab.key?ACCENT:'transparent', color:oTab===tab.key?'#fff':MUTED, border:'none', borderRadius:7, padding:'7px 14px', cursor:'pointer', fontSize:14, fontWeight:600, transition:'all 0.15s' }}>{tab.label}</button>
          ))}
          <button onClick={fetchO} style={{ marginLeft:'auto', background:'transparent', color:MUTED, border:`1px solid ${BORDER}`, borderRadius:7, padding:'7px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:13 }}>
            <RefreshCw size={13}/> Actualizar
          </button>
        </div>

        {/* Table */}
        {loadO
          ? <div style={{ color:MUTED, textAlign:'center', padding:40 }}>Cargando...</div>
          : filtered.length===0
            ? <div style={{ background:CARD, borderRadius:12, padding:48, textAlign:'center', border:`1px solid ${BORDER}` }}>
                <Calendar size={32} color={MUTED} style={{ marginBottom:12 }}/>
                <div style={{ color:MUTED, fontSize:15 }}>No hay órdenes en esta categoría.</div>
              </div>
            : <div style={{ background:CARD, borderRadius:12, border:`1px solid ${BORDER}`, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
                    <thead>
                      <tr style={{ borderBottom:`1px solid ${BORDER}`, background:CARD2 }}>
                        {['Orden','Tipo de Tarea','Técnico','Cliente','Fecha / Hora','Estado','Acciones'].map(h=>(
                          <th key={h} style={{ padding:'12px 16px', textAlign:'left', color:MUTED, fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:0.6, whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((o,idx)=>{
                        const tc=tCfg(o.task_type); const pc=pCfg(o.priority); const sc=sCfg(o.status);
                        return (
                          <tr key={o.id} style={{ borderBottom:idx<filtered.length-1?`1px solid ${BORDER}`:'none' }}>
                            <td style={{ padding:'14px 16px', whiteSpace:'nowrap' }}>
                              <div style={{ color:ACCENT, fontWeight:800, fontSize:13, fontFamily:'monospace', marginBottom:5 }}>{o.order_number}</div>
                              {pc && <span style={{ background:pc.color+'18', color:pc.color, border:`1px solid ${pc.color}33`, borderRadius:4, padding:'2px 8px', fontSize:12, fontWeight:700 }}>{pc.label}</span>}
                            </td>
                            <td style={{ padding:'14px 16px' }}>
                              {tc ? <span style={{ background:tc.color+'18', color:tc.color, border:`1px solid ${tc.color}33`, borderRadius:4, padding:'3px 10px', fontSize:13, fontWeight:700, whiteSpace:'nowrap' }}>{tc.label}</span> : <span style={{ color:MUTED }}>—</span>}
                            </td>
                            <td style={{ padding:'14px 16px' }}>
                              <div style={{ color:TEXT, fontWeight:600, fontSize:14 }}>{o.technician_name??'—'}</div>
                              {o.technician_role && <div style={{ color:MUTED, fontSize:12, marginTop:2 }}>{o.technician_role}</div>}
                            </td>
                            <td style={{ padding:'14px 16px' }}>
                              <div style={{ color:TEXT, fontWeight:600, fontSize:14 }}>{o.client_name??'—'}</div>
                              <div style={{ color:MUTED, fontSize:12, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:2 }}>{o.client_address}</div>
                              {o.client_status && <span style={{ background:o.client_status==='active'?'#F0FDF4':'#FEF2F2', color:o.client_status==='active'?'#16a34a':'#DC2626', fontSize:11, fontWeight:700, borderRadius:10, padding:'1px 7px', marginTop:4, display:'inline-block' }}>{o.client_status==='active'?'Activo':'Inactivo'}</span>}
                            </td>
                            <td style={{ padding:'14px 16px', whiteSpace:'nowrap' }}>
                              <div style={{ color:TEXT, fontSize:14, fontWeight:500 }}>{o.scheduled_date||<span style={{ color:MUTED }}>Sin fecha</span>}</div>
                              {o.scheduled_time && <div style={{ color:MUTED, fontSize:12, marginTop:2 }}>{o.scheduled_time} hrs</div>}
                            </td>
                            <td style={{ padding:'14px 16px' }}>
                              <div style={{ position:'relative', display:'inline-block' }}>
                                {sc && <span style={{ background:sc.color+'18', color:sc.color, border:`1px solid ${sc.color}33`, borderRadius:6, padding:'4px 10px', fontSize:13, fontWeight:700, whiteSpace:'nowrap' }}>{sc.label}</span>}
                                <select value={o.status} onChange={e=>chgStatus(o.id,e.target.value,o)} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }}>
                                  {ORDER_STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                              </div>
                            </td>
                            <td style={{ padding:'14px 16px' }}>
                              <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'nowrap' }}>
                                <Btn onClick={()=>window.open(`/orden/${o.id}`,'_blank')} title="Ver PDF" color="#7c3aed" bg="#F5F3FF"><FileText size={13}/></Btn>
                                <Btn onClick={()=>waT(o)} title={`WhatsApp Técnico${o.whatsapp_tech_sent?' ✓':''}`} color={o.whatsapp_tech_sent?'#16a34a':'#16a34a'} bg={o.whatsapp_tech_sent?'#DCFCE7':'#F0FDF4'}><Wrench size={13}/></Btn>
                                <Btn onClick={()=>waC(o)} title={`WhatsApp Cliente${o.whatsapp_client_sent?' ✓':''}`} color={o.whatsapp_client_sent?'#0891b2':'#16a34a'} bg={o.whatsapp_client_sent?'#E0F2FE':'#F0FDF4'}><MessageCircle size={13}/></Btn>
                                <Btn onClick={()=>openEO(o)} title="Editar" color={ACCENT} bg={ACCENT+'15'}><Pencil size={13}/></Btn>
                                <Btn onClick={()=>delO(o.id,o.order_number)} title="Eliminar" color="#DC2626" bg="#FEF2F2"><Trash2 size={13}/></Btn>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
        }
      </div>

      {/* ── MODAL TÉCNICO ── */}
      {showTM && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, width:'100%', maxWidth:540, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px', borderBottom:`1px solid ${BORDER}` }}>
              <div>
                <h3 style={{ color:TEXT, margin:0, fontSize:17, fontWeight:800 }}>{editT?'Editar Técnico':'Nuevo Técnico'}</h3>
                <p style={{ color:MUTED, margin:'3px 0 0', fontSize:13 }}>Completa la información del técnico</p>
              </div>
              <button onClick={()=>setShowTM(false)} style={{ background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, color:MUTED, cursor:'pointer', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center' }}><X size={16}/></button>
            </div>
            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
              {tForm.photo_url && <div style={{ textAlign:'center' }}><img src={`/api/img-proxy?url=${encodeURIComponent(tForm.photo_url)}`} alt="Preview" style={{ width:72, height:72, borderRadius:10, objectFit:'cover', border:`2px solid ${ACCENT}` }}/></div>}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:12 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Nombre Completo *</label>
                  <input value={tForm.name} onChange={e=>setTForm(f=>({...f,name:e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g,'')}))} placeholder="Juan Carlos Perez" style={iS}/>
                </div>
                <div><label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Cédula</label><input value={tForm.cedula} onChange={e=>setTForm(f=>({...f,cedula:e.target.value.replace(/\D/g,'').slice(0,12)}))} placeholder="123456789" style={iS}/></div>
                <div><label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Cargo</label><select value={tForm.role} onChange={e=>setTForm(f=>({...f,role:e.target.value}))} style={iS}>{TECH_ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
                <div><label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Celular</label><input value={tForm.cellphone} onChange={e=>setTForm(f=>({...f,cellphone:e.target.value.replace(/\D/g,'').slice(0,10)}))} placeholder="3001234567" style={iS}/></div>
                <div><label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Teléfono</label><input value={tForm.phone} onChange={e=>setTForm(f=>({...f,phone:e.target.value.replace(/\D/g,'').slice(0,10)}))} placeholder="6041234567" style={iS}/></div>
                <div><label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Correo</label><input value={tForm.email} onChange={e=>setTForm(f=>({...f,email:e.target.value}))} placeholder="tecnico@email.com" style={iS} type="email"/></div>
                <div><label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Especialidad</label><input value={tForm.specialty} onChange={e=>setTForm(f=>({...f,specialty:e.target.value}))} placeholder="Fibra óptica..." style={iS}/></div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>URL Foto</label>
                  <input value={tForm.photo_url} onChange={e=>setTForm(f=>({...f,photo_url:e.target.value}))} placeholder="https://i.ibb.co/... (ImgBB recomendado)" style={iS}/>
                  <div style={{ color:MUTED, fontSize:12, marginTop:5 }}>Sube la foto en <strong style={{ color:ACCENT }}>imgbb.com</strong> y pega el "Direct link"</div>
                </div>
                <div><label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Estado</label><select value={tForm.status} onChange={e=>setTForm(f=>({...f,status:e.target.value}))} style={iS}><option value="active">Activo</option><option value="inactive">Inactivo</option></select></div>
                <div style={{ gridColumn:'1/-1' }}><label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Notas</label><textarea value={tForm.notes} onChange={e=>setTForm(f=>({...f,notes:e.target.value}))} rows={2} style={{ ...iS, resize:'vertical' }}/></div>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:12, borderTop:`1px solid ${BORDER}` }}>
                <button onClick={()=>setShowTM(false)} style={{ background:CARD2, color:MUTED, border:`1px solid ${BORDER}`, borderRadius:8, padding:'9px 18px', cursor:'pointer', fontSize:14, fontWeight:600 }}>Cancelar</button>
                <button onClick={saveT} disabled={saving} style={{ background:ACCENT, color:'#fff', border:'none', borderRadius:8, padding:'9px 22px', cursor:saving?'not-allowed':'pointer', fontWeight:700, fontSize:14, opacity:saving?0.7:1 }}>{saving?'Guardando...':editT?'Actualizar':'Crear'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ORDEN ── */}
      {showOM && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, width:'100%', maxWidth:600, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px', borderBottom:`1px solid ${BORDER}` }}>
              <div>
                <h3 style={{ color:TEXT, margin:0, fontSize:17, fontWeight:800 }}>{editO?`Editar ${editO.order_number}`:'Nueva Orden de Servicio'}</h3>
                <p style={{ color:MUTED, margin:'3px 0 0', fontSize:13 }}>Asigna tarea a un técnico</p>
              </div>
              <button onClick={()=>setShowOM(false)} style={{ background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, color:MUTED, cursor:'pointer', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center' }}><X size={16}/></button>
            </div>
            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>Tipo de Tarea *</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:8 }}>
                  {TASK_TYPES.map(t=>(
                    <button key={t.value} onClick={()=>setOForm(f=>({...f,task_type:t.value}))} style={{ background:oForm.task_type===t.value?t.color+'20':CARD2, color:oForm.task_type===t.value?t.color:MUTED, border:`1px solid ${oForm.task_type===t.value?t.color+'66':BORDER}`, borderRadius:8, padding:'9px 12px', cursor:'pointer', fontSize:13, fontWeight:oForm.task_type===t.value?700:500, textAlign:'left', transition:'all 0.15s' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:14 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Técnico *</label>
                  <select value={oForm.technician_id||''} onChange={e=>setOForm(f=>({...f,technician_id:Number(e.target.value)}))} style={iS}>
                    <option value="">-- Seleccionar --</option>
                    {technicians.filter(t=>t.status==='active').map(t=><option key={t.id} value={t.id}>{t.name} · {t.role}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn:'1/-1', position:'relative' }}>
                  <label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Cliente *</label>
                  {selC ? (
                    <div style={{ background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ color:TEXT, fontWeight:700, fontSize:15 }}>{selC.name}</div>
                        <div style={{ color:MUTED, fontSize:13, marginTop:2 }}>{selC.address}{selC.neighborhood?`, ${selC.neighborhood}`:''}</div>
                        <span style={{ background:selC.status==='active'?'#F0FDF4':'#FEF2F2', color:selC.status==='active'?'#16a34a':'#DC2626', fontSize:11, fontWeight:700, borderRadius:10, padding:'1px 7px', marginTop:5, display:'inline-block' }}>{selC.status==='active'?'Activo':'Inactivo'}</span>
                      </div>
                      <button onClick={()=>{setSelC(null);setCs('');setOForm(f=>({...f,client_id:0}));}} style={{ background:CARD2, border:`1px solid ${BORDER}`, borderRadius:6, color:MUTED, cursor:'pointer', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14}/></button>
                    </div>
                  ) : (
                    <div style={{ position:'relative' }}>
                      <Search size={14} color={MUTED} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)' }}/>
                      <input value={cs} onChange={e=>setCs(e.target.value)} placeholder="Buscar cliente..." style={{ ...iS, paddingLeft:34 }} onFocus={()=>cRes.length>0&&setShowCD(true)}/>
                      {searchingC && <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', color:MUTED, fontSize:12 }}>...</span>}
                    </div>
                  )}
                  {showCD && cRes.length>0 && !selC && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:CARD, border:`1px solid ${BORDER}`, borderRadius:8, zIndex:50, maxHeight:220, overflowY:'auto', boxShadow:'0 8px 24px rgba(0,0,0,0.12)' }}>
                      {cRes.map(c=>(
                        <button key={c.id} onClick={()=>{setSelC(c);setOForm(f=>({...f,client_id:c.id}));setShowCD(false);setCs(c.name);}} style={{ width:'100%', background:'none', border:'none', borderBottom:`1px solid ${BORDER}`, padding:'10px 14px', cursor:'pointer', textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div><div style={{ color:TEXT, fontWeight:600, fontSize:14 }}>{c.name}</div><div style={{ color:MUTED, fontSize:12 }}>{c.address}</div></div>
                          <span style={{ background:c.status==='active'?'#F0FDF4':'#FEF2F2', color:c.status==='active'?'#16a34a':'#DC2626', fontSize:11, fontWeight:700, borderRadius:10, padding:'2px 7px' }}>{c.status==='active'?'Activo':'Inactivo'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div><label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Fecha</label><input type="date" value={oForm.scheduled_date} onChange={e=>setOForm(f=>({...f,scheduled_date:e.target.value}))} style={iS}/></div>
                <div><label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Hora</label><input type="time" value={oForm.scheduled_time} onChange={e=>setOForm(f=>({...f,scheduled_time:e.target.value}))} style={iS}/></div>
                <div><label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Prioridad</label><select value={oForm.priority} onChange={e=>setOForm(f=>({...f,priority:e.target.value}))} style={iS}>{PRIORITIES.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
                <div><label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Creado por</label><input value={oForm.created_by} onChange={e=>setOForm(f=>({...f,created_by:e.target.value}))} style={iS}/></div>
                <div style={{ gridColumn:'1/-1' }}><label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Descripción</label><textarea value={oForm.task_description} onChange={e=>setOForm(f=>({...f,task_description:e.target.value}))} rows={3} style={{ ...iS, resize:'vertical' }}/></div>
                <div style={{ gridColumn:'1/-1' }}><label style={{ color:MUTED, fontSize:12, fontWeight:700, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Novedades</label><textarea value={oForm.notes} onChange={e=>setOForm(f=>({...f,notes:e.target.value}))} rows={2} style={{ ...iS, resize:'vertical' }}/></div>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:12, borderTop:`1px solid ${BORDER}` }}>
                <button onClick={()=>setShowOM(false)} style={{ background:CARD2, color:MUTED, border:`1px solid ${BORDER}`, borderRadius:8, padding:'9px 18px', cursor:'pointer', fontSize:14, fontWeight:600 }}>Cancelar</button>
                <button onClick={saveO} disabled={saving} style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'9px 22px', cursor:saving?'not-allowed':'pointer', fontWeight:700, fontSize:14, opacity:saving?0.7:1 }}>{saving?'Guardando...':editO?'Actualizar':'Crear Orden'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
