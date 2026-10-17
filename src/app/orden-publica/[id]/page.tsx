'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface OrdenPublica {
  id: number;
  order_number: string;
  task_type: string;
  task_description: string;
  priority: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  notes: string;
  created_at: string;
  technician_name: string;
  technician_role: string;
  technician_phone: string;
  client_name: string;
  client_address: string;
  client_neighborhood: string;
  client_plan: string;
  client_punto_referencia: string;
}

const TASK_LABELS: Record<string, string> = {
  INSTALACION_SERVICIO:  'Instalacion de Servicio',
  ESTUDIO_ZONA:          'Estudio de Zona',
  RETIRO_EQUIPOS:        'Retiro de Equipos',
  ACTUALIZACION:         'Actualizacion',
  REPARACION:            'Reparacion',
  SOPORTE:               'Soporte Tecnico',
  INSTALACION_ELECTRICA: 'Instalacion Electrica',
  OTRA:                  'Otra Area',
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pendiente',   color: '#ca8a04', bg: '#451a0320' },
  in_progress: { label: 'En Proceso',  color: '#3b82f6', bg: '#1d4ed820' },
  completed:   { label: 'Completada',  color: '#22c55e', bg: '#14532d20' },
  cancelled:   { label: 'Cancelada',   color: '#6b7280', bg: '#11182720' },
};

const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
  low:    { label: 'Baja',    color: '#6b7280' },
  normal: { label: 'Normal',  color: '#3b82f6' },
  high:   { label: 'Alta',    color: '#f97316' },
  urgent: { label: 'Urgente', color: '#ef4444' },
};

function fmtDate(d: string): string {
  if (!d) return 'Por definir';
  const [y, m, day] = d.split('-');
  const meses = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${parseInt(day)} de ${meses[parseInt(m)]} de ${y}`;
}

export default function OrdenPublicaPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrdenPublica | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/orden-publica/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); }
        else { setOrder(d.order); }
        setLoading(false);
      })
      .catch(() => { setError('No se pudo cargar la orden.'); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#080c1c', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#60a5fa', fontSize:16, fontWeight:600 }}>Cargando orden...</div>
    </div>
  );

  if (error || !order) return (
    <div style={{ minHeight:'100vh', background:'#080c1c', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
      <div style={{ color:'#ef4444', fontSize:18, fontWeight:700 }}>Orden no encontrada</div>
      <div style={{ color:'#6b7280', fontSize:14 }}>Verifica el enlace o contacta a Medifibra S.A.S.</div>
      <div style={{ color:'#6b7280', fontSize:14 }}>WhatsApp: 333 728 8745</div>
    </div>
  );

  const st = STATUS_CFG[order.status] ?? STATUS_CFG.pending;
  const pr = PRIORITY_CFG[order.priority] ?? PRIORITY_CFG.normal;

  return (
    <div style={{ minHeight:'100vh', background:'#080c1c', fontFamily:'system-ui, -apple-system, sans-serif', padding:'24px 16px' }}>
      <div style={{ maxWidth:520, margin:'0 auto' }}>

        {/* Header empresa */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <img
            src="/medifibra_sin_fondo_1050.png"
            alt="Medifibra"
            style={{ height:52, objectFit:'contain', marginBottom:8 }}
          />
          <div style={{ color:'#9ca3af', fontSize:13 }}>Medifibra S.A.S. — NIT 902060057-8</div>
          <div style={{ color:'#6b7280', fontSize:12, marginTop:2 }}>Proveedor de internet por fibra optica — Medellin, Colombia</div>
        </div>

        {/* Card principal */}
        <div style={{ background:'#111827', border:'1px solid #1f2937', borderRadius:16, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>

          {/* Encabezado orden */}
          <div style={{ background:'#0f172a', borderBottom:'1px solid #1f2937', padding:'20px 24px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Orden de Servicio</div>
                <div style={{ color:'#3b82f6', fontSize:22, fontWeight:900, fontFamily:'monospace', letterSpacing:1 }}>{order.order_number}</div>
              </div>
              <span style={{ background:st.bg, color:st.color, border:`1px solid ${st.color}44`, borderRadius:8, padding:'6px 14px', fontSize:14, fontWeight:700, whiteSpace:'nowrap' }}>
                {st.label}
              </span>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
              <span style={{ background:'#1e293b', color:pr.color, border:`1px solid ${pr.color}33`, borderRadius:6, padding:'3px 10px', fontSize:12, fontWeight:700 }}>
                Prioridad {pr.label}
              </span>
              <span style={{ background:'#1e293b', color:'#a78bfa', border:'1px solid #6d28d933', borderRadius:6, padding:'3px 10px', fontSize:12, fontWeight:700 }}>
                {TASK_LABELS[order.task_type] ?? order.task_type}
              </span>
            </div>
          </div>

          <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>

            {/* Fecha y hora */}
            <div style={{ background:'#1e293b', borderRadius:10, padding:'14px 16px', border:'1px solid #334155' }}>
              <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Fecha programada</div>
              <div style={{ color:'#f1f5f9', fontSize:17, fontWeight:700 }}>{fmtDate(order.scheduled_date)}</div>
              {order.scheduled_time && (
                <div style={{ color:'#94a3b8', fontSize:14, marginTop:4 }}>Hora: {order.scheduled_time} hrs</div>
              )}
            </div>

            {/* Tecnico */}
            <div style={{ background:'#1e293b', borderRadius:10, padding:'14px 16px', border:'1px solid #334155' }}>
              <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Tecnico asignado</div>
              <div style={{ color:'#f1f5f9', fontSize:16, fontWeight:700 }}>{order.technician_name ?? 'Por asignar'}</div>
              {order.technician_role && (
                <div style={{ color:'#94a3b8', fontSize:13, marginTop:3 }}>{order.technician_role}</div>
              )}
            </div>

            {/* Descripcion */}
            {order.task_description && (
              <div style={{ background:'#1e293b', borderRadius:10, padding:'14px 16px', border:'1px solid #334155' }}>
                <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Descripcion del servicio</div>
                <div style={{ color:'#f1f5f9', fontSize:14, lineHeight:1.6 }}>{order.task_description}</div>
              </div>
            )}

            {/* Direccion */}
            <div style={{ background:'#1e293b', borderRadius:10, padding:'14px 16px', border:'1px solid #334155' }}>
              <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Direccion de visita</div>
              <div style={{ color:'#f1f5f9', fontSize:15, fontWeight:600 }}>{order.client_address ?? ''}{order.client_neighborhood ? ', ' + order.client_neighborhood : ''}</div>
              {order.client_punto_referencia && (
                <div style={{ color:'#94a3b8', fontSize:13, marginTop:4, fontStyle:'italic' }}>{order.client_punto_referencia}</div>
              )}
            </div>

            {/* Plan */}
            {order.client_plan && (
              <div style={{ background:'#1e293b', borderRadius:10, padding:'12px 16px', border:'1px solid #334155', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ color:'#6b7280', fontSize:13, fontWeight:600 }}>Plan contratado</div>
                <div style={{ color:'#22d3ee', fontSize:14, fontWeight:700 }}>{order.client_plan}</div>
              </div>
            )}

            {/* Novedades */}
            {order.notes && !order.notes.includes('Tecnicos adicionales:') && (
              <div style={{ background:'#451a0320', borderRadius:10, padding:'12px 16px', border:'1px solid #92400e44' }}>
                <div style={{ color:'#fbbf24', fontSize:13, fontWeight:600, marginBottom:4 }}>Novedades</div>
                <div style={{ color:'#fde68a', fontSize:13, lineHeight:1.5 }}>{order.notes}</div>
              </div>
            )}

          </div>

          {/* Footer contacto */}
          <div style={{ background:'#0f172a', borderTop:'1px solid #1f2937', padding:'16px 24px', textAlign:'center' }}>
            <div style={{ color:'#6b7280', fontSize:12, marginBottom:6 }}>Dudas o reprogramacion — contactanos</div>
            <a
              href="https://wa.me/573337288745"
              style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#16a34a', color:'#fff', borderRadius:8, padding:'10px 20px', textDecoration:'none', fontWeight:700, fontSize:14 }}
            >
              WhatsApp Medifibra
            </a>
            <div style={{ color:'#374151', fontSize:11, marginTop:12 }}>Medifibra S.A.S. — NIT 902060057-8 — Blanquizal, Medellin</div>
          </div>

        </div>
      </div>
    </div>
  );
}
