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
  low:    { label: 'Prioridad Baja',   color: '#6b7280' },
  normal: { label: 'Prioridad Normal', color: '#1d4ed8' },
  high:   { label: 'Prioridad Alta',   color: '#ea580c' },
  urgent: { label: 'URGENTE',          color: '#dc2626' },
};

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pendiente',  color: '#ca8a04' },
  in_progress: { label: 'En Proceso', color: '#1d4ed8' },
  completed:   { label: 'Completada', color: '#16a34a' },
  cancelled:   { label: 'Cancelada',  color: '#6b7280' },
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
          format: 'CODE128', width: 1.8, height: 44,
          displayValue: true, fontSize: 11,
          background: 'transparent', lineColor: '#64748b',
        });
      } catch (_e) { /* ignore */ }
    }
  }, [order]);

  const handleDownloadPDF = useCallback(async () => {
    if (!contentRef.current || generating) return;
    setGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(contentRef.current, {
        scale: 2.5, useCORS: true,
        backgroundColor: '#ffffff', logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.97);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();

      pdf.setFillColor(255, 255, 255);
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

  useEffect(() => {
    if (order && !autoDownloaded) {
      setAutoDownloaded(true);
      const t = setTimeout(() => handleDownloadPDF(), 900);
      return () => clearTimeout(t);
    }
  }, [order, autoDownloaded, handleDownloadPDF]);

  if (loading) return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: 'system-ui, sans-serif', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 600 }}>Cargando orden de servicio...</div>
    </div>
  );

  if (!order) return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontFamily: 'system-ui, sans-serif', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 600 }}>Orden no encontrada.</div>
    </div>
  );

  const prio   = PRIORITY_CFG[order.priority]  ?? PRIORITY_CFG.normal;
  const stat   = STATUS_CFG[order.status]       ?? STATUS_CFG.pending;
  const tLabel = TASK_LABELS[order.task_type]   ?? order.task_type;

  return (
    <div style={{ background: '#e2e8f0', minHeight: '100vh', padding: '24px 16px', fontFamily: "'Segoe UI', Arial, sans-serif" }}>

      {/* Action bar */}
      <div style={{ maxWidth: 860, margin: '0 auto 20px', display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button onClick={handleDownloadPDF} disabled={generating} style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', cursor: generating ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: generating ? 0.7 : 1 }}>
          {generating ? 'Generando...' : 'Descargar PDF'}
        </button>
        <button onClick={() => window.print()} style={{ background: '#334155', color: '#f8fafc', border: 'none', borderRadius: 8, padding: '11px 24px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          Imprimir
        </button>
        <button onClick={() => window.close()} style={{ background: '#94a3b8', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', cursor: 'pointer', fontSize: 14 }}>
          Cerrar
        </button>
      </div>

      {/* DOCUMENTO */}
      <div ref={contentRef} style={{ maxWidth: 860, margin: '0 auto', background: '#ffffff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.15)' }}>

        {/* HEADER azul profesional */}
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)', padding: '32px 44px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '4px solid #1d4ed8' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 40, color: '#ffffff', letterSpacing: '-1.5px', lineHeight: 1, marginBottom: 6 }}>
              MEDI<span style={{ color: '#fca5a5' }}>FIBRA</span>
            </div>
            <div style={{ color: '#bfdbfe', fontSize: 13, marginBottom: 3, fontStyle: 'italic' }}>"Conectate con velocidad real"</div>
            <div style={{ color: '#dbeafe', fontSize: 12.5, marginBottom: 2 }}>NIT: 902060057-8</div>
            <div style={{ color: '#dbeafe', fontSize: 12.5, marginBottom: 2 }}>Blanquizal, Comuna 13, Medellin, Colombia</div>
            <div style={{ color: '#dbeafe', fontSize: 12.5 }}>WhatsApp: 333 728 8745</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 10, padding: '14px 22px', marginBottom: 12, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.25)' }}>
              <div style={{ color: '#bfdbfe', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>Orden de Servicio</div>
              <div style={{ color: '#ffffff', fontSize: 22, fontWeight: 900, fontFamily: 'monospace', letterSpacing: 1 }}>{order.order_number}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700 }}>{prio.label}</span>
              <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700 }}>{stat.label}</span>
            </div>
          </div>
        </div>

        {/* BANNER TAREA */}
        <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '18px 44px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ background: '#1d4ed8', borderRadius: 8, padding: '10px 22px', fontWeight: 800, fontSize: 16, color: '#ffffff', display: 'inline-block', letterSpacing: 0.5 }}>
            {tLabel.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, color: '#1e293b' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Fecha programada: </span>
              <span style={{ color: '#1e293b', fontWeight: 700 }}>{fmtDate(order.scheduled_date)}</span>
              {order.scheduled_time && <span style={{ color: '#1d4ed8', fontWeight: 700 }}> — {order.scheduled_time} hrs</span>}
            </div>
          </div>
          <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'right', lineHeight: 1.7 }}>
            Emitida: {fmtDateTime(order.created_at)}<br/>
            Por: <strong style={{ color: '#64748b' }}>{order.created_by}</strong>
          </div>
        </div>

        {/* TECNICO + CLIENTE */}
        <div style={{ padding: '28px 44px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Card Tecnico */}
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 24, border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 18, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
              TECNICO ASIGNADO
            </div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
              <div style={{ width: 110, height: 110, borderRadius: 12, background: '#e2e8f0', border: '3px solid #1d4ed8', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {order.technician_photo ? (
                  <img
                    src={order.technician_photo}
                    alt={order.technician_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div style={{ fontSize: 44, color: '#94a3b8', fontWeight: 700, lineHeight: 1, textAlign: 'center' }}>
                    {order.technician_name ? order.technician_name.charAt(0).toUpperCase() : 'T'}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 6, lineHeight: 1.2 }}>{order.technician_name || 'Sin asignar'}</div>
                <div style={{ background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700, display: 'inline-block', marginBottom: 12 }}>{order.technician_role}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 14, color: '#334155' }}><span style={{ color: '#94a3b8', fontWeight: 600 }}>C.C. </span>{order.technician_cedula || 'No registrada'}</div>
                  <div style={{ fontSize: 14, color: '#334155' }}><span style={{ color: '#94a3b8', fontWeight: 600 }}>Tel. </span>{order.technician_phone || 'No registrado'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Cliente */}
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 24, border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 18, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
              DATOS DEL CLIENTE
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 10, lineHeight: 1.2 }}>{order.client_name}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{ background: order.client_status === 'active' ? '#dcfce7' : '#fee2e2', color: order.client_status === 'active' ? '#16a34a' : '#dc2626', border: `1px solid ${order.client_status === 'active' ? '#86efac' : '#fca5a5'}`, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                {order.client_status === 'active' ? 'Activo' : 'Inactivo'}
              </span>
              <span style={{ background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{order.client_plan}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ fontSize: 14, color: '#334155' }}><span style={{ color: '#94a3b8', fontWeight: 600 }}>C.C. </span>{order.client_cedula || 'No registrada'}</div>
              <div style={{ fontSize: 14, color: '#334155' }}><span style={{ color: '#94a3b8', fontWeight: 600 }}>Tel. </span>{order.client_phone}</div>
              <div style={{ fontSize: 14, color: '#334155' }}><span style={{ color: '#94a3b8', fontWeight: 600 }}>Dir. </span>{order.client_address}{order.client_neighborhood ? `, ${order.client_neighborhood}` : ''}{order.client_commune ? ` — ${order.client_commune}` : ''}</div>
              {order.client_punto_referencia && (
                <div style={{ fontSize: 14, color: '#92400e', background: '#fef3c7', padding: '6px 10px', borderRadius: 6, marginTop: 2 }}>
                  <span style={{ fontWeight: 700 }}>Referencia: </span>{order.client_punto_referencia}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DESCRIPCION */}
        {order.task_description && (
          <div style={{ padding: '20px 44px 0' }}>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 24, border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
                DESCRIPCION DEL TRABAJO
              </div>
              <div style={{ color: '#1e293b', fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{order.task_description}</div>
            </div>
          </div>
        )}

        {/* NOVEDADES */}
        {order.notes && (
          <div style={{ padding: '20px 44px 0' }}>
            <div style={{ background: '#fffbeb', borderRadius: 10, padding: 24, border: '1px solid #fcd34d' }}>
              <div style={{ color: '#92400e', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, borderBottom: '1px solid #fde68a', paddingBottom: 10 }}>
                NOVEDADES / OBSERVACIONES
              </div>
              <div style={{ color: '#78350f', fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{order.notes}</div>
            </div>
          </div>
        )}

        {/* FIRMAS */}
        <div style={{ padding: '20px 44px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {[
            { label: 'Firma del Tecnico', name: order.technician_name },
            { label: 'Firma del Cliente',  name: order.client_name },
          ].map(({ label, name }) => (
            <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '24px 20px 18px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ height: 70, borderBottom: '1.5px solid #cbd5e1', marginBottom: 12 }}></div>
              <div style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>{label}</div>
              <div style={{ color: '#1e293b', fontSize: 14, fontWeight: 700, marginTop: 4 }}>{name}</div>
            </div>
          ))}
        </div>

        {/* FOOTER + BARCODE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 44px 30px', marginTop: 20, borderTop: '1px solid #e2e8f0' }}>
          <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 2 }}>
            <div style={{ fontWeight: 700, color: '#64748b', marginBottom: 2, fontSize: 13 }}>Medifibra S.A.S</div>
            <div>NIT: 902060057-8 — Blanquizal, Comuna 13, Medellin</div>
            <div>WhatsApp: 333 728 8745</div>
            <div style={{ marginTop: 6, color: '#cbd5e1', fontSize: 11 }}>
              Este documento es una orden de servicio interna. No tiene validez como factura de venta.
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <svg ref={barcodeRef} style={{ maxWidth: 180 }}></svg>
          </div>
        </div>

      </div>
    </div>
  );
}
