'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import JsBarcode from 'jsbarcode';

interface WorkOrderDetail {
  id: number;
  order_number: string;
  task_type: string;
  task_description: string;
  priority: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  notes: string;
  created_by: string;
  created_at: string;
  technician_name: string;
  technician_cedula: string;
  technician_phone: string;
  technician_role: string;
  technician_photo: string;
  client_name: string;
  client_cedula: string;
  client_address: string;
  client_phone: string;
  client_plan: string;
  client_status: string;
  client_neighborhood: string;
  client_commune: string;
  client_punto_referencia: string;
}

const TASK_LABELS: Record<string, string> = {
  INSTALACION_SERVICIO:   'Instalacion de Servicio',
  ESTUDIO_ZONA:           'Estudio de Zona',
  RETIRO_EQUIPOS:         'Retiro de Equipos',
  ACTUALIZACION:          'Actualizacion',
  REPARACION:             'Reparacion',
  SOPORTE:                'Soporte Tecnico',
  INSTALACION_ELECTRICA:  'Instalacion Electrica',
  OTRA:                   'Otra Area',
};

const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
  low:    { label: 'Prioridad Baja',    color: '#6b7280' },
  normal: { label: 'Prioridad Normal',  color: '#3b82f6' },
  high:   { label: 'Prioridad Alta',    color: '#f97316' },
  urgent: { label: 'URGENTE',           color: '#ef4444' },
};

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pendiente',   color: '#eab308' },
  in_progress: { label: 'En Proceso',  color: '#3b82f6' },
  completed:   { label: 'Completada',  color: '#22c55e' },
  cancelled:   { label: 'Cancelada',   color: '#6b7280' },
};

const TASK_ICON: Record<string, string> = {
  INSTALACION_SERVICIO:  '📡',
  ESTUDIO_ZONA:          '🗺',
  RETIRO_EQUIPOS:        '📦',
  ACTUALIZACION:         '⬆',
  REPARACION:            '🔧',
  SOPORTE:               '🛠',
  INSTALACION_ELECTRICA: '⚡',
  OTRA:                  '📋',
};

function fmtDate(d: string): string {
  if (!d) return 'Por definir';
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch { return d; }
}

function fmtDateTime(d: string): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleString('es-CO', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return d; }
}

export default function OrdenPage() {
  const params = useParams();
  const [order, setOrder] = useState<WorkOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetch(`/api/work-orders/${params.id}`)
      .then(r => r.json())
      .then(d => { setOrder(d.workOrder ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (order?.order_number && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, order.order_number, {
          format: 'CODE128', width: 1.5, height: 36,
          displayValue: true, fontSize: 9,
          background: 'transparent', lineColor: '#94a3b8',
        });
      } catch (_e) { /* ignore barcode errors */ }
    }
  }, [order]);

  const handleDownloadPDF = useCallback(async () => {
    if (!contentRef.current || generating) return;
    setGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(contentRef.current, {
        scale: 2, useCORS: true,
        backgroundColor: '#060d1f', logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();

      pdf.setFillColor(6, 13, 31);
      pdf.rect(0, 0, pw, ph, 'F');

      const imgW = pw - 16;
      const imgH = (canvas.height * imgW) / canvas.width;
      const y = Math.max(8, (ph - Math.min(imgH, ph - 16)) / 2);
      pdf.addImage(imgData, 'JPEG', 8, y, imgW, Math.min(imgH, ph - 16));

      const clientSlug = (order?.client_name || 'cliente').replace(/\s+/g, '_').slice(0, 30);
      pdf.save(`${order?.order_number ?? 'OS'}-${clientSlug}.pdf`);
    } catch (e) {
      console.error('PDF error:', e);
      alert('Error al generar el PDF. Intenta nuevamente.');
    } finally {
      setGenerating(false);
    }
  }, [generating, order]);

  // Auto-descarga única
  useEffect(() => {
    if (order && !autoDownloaded) {
      setAutoDownloaded(true);
      const t = setTimeout(() => handleDownloadPDF(), 900);
      return () => clearTimeout(t);
    }
  }, [order, autoDownloaded, handleDownloadPDF]);

  if (loading) return (
    <div style={{ background: '#060d1f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontFamily: 'system-ui, sans-serif', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 32 }}>⚙️</div>
      <div>Cargando orden de servicio...</div>
    </div>
  );

  if (!order) return (
    <div style={{ background: '#060d1f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontFamily: 'system-ui, sans-serif', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 32 }}>❌</div>
      <div>Orden no encontrada.</div>
    </div>
  );

  const prio   = PRIORITY_CFG[order.priority]    ?? PRIORITY_CFG.normal;
  const stat   = STATUS_CFG[order.status]         ?? STATUS_CFG.pending;
  const tLabel = TASK_LABELS[order.task_type]     ?? order.task_type;
  const tIcon  = TASK_ICON[order.task_type]       ?? '📋';

  return (
    <div style={{ background: '#060d1f', minHeight: '100vh', padding: '20px 12px', fontFamily: "'Segoe UI', Arial, sans-serif" }}>

      {/* Action bar */}
      <div style={{ maxWidth: 794, margin: '0 auto 16px', display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button onClick={handleDownloadPDF} disabled={generating} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', cursor: generating ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, opacity: generating ? 0.7 : 1 }}>
          {generating ? '⏳ Generando...' : '⬇ Descargar PDF'}
        </button>
        <button onClick={() => window.print()} style={{ background: '#1e2a3a', color: '#e2e8f0', border: '1px solid #2a3a4a', borderRadius: 8, padding: '10px 22px', cursor: 'pointer', fontSize: 13 }}>
          🖨 Imprimir
        </button>
        <button onClick={() => window.close()} style={{ background: '#1e2a3a', color: '#94a3b8', border: '1px solid #1e2a3a', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13 }}>
          ✕ Cerrar
        </button>
      </div>

      {/* ───── DOCUMENTO PDF ───── */}
      <div ref={contentRef} style={{ maxWidth: 794, margin: '0 auto', background: 'linear-gradient(160deg, #0b1120 0%, #0d1530 60%, #0a1040 100%)', borderRadius: 14, overflow: 'hidden' }}>

        {/* HEADER */}
        <div style={{ background: 'linear-gradient(135deg, #0f1f5c 0%, #1a3a8f 50%, #0d47a1 100%)', padding: '26px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #2563eb' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 30, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>
              MEDI<span style={{ color: '#ef4444' }}>FIBRA</span>
            </div>
            <div style={{ color: '#93c5fd', fontSize: 10, marginTop: 4, letterSpacing: 0.5 }}>"Conectate con velocidad real"</div>
            <div style={{ color: '#7dd3fc', fontSize: 9.5, marginTop: 2 }}>NIT: 902060057-8 · Blanquizal, Comuna 13, Medellin, Colombia</div>
            <div style={{ color: '#7dd3fc', fontSize: 9.5 }}>WhatsApp: 333 728 8745</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 16px', marginBottom: 8, backdropFilter: 'blur(4px)' }}>
              <div style={{ color: '#bfdbfe', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>Orden de Servicio</div>
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 900, fontFamily: 'monospace', marginTop: 2 }}>{order.order_number}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <span style={{ background: prio.color + '25', color: prio.color, border: `1px solid ${prio.color}55`, borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>{prio.label}</span>
              <span style={{ background: stat.color + '25', color: stat.color, border: `1px solid ${stat.color}55`, borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>{stat.label}</span>
            </div>
          </div>
        </div>

        {/* TAREA BANNER */}
        <div style={{ background: 'linear-gradient(90deg, #111827 0%, #1a2540 100%)', padding: '14px 36px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderBottom: '1px solid #1e3a5f' }}>
          <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', borderRadius: 8, padding: '10px 18px', fontWeight: 800, fontSize: 14, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 18 }}>{tIcon}</span> {tLabel.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Fecha programada: </span>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{fmtDate(order.scheduled_date)}</span>
              {order.scheduled_time && <span style={{ color: '#60a5fa' }}> · {order.scheduled_time} hrs</span>}
            </div>
          </div>
          <div style={{ color: '#475569', fontSize: 10, textAlign: 'right' }}>
            Emitida: {fmtDateTime(order.created_at)}<br/>
            Por: {order.created_by}
          </div>
        </div>

        {/* TÉCNICO + CLIENTE */}
        <div style={{ padding: '22px 36px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Card Técnico */}
          <div style={{ background: '#0d1623', borderRadius: 10, padding: 18, border: '1px solid #1e3a5f' }}>
            <div style={{ color: '#475569', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>
              👷 Tecnico Asignado
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 60, height: 60, borderRadius: 10, background: '#1a2a3a', border: '2px solid #2563eb', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                {order.technician_photo
                  ? <img src={order.technician_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                  : '👷'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', marginBottom: 4, lineHeight: 1.2 }}>{order.technician_name || 'Sin asignar'}</div>
                <div style={{ background: '#2563eb18', color: '#60a5fa', border: '1px solid #2563eb33', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 600, display: 'inline-block', marginBottom: 8 }}>{order.technician_role}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}><span style={{ color: '#475569' }}>C.C.</span> {order.technician_cedula || 'No registrada'}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}><span style={{ color: '#475569' }}>Tel.</span> {order.technician_phone || 'No registrado'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Cliente */}
          <div style={{ background: '#0d1623', borderRadius: 10, padding: 18, border: '1px solid #1e3a5f' }}>
            <div style={{ color: '#475569', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>
              👤 Datos del Cliente
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', marginBottom: 6, lineHeight: 1.2 }}>{order.client_name}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ background: order.client_status === 'active' ? '#052e1633' : '#2d0a0a33', color: order.client_status === 'active' ? '#4ade80' : '#f87171', border: `1px solid ${order.client_status === 'active' ? '#16653444' : '#991b1b44'}`, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                {order.client_status === 'active' ? '● Activo' : '● Inactivo'}
              </span>
              <span style={{ background: '#1e3a5f33', color: '#93c5fd', border: '1px solid #1e3a5f44', borderRadius: 4, padding: '2px 8px', fontSize: 10 }}>{order.client_plan}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 11, color: '#94a3b8' }}><span style={{ color: '#475569' }}>C.C.</span> {order.client_cedula || 'N/R'}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}><span style={{ color: '#475569' }}>Tel.</span> {order.client_phone}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}><span style={{ color: '#475569' }}>Dir.</span> {order.client_address}{order.client_neighborhood ? `, ${order.client_neighborhood}` : ''}{order.client_commune ? ` · ${order.client_commune}` : ''}</div>
              {order.client_punto_referencia && (
                <div style={{ fontSize: 11, color: '#fbbf24' }}><span style={{ color: '#475569' }}>Ref.</span> {order.client_punto_referencia}</div>
              )}
            </div>
          </div>
        </div>

        {/* DESCRIPCIÓN */}
        {order.task_description && (
          <div style={{ padding: '16px 36px 0' }}>
            <div style={{ background: '#0d1623', borderRadius: 10, padding: 18, border: '1px solid #1e3a5f' }}>
              <div style={{ color: '#475569', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>📋 Descripcion del Trabajo</div>
              <div style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{order.task_description}</div>
            </div>
          </div>
        )}

        {/* NOVEDADES */}
        {order.notes && (
          <div style={{ padding: '16px 36px 0' }}>
            <div style={{ background: '#1a0f00', borderRadius: 10, padding: 18, border: '1px solid #92400e44' }}>
              <div style={{ color: '#f59e0b', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>⚠ Novedades / Observaciones</div>
              <div style={{ color: '#fcd34d', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{order.notes}</div>
            </div>
          </div>
        )}

        {/* FIRMAS */}
        <div style={{ padding: '16px 36px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'Firma del Tecnico', name: order.technician_name },
            { label: 'Firma del Cliente', name: order.client_name },
          ].map(({ label, name }) => (
            <div key={label} style={{ background: '#0d1623', borderRadius: 10, padding: '18px 18px 14px', border: '1px solid #1e3a5f', textAlign: 'center' }}>
              <div style={{ height: 56, borderBottom: '1px dashed #2a3a4a', marginBottom: 10 }}></div>
              <div style={{ color: '#475569', fontSize: 10 }}>{label}</div>
              <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginTop: 2 }}>{name}</div>
            </div>
          ))}
        </div>

        {/* FOOTER + BARCODE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 36px 22px', marginTop: 16, borderTop: '1px solid #1e2a3a' }}>
          <div style={{ color: '#334155', fontSize: 9, lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700, color: '#475569', marginBottom: 2 }}>Medifibra S.A.S</div>
            <div>NIT: 902060057-8 · Blanquizal, Comuna 13, Medellin</div>
            <div>WhatsApp: 333 728 8745</div>
            <div style={{ marginTop: 4, color: '#1e3a5f' }}>
              Este documento es una orden de servicio interna.<br/>
              No tiene validez como factura de venta.
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <svg ref={barcodeRef} style={{ maxWidth: 160 }}></svg>
          </div>
        </div>

      </div>
    </div>
  );
}
