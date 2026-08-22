'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, MessageCircle, FileText, Phone, Wrench, Search, X, Calendar, RefreshCw } from 'lucide-react';

interface Technician { id:number; name:string; cedula:string; phone:string; cellphone:string; email:string; photo_url:string; role:string; specialty:string; status:string; notes:string; created_at:string; }
interface ClientResult { id:number; name:string; address:string; neighborhood:string; commune:string; cellphone:string; plan:string; status:string; cedula:string; punto_referencia:string; }
interface WorkOrder { id:number; order_number:string; technician_id:number; client_id:number; task_type:string; task_description:string; priority:string; scheduled_date:string; scheduled_time:string; status:string; notes:string; created_by:string; whatsapp_tech_sent:number; whatsapp_client_sent:number; created_at:string; technician_name?:string; technician_phone?:string; technician_role?:string; client_name?:string; client_address?:string; client_phone?:string; client_plan?:string; client_status?:string; client_neighborhood?:string; client_punto_referencia?:string; }

const TASK_TYPES = [
  { value:'INSTALACION_SERVICIO', label:'Instalacion de Servicio', color:'#16a34a' },
  { value:'ESTUDIO_ZONA',         label:'Estudio de Zona',          color:'#2563eb' },
  { value:'RETIRO_EQUIPOS',       label:'Retiro de Equipos',        color:'#dc2626' },
  { value:'ACTUALIZACION',        label:'Actualizacion',            color:'#7c3aed' },
  { value:'REPARACION',           label:'Reparacion',               color:'#ea580c' },
  { value:'SOPORTE',              label:'Soporte Tecnico',          color:'#0891b2' },
  { value:'INSTALACION_ELECTRICA',label:'Instalacion Electrica',   color:'#ca8a04' },
  { value:'OTRA',                 label:'Otra Area',                color:'#475569' },
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

const C = { bg:'#0b0f19', card:'#111827', card2:'#0f172a', border:'#1e293b', text:'#f1f5f9', muted:'#64748b', accent:'#2563eb' };
const iS: React.CSSProperties = { background:C.card2, border:`1px solid ${C.border}`, color:C.text, borderRadius:8, padding:'11px 14px', width:'100%', outline:'none', fontSize:15, boxSizing:'border-box' };
const EMPTY_T = { name:'',cedula:'',phone:'',cellphone:'',email:'',photo_url:'',role:'Tecnico',specialty:'',status:'active',notes:'' };
const EMPTY_O = { technician_id:0,client_id:0,task_type:'',task_description:'',priority:'normal',scheduled_date:'',scheduled_time:'',notes:'',created_by:'Mariana' };

const tCfg = (v:string) => TASK_TYPES.find(t=>t.value===v);
const pCfg = (v:string) => PRIORITIES.find(p=>p.value===v);
const sCfg = (v:string) => ORDER_STATUSES.find(s=>s.value===v);

function Badge({ label, color }: { label:string; color:string }) {
  return <span style={{ background:color+'22', color, border:`1px solid ${color}44`, borderRadius:6, padding:'3px 10px', fontSize:13, fontWeight:700, whiteSpace:'nowrap' }}>{label}</span>;
}

export default function TecnicosTab() {
  const [technicians,setTechnicians]=useState<Technician[]>([]);
  const [workOrders,setWorkOrders]=useState<WorkOrder[]>([]);
  const [loadT,setLoadT]=useState(false); const [loadO,setLoadO]=useState(false); const [saving,setSaving]=useState(false);
  const [showTM,setShowTM]=useState(false); const [editT,setEditT]=useState<Technician|null>(null); const [tForm,setTForm]=useState({...EMPTY_T});
  const [showOM,setShowOM]=useState(false); const [editO,setEditO]=useState<WorkOrder|null>(null); const [oForm,setOForm]=useState({...EMPTY_O});
  const [cs,setCs]=useState(''); const [cRes,setCRes]=useState<ClientResult[]>([]); const [selC,setSelC]=useState<ClientResult|null>(null); const [searchingC,setSearchingC]=useState(false); const [showCD,setShowCD]=useState(false);
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
  function openEO(o:WorkOrder){ setEditO(o); setOForm({technician_id:o.technician_id,client_id:o.client_id,task_type:o.task_type,task_description:o.task_description,priority:o.priority,scheduled_date:o.scheduled_date,scheduled_time:o.scheduled_time,notes:o.notes,created_by:o.created_by}); setSelC({id:o.client_id,name:o.client_name??'',address:o.client_address??'',neighborhood:o.client_neighborhood??'',commune:'',cellphone:o.client_phone??'',plan:o.client_plan??'',status:o.client_status??'',cedula:'',punto_referencia:o.client_punto_referencia??''}); setCs(o.client_name??''); setShowOM(true); }
  async function saveO(){ if(!oForm.technician_id){alert('Selecciona un tecnico');return;} if(!oForm.client_id){alert('Selecciona un cliente');return;} if(!oForm.task_type){alert('Selecciona el tipo de tarea');return;} setSaving(true); try{ const url=editO?`/api/work-orders/${editO.id}`:'/api/work-orders'; const body=editO?{...oForm,status:editO.status,whatsapp_tech_sent:editO.whatsapp_tech_sent,whatsapp_client_sent:editO.whatsapp_client_sent}:oForm; const r=await fetch(url,{method:editO?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); if(!r.ok){const e=await r.json();alert(e.error??'Error');return;} setShowOM(false);fetchO(); }finally{setSaving(false);} }
  async function delO(id:number,num:string){ if(!confirm(`Eliminar orden ${num}?`))return; await fetch(`/api/work-orders/${id}`,{method:'DELETE'}); fetchO(); }
  async function chgStatus(id:number,status:string,o:WorkOrder){ await fetch(`/api/work-orders/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...o,status})}); fetchO(); }

  async function waT(o:WorkOrder){ const t=tCfg(o.task_type); const msg=[`ORDEN DE SERVICIO - MEDIFIBRA S.A.S`,`Orden: ${o.order_number}`,``,`Tecnico: ${o.technician_name}`,`Tarea: ${t?.label??o.task_type}`,`Fecha: ${o.scheduled_date||'Por definir'}${o.scheduled_time?' a las '+o.scheduled_time:''}`,``,`CLIENTE:`,`Nombre: ${o.client_name}`,`Direccion: ${o.client_address??''}${o.client_neighborhood?', '+o.client_neighborhood:''}`,o.client_punto_referencia?`Referencia: ${o.client_punto_referencia}`:'',`Telefono: ${o.client_phone}`,`Plan: ${o.client_plan}`,o.task_description?`\nDescripcion: ${o.task_description}`:'',o.notes?`\nNovedades: ${o.notes}`:'',``,`Confirme recibido.`,`Mariana - Medifibra S.A.S`].filter(Boolean).join('\n').trim(); window.open(`https://wa.me/57${o.technician_phone}?text=${encodeURIComponent(msg)}`,'_blank'); await fetch(`/api/work-orders/${o.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...o,whatsapp_tech_sent:1})}); fetchO(); }
  async function waC(o:WorkOrder){ const t=tCfg(o.task_type); const msg=[`MEDIFIBRA S.A.S - Agendamiento de Visita Tecnica`,`Orden: ${o.order_number}`,``,`Estimado(a) ${o.client_name},`,``,`Le informamos que hemos programado una visita tecnica:`,`Servicio: ${t?.label??o.task_type}`,`Fecha: ${o.scheduled_date||'Por definir'}${o.scheduled_time?' a las '+o.scheduled_time+' hrs':''}`,`Tecnico asignado: ${o.technician_name}`,``,`Direccion registrada: ${o.client_address??''}`,``,`Para dudas comuniquese al 333 728 8745`,``,`Medifibra S.A.S - "Conectate con velocidad real"`].join('\n'); window.open(`https://wa.me/57${o.client_phone}?text=${encodeURIComponent(msg)}`,'_blank'); await fetch(`/api/work-orders/${o.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...o,whatsapp_client_sent:1})}); fetchO(); }

  const filtered=workOrders.filter(o=>oTab==='all'||o.status===oTab);
  const stats={ total:workOrders.length, pending:workOrders.filter(o=>o.status==='pending').length, in_progress:workOrders.filter(o=>o.status==='in_progress').length, completed:workOrders.filter(o=>o.status==='completed').length };

  const BtnAct=({onClick,title,color,bg,children}:{onClick:()=>void;title:string;color:string;bg:string;children:React.ReactNode})=>(
    <button onClick={onClick} title={title} style={{ background:bg, color, border:`1px solid ${color}33`, borderRadius:6, width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{children}</button>
  );

  return (
    <div style={{ padding:'0 0 60px' }}>

      {/* ── TECNICOS ── */}
      <div style={{ marginBottom:40 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <h2 style={{ color:C.text, fontWeight:800, fontSize:24, margin:0 }}>Personal Tecnico</h2>
            <p style={{ color:C.muted, fontSize:15, margin:'4px 0 0' }}>{technicians.length} tecnico{technicians.length!==1?'s':''} registrado{technicians.length!==1?'s':''}</p>
          </div>
          <button onClick={openNT} style={{ background:C.accent, color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', cursor:'pointer', fontWeight:700, fontSize:15, display:'flex', alignItems:'center', gap:7 }}>
            <Plus size={16}/> Nuevo Tecnico
          </button>
        </div>

        {loadT ? <div style={{ color:C.muted, textAlign:'center', padding:40, fontSize:15 }}>Cargando...</div>
        : technicians.length===0 ? (
          <div style={{ background:C.card, borderRadius:10, padding:48, textAlign:'center', border:`1px solid ${C.border}` }}>
            <Wrench size={36} color={C.muted} style={{ marginBottom:12 }}/>
            <div style={{ color:C.muted, fontSize:16 }}>No hay tecnicos registrados.</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
            {technicians.map(t=>(
              <div key={t.id} style={{ background:C.card, borderRadius:10, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                <div style={{ height:3, background:t.status==='active'?'#16a34a':'#475569' }}/>
                <div style={{ padding:18 }}>
                  <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                    <div style={{ width:64, height:64, borderRadius:10, background:C.card2, border:`2px solid ${C.accent}`, flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, color:C.muted, fontWeight:700 }}>
                      {t.photo_url
                        ? <img src={`/api/img-proxy?url=${encodeURIComponent(t.photo_url)}`} alt={t.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
                        : t.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:17, color:C.text, marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.name}</div>
                      <span style={{ background:C.accent+'22', color:'#60a5fa', border:`1px solid ${C.accent}33`, borderRadius:4, padding:'2px 8px', fontSize:12, fontWeight:700 }}>{t.role}</span>
                      {t.specialty && <div style={{ color:C.muted, fontSize:13, marginTop:4 }}>{t.specialty}</div>}
                    </div>
                    <span style={{ background:t.status==='active'?'#052e16':'#1e293b', color:t.status==='active'?'#4ade80':'#94a3b8', border:`1px solid ${t.status==='active'?'#16653466':'#37415166'}`, borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
                      {t.status==='active'?'Activo':'Inactivo'}
                    </span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:3, marginTop:10 }}>
                    {t.cedula    && <div style={{ fontSize:14, color:C.muted }}>C.C. {t.cedula}</div>}
                    {t.cellphone && <div style={{ fontSize:14, color:C.muted, display:'flex', alignItems:'center', gap:5 }}><Phone size={12}/>{t.cellphone}</div>}
                    {t.email     && <div style={{ fontSize:14, color:C.muted }}>{t.email}</div>}
                  </div>
                  <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ color:C.muted, fontSize:13 }}>{workOrders.filter(o=>o.technician_id===t.id&&o.status!=='completed'&&o.status!=='cancelled').length} orden(es) activa(s)</span>
                    <div style={{ display:'flex', gap:6 }}>
                      <BtnAct onClick={()=>openET(t)} title="Editar" color="#60a5fa" bg="#1e3a5f22"><Pencil size={14}/></BtnAct>
                      <BtnAct onClick={()=>delT(t.id,t.name)} title="Eliminar" color="#f87171" bg="#2d0a0a22"><Trash2 size={14}/></BtnAct>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ORDENES ── */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:12 }}>
          <div>
            <h2 style={{ color:C.text, fontWeight:800, fontSize:24, margin:0 }}>Ordenes de Servicio</h2>
            <p style={{ color:C.muted, fontSize:15, margin:'4px 0 0' }}>Asignacion y seguimiento de tareas</p>
          </div>
          <button onClick={openNO} style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', cursor:'pointer', fontWeight:700, fontSize:15, display:'flex', alignItems:'center', gap:7 }}>
            <Plus size={16}/> Nueva Orden
          </button>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:18 }}>
          {[{label:'Total',value:stats.total,color:'#94a3b8',bg:C.card},{label:'Pendientes',value:stats.pending,color:'#ca8a04',bg:'#1c1400'},{label:'En proceso',value:stats.in_progress,color:'#2563eb',bg:'#0f1e3a'},{label:'Completadas',value:stats.completed,color:'#16a34a',bg:'#052e16'}].map(s=>(
            <div key={s.label} style={{ background:s.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 18px', textAlign:'center' }}>
              <div style={{ fontSize:30, fontWeight:900, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:13, color:C.muted, marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
          {[{key:'all',label:'Todas'},{key:'pending',label:'Pendientes'},{key:'in_progress',label:'En proceso'},{key:'completed',label:'Completadas'},{key:'cancelled',label:'Canceladas'}].map(tab=>(
            <button key={tab.key} onClick={()=>setOTab(tab.key as typeof oTab)} style={{ background:oTab===tab.key?C.accent:C.card, color:oTab===tab.key?'#fff':C.muted, border:`1px solid ${oTab===tab.key?C.accent:C.border}`, borderRadius:8, padding:'7px 16px', cursor:'pointer', fontSize:14, fontWeight:600 }}>{tab.label}</button>
          ))}
          <button onClick={fetchO} style={{ marginLeft:'auto', background:C.card, color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:14 }}>
            <RefreshCw size={13}/> Actualizar
          </button>
        </div>

        {/* Table */}
        {loadO ? <div style={{ color:C.muted, textAlign:'center', padding:40, fontSize:15 }}>Cargando...</div>
        : filtered.length===0 ? (
          <div style={{ background:C.card, borderRadius:10, padding:48, textAlign:'center', border:`1px solid ${C.border}` }}>
            <Calendar size={36} color={C.muted} style={{ marginBottom:12 }}/>
            <div style={{ color:C.muted, fontSize:16 }}>No hay ordenes en esta categoria.</div>
          </div>
        ) : (
          <div style={{ background:C.card, borderRadius:10, border:`1px solid ${C.border}`, overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.border}`, background:C.card2 }}>
                    {['Orden','Tipo de Tarea','Tecnico','Cliente','Fecha / Hora','Estado','Acciones'].map(h=>(
                      <th key={h} style={{ padding:'12px 14px', textAlign:'left', color:C.muted, fontWeight:700, fontSize:12, textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o,idx)=>{
                    const tc=tCfg(o.task_type); const pc=pCfg(o.priority); const sc=sCfg(o.status);
                    return (
                      <tr key={o.id} style={{ borderBottom:idx<filtered.length-1?`1px solid ${C.border}`:'none' }}>
                        <td style={{ padding:'12px 14px', whiteSpace:'nowrap' }}>
                          <div style={{ color:'#60a5fa', fontWeight:800, fontSize:13, fontFamily:'monospace', marginBottom:4 }}>{o.order_number}</div>
                          {pc && <Badge label={pc.label} color={pc.color}/>}
                        </td>
                        <td style={{ padding:'12px 14px' }}>
                          {tc ? <Badge label={tc.label} color={tc.color}/> : <span style={{ color:C.muted }}>—</span>}
                        </td>
                        <td style={{ padding:'12px 14px' }}>
                          <div style={{ color:C.text, fontWeight:600, fontSize:14 }}>{o.technician_name??'—'}</div>
                          {o.technician_role && <div style={{ color:C.muted, fontSize:12 }}>{o.technician_role}</div>}
                        </td>
                        <td style={{ padding:'12px 14px' }}>
                          <div style={{ color:C.text, fontWeight:600, fontSize:14 }}>{o.client_name??'—'}</div>
                          <div style={{ color:C.muted, fontSize:12, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.client_address}</div>
                          {o.client_status && <span style={{ background:o.client_status==='active'?'#052e1622':'#2d0a0a22', color:o.client_status==='active'?'#4ade80':'#f87171', fontSize:11, fontWeight:700, borderRadius:10, padding:'1px 7px' }}>{o.client_status==='active'?'Activo':'Inactivo'}</span>}
                        </td>
                        <td style={{ padding:'12px 14px', whiteSpace:'nowrap' }}>
                          <div style={{ color:C.text, fontSize:14 }}>{o.scheduled_date||<span style={{ color:C.muted }}>Sin fecha</span>}</div>
                          {o.scheduled_time && <div style={{ color:C.muted, fontSize:12 }}>{o.scheduled_time} hrs</div>}
                        </td>
                        <td style={{ padding:'12px 14px' }}>
                          <div style={{ position:'relative', display:'inline-block' }}>
                            {sc && <Badge label={sc.label} color={sc.color}/>}
                            <select value={o.status} onChange={e=>chgStatus(o.id,e.target.value,o)} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }}>
                              {ORDER_STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </div>
                        </td>
                        <td style={{ padding:'12px 14px' }}>
                          {/* FILA ÚNICA de botones — todos del mismo tamaño */}
                          <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'nowrap' }}>
                            <BtnAct onClick={()=>window.open(`/orden/${o.id}`,'_blank')} title="Ver PDF" color="#a78bfa" bg="#1a0533"><FileText size={14}/></BtnAct>
                            <BtnAct onClick={()=>waT(o)} title={`WA Tecnico${o.whatsapp_tech_sent?' (enviado)':''}`} color={o.whatsapp_tech_sent?'#4ade80':'#22c55e'} bg={o.whatsapp_tech_sent?'#052e16':'#0a1a0a'}><Wrench size={14}/></BtnAct>
                            <BtnAct onClick={()=>waC(o)} title={`WA Cliente${o.whatsapp_client_sent?' (enviado)':''}`} color={o.whatsapp_client_sent?'#34d399':'#22c55e'} bg={o.whatsapp_client_sent?'#0f2a1f':'#0a1a12'}><MessageCircle size={14}/></BtnAct>
                            <BtnAct onClick={()=>openEO(o)} title="Editar" color="#60a5fa" bg="#1e3a5f22"><Pencil size={14}/></BtnAct>
                            <BtnAct onClick={()=>delO(o.id,o.order_number)} title="Eliminar" color="#f87171" bg="#2d0a0a22"><Trash2 size={14}/></BtnAct>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL TECNICO ── */}
      {showTM && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.80)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'#0f172a', border:`1px solid ${C.border}`, borderRadius:12, width:'100%', maxWidth:540, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px 16px', borderBottom:`1px solid ${C.border}` }}>
              <h3 style={{ color:C.text, margin:0, fontSize:18, fontWeight:800 }}>{editT?'Editar Tecnico':'Nuevo Tecnico'}</h3>
              <button onClick={()=>setShowTM(false)} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer' }}><X size={20}/></button>
            </div>
            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
              {tForm.photo_url && <div style={{ textAlign:'center' }}><img src={`/api/img-proxy?url=${encodeURIComponent(tForm.photo_url)}`} alt="Preview" style={{ width:80, height:80, borderRadius:10, objectFit:'cover', border:`2px solid ${C.accent}` }}/></div>}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:12 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>NOMBRE COMPLETO *</label>
                  <input value={tForm.name} onChange={e=>setTForm(f=>({...f,name:e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g,'')}))} placeholder="Juan Carlos Perez" style={iS}/>
                </div>
                <div><label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>CEDULA</label><input value={tForm.cedula} onChange={e=>setTForm(f=>({...f,cedula:e.target.value.replace(/\D/g,'').slice(0,12)}))} placeholder="123456789" style={iS}/></div>
                <div><label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>CARGO</label><select value={tForm.role} onChange={e=>setTForm(f=>({...f,role:e.target.value}))} style={iS}>{TECH_ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
                <div><label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>CELULAR</label><input value={tForm.cellphone} onChange={e=>setTForm(f=>({...f,cellphone:e.target.value.replace(/\D/g,'').slice(0,10)}))} placeholder="3001234567" style={iS}/></div>
                <div><label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>TELEFONO</label><input value={tForm.phone} onChange={e=>setTForm(f=>({...f,phone:e.target.value.replace(/\D/g,'').slice(0,10)}))} placeholder="6041234567" style={iS}/></div>
                <div><label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>CORREO</label><input value={tForm.email} onChange={e=>setTForm(f=>({...f,email:e.target.value}))} placeholder="tecnico@email.com" style={iS} type="email"/></div>
                <div><label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>ESPECIALIDAD</label><input value={tForm.specialty} onChange={e=>setTForm(f=>({...f,specialty:e.target.value}))} placeholder="Fibra optica..." style={iS}/></div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>URL FOTO</label>
                  <input value={tForm.photo_url} onChange={e=>setTForm(f=>({...f,photo_url:e.target.value}))} placeholder="https://i.ibb.co/... (ImgBB recomendado)" style={iS}/>
                  <div style={{ color:C.muted, fontSize:12, marginTop:5 }}>Sube la foto en <strong style={{ color:'#60a5fa' }}>imgbb.com</strong> y pega el "Direct link"</div>
                </div>
                <div><label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>ESTADO</label><select value={tForm.status} onChange={e=>setTForm(f=>({...f,status:e.target.value}))} style={iS}><option value="active">Activo</option><option value="inactive">Inactivo</option></select></div>
                <div style={{ gridColumn:'1/-1' }}><label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>NOTAS</label><textarea value={tForm.notes} onChange={e=>setTForm(f=>({...f,notes:e.target.value}))} rows={2} style={{ ...iS, resize:'vertical' }}/></div>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:10, borderTop:`1px solid ${C.border}` }}>
                <button onClick={()=>setShowTM(false)} style={{ background:C.card, color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 18px', cursor:'pointer', fontSize:14 }}>Cancelar</button>
                <button onClick={saveT} disabled={saving} style={{ background:C.accent, color:'#fff', border:'none', borderRadius:8, padding:'10px 22px', cursor:saving?'not-allowed':'pointer', fontWeight:800, fontSize:14, opacity:saving?0.7:1 }}>{saving?'Guardando...':editT?'Actualizar':'Crear'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ORDEN ── */}
      {showOM && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'#0f172a', border:`1px solid ${C.border}`, borderRadius:12, width:'100%', maxWidth:600, maxHeight:'92vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px 16px', borderBottom:`1px solid ${C.border}` }}>
              <h3 style={{ color:C.text, margin:0, fontSize:18, fontWeight:800 }}>{editO?`Editar ${editO.order_number}`:'Nueva Orden de Servicio'}</h3>
              <button onClick={()=>setShowOM(false)} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer' }}><X size={20}/></button>
            </div>
            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:8 }}>TIPO DE TAREA *</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:8 }}>
                  {TASK_TYPES.map(t=>(
                    <button key={t.value} onClick={()=>setOForm(f=>({...f,task_type:t.value}))} style={{ background:oForm.task_type===t.value?t.color+'25':C.card, color:oForm.task_type===t.value?t.color:C.muted, border:`1px solid ${oForm.task_type===t.value?t.color+'66':C.border}`, borderRadius:8, padding:'9px 12px', cursor:'pointer', fontSize:13, fontWeight:oForm.task_type===t.value?700:400, textAlign:'left' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:14 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>TECNICO *</label>
                  <select value={oForm.technician_id||''} onChange={e=>setOForm(f=>({...f,technician_id:Number(e.target.value)}))} style={iS}>
                    <option value="">-- Seleccionar --</option>
                    {technicians.filter(t=>t.status==='active').map(t=><option key={t.id} value={t.id}>{t.name} · {t.role}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn:'1/-1', position:'relative' }}>
                  <label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>CLIENTE *</label>
                  {selC ? (
                    <div style={{ background:'#052e1622', border:'1px solid #16653444', borderRadius:8, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ color:C.text, fontWeight:700, fontSize:15 }}>{selC.name}</div>
                        <div style={{ color:C.muted, fontSize:13 }}>{selC.address}{selC.neighborhood?`, ${selC.neighborhood}`:''}</div>
                        <div style={{ display:'flex', gap:8, marginTop:5 }}>
                          <span style={{ background:selC.status==='active'?'#052e1633':'#2d0a0a33', color:selC.status==='active'?'#4ade80':'#f87171', fontSize:11, fontWeight:700, borderRadius:10, padding:'1px 7px' }}>{selC.status==='active'?'Activo':'Inactivo'}</span>
                          <span style={{ color:C.muted, fontSize:13 }}>{selC.plan}</span>
                        </div>
                      </div>
                      <button onClick={()=>{setSelC(null);setCs('');setOForm(f=>({...f,client_id:0}));}} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer' }}><X size={16}/></button>
                    </div>
                  ) : (
                    <div style={{ position:'relative' }}>
                      <Search size={14} color={C.muted} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)' }}/>
                      <input value={cs} onChange={e=>setCs(e.target.value)} placeholder="Buscar cliente..." style={{ ...iS, paddingLeft:34 }} onFocus={()=>cRes.length>0&&setShowCD(true)}/>
                      {searchingC && <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', color:C.muted, fontSize:12 }}>...</span>}
                    </div>
                  )}
                  {showCD && cRes.length>0 && !selC && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#0f172a', border:`1px solid ${C.border}`, borderRadius:8, zIndex:50, maxHeight:220, overflowY:'auto', boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
                      {cRes.map(c=>(
                        <button key={c.id} onClick={()=>{setSelC(c);setOForm(f=>({...f,client_id:c.id}));setShowCD(false);setCs(c.name);}} style={{ width:'100%', background:'none', border:'none', borderBottom:`1px solid ${C.border}`, padding:'10px 14px', cursor:'pointer', textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div><div style={{ color:C.text, fontWeight:600, fontSize:14 }}>{c.name}</div><div style={{ color:C.muted, fontSize:12 }}>{c.address}</div></div>
                          <span style={{ background:c.status==='active'?'#052e1633':'#2d0a0a33', color:c.status==='active'?'#4ade80':'#f87171', fontSize:11, fontWeight:700, borderRadius:10, padding:'2px 7px' }}>{c.status==='active'?'Activo':'Inactivo'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div><label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>FECHA</label><input type="date" value={oForm.scheduled_date} onChange={e=>setOForm(f=>({...f,scheduled_date:e.target.value}))} style={{ ...iS, colorScheme:'dark' }}/></div>
                <div><label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>HORA</label><input type="time" value={oForm.scheduled_time} onChange={e=>setOForm(f=>({...f,scheduled_time:e.target.value}))} style={{ ...iS, colorScheme:'dark' }}/></div>
                <div><label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>PRIORIDAD</label><select value={oForm.priority} onChange={e=>setOForm(f=>({...f,priority:e.target.value}))} style={iS}>{PRIORITIES.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
                <div><label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>CREADO POR</label><input value={oForm.created_by} onChange={e=>setOForm(f=>({...f,created_by:e.target.value}))} style={iS}/></div>
                <div style={{ gridColumn:'1/-1' }}><label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>DESCRIPCION</label><textarea value={oForm.task_description} onChange={e=>setOForm(f=>({...f,task_description:e.target.value}))} rows={3} style={{ ...iS, resize:'vertical' }}/></div>
                <div style={{ gridColumn:'1/-1' }}><label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>NOVEDADES</label><textarea value={oForm.notes} onChange={e=>setOForm(f=>({...f,notes:e.target.value}))} rows={2} style={{ ...iS, resize:'vertical' }}/></div>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:10, borderTop:`1px solid ${C.border}` }}>
                <button onClick={()=>setShowOM(false)} style={{ background:C.card, color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 18px', cursor:'pointer', fontSize:14 }}>Cancelar</button>
                <button onClick={saveO} disabled={saving} style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'10px 22px', cursor:saving?'not-allowed':'pointer', fontWeight:800, fontSize:14, opacity:saving?0.7:1 }}>{saving?'Guardando...':editO?'Actualizar':'Crear Orden'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
