'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/plans'
import { Download, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

type Client = {
  id: number; name: string; email: string; phone: string; cellphone: string
  address: string; city: string; neighborhood: string; commune: string
  consumption_date: string; payment_date: string; plan: string; plan_value: number
  reference: string; status: string; notes: string; created_at: string
}

export default function FacturaPage() {
  const { id } = useParams()
  const [client, setClient]       = useState<Client | null>(null)
  const [loading, setLoading]     = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [autoTriggered, setAutoTriggered] = useState(false)
  const invoiceRef = useRef<HTMLDivElement>(null)

  const now        = new Date()
  const period     = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const invoiceNum = `MF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(id).padStart(4, '0')}`
  const dateStr    = now.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then(r => r.json())
      .then(d => { setClient(d.client); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const handleDownload = useCallback(async () => {
    if (!invoiceRef.current || downloading || !client) return
    setDownloading(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF }       = await import('jspdf')

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000,
      })

      const imgData  = canvas.toDataURL('image/png')
      const pdf      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW     = pdf.internal.pageSize.getWidth()
      const pdfH     = pdf.internal.pageSize.getHeight()
      const imgH     = pdfW * (canvas.height / canvas.width)

      let heightLeft = imgH
      let position   = 0
      pdf.addImage(imgData, 'PNG', 0, position, pdfW, imgH)
      heightLeft -= pdfH

      while (heightLeft > 0) {
        position -= pdfH
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pdfW, imgH)
        heightLeft -= pdfH
      }

      const safeName = client.name
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim().replace(/\s+/g, '_').toUpperCase()

      pdf.save(`Factura_${invoiceNum}_${safeName}.pdf`)
    } catch (err) {
      console.error('[Factura] Error al generar PDF:', err)
      alert('Error al generar el PDF. Recarga la pagina e intenta de nuevo.')
    } finally {
      setDownloading(false)
    }
  }, [client, downloading, invoiceNum])

  useEffect(() => {
    if (!client || loading || autoTriggered) return
    setAutoTriggered(true)
    const timer = setTimeout(() => { handleDownload() }, 1500)
    return () => clearTimeout(timer)
  }, [client, loading, autoTriggered, handleDownload])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
      <p style={{ fontSize: 18, color: '#6b7280', fontFamily: 'Arial' }}>Cargando factura...</p>
    </div>
  )
  if (!client) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
      <p style={{ color: '#ef4444', fontFamily: 'Arial', fontSize: 18 }}>Cliente no encontrado</p>
    </div>
  )

  const dueDate = client.payment_date
    ? (() => {
        const raw = client.payment_date.trim()
        if (/^\d{1,2}$/.test(raw)) {
          const d = new Date(now.getFullYear(), now.getMonth(), parseInt(raw))
          return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
        }
        const parsed = new Date(raw + 'T12:00:00')
        return isNaN(parsed.getTime()) ? raw : parsed.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
      })()
    : 'Segun acuerdo'

  const speedMatch = client.plan.match(/\d+/)
  const speedMbps  = speedMatch ? `${speedMatch[0]} Mbps` : '—'

  return (
    <>
      <div style={{ backgroundColor: '#0b0f19', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', textDecoration: 'none', fontSize: 14, fontFamily: 'Arial' }}>
          <ArrowLeft size={16} /> Volver al Dashboard
        </Link>
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: downloading ? '#374151' : '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: downloading ? 'not-allowed' : 'pointer', fontFamily: 'Arial' }}
        >
          {downloading
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generando PDF...</>
            : <><Download size={16} /> Descargar PDF</>}
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } * { box-sizing: border-box; } body { margin: 0; padding: 0; }`}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#e5e7eb', padding: '32px 16px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <div ref={invoiceRef} style={{ maxWidth: 900, margin: '0 auto', backgroundColor: '#ffffff', boxShadow: '0 10px 40px rgba(0,0,0,0.18)', borderRadius: 4, overflow: 'hidden' }}>

          <div style={{ background: 'linear-gradient(135deg, #0d1b3e 0%, #1a237e 55%, #0d47a1 100%)', padding: '40px 52px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                <img src="/logo.png" alt="Medifibra" crossOrigin="anonymous" style={{ width: 110, height: 80, objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }} />
                <div>
                  <div style={{ color: 'white', fontSize: 36, fontWeight: 900, letterSpacing: 4, lineHeight: 1, fontFamily: 'Arial Black, Arial' }}>MEDIFIBRA</div>
                  <div style={{ color: '#90caf9', fontSize: 14, marginTop: 6 }}>S.A.S — NIT: 902060057-8</div>
                  <div style={{ color: '#90caf9', fontSize: 13, marginTop: 4 }}>Proveedor de Internet Fibra Optica</div>
                  <div style={{ color: '#90caf9', fontSize: 13, marginTop: 4 }}>Medellin, Antioquia, Colombia</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#bbdefb', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>Factura de Servicio</div>
                <div style={{ color: 'white', fontSize: 30, fontWeight: 900, letterSpacing: 1, fontFamily: 'Arial Black, Arial' }}>{invoiceNum}</div>
                <div style={{ color: '#90caf9', fontSize: 14, marginTop: 10 }}>Fecha: {dateStr}</div>
                <div style={{ color: '#90caf9', fontSize: 14, marginTop: 4 }}>Periodo: {period}</div>
                <div style={{ marginTop: 14, display: 'inline-block', backgroundColor: client.status === 'active' ? '#2e7d32' : '#b71c1c', color: 'white', borderRadius: 6, padding: '6px 18px', fontSize: 13, fontWeight: 700, letterSpacing: 1.5 }}>
                  {client.status === 'active' ? 'SERVICIO ACTIVO' : 'SERVICIO SUSPENDIDO'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '2px solid #e8eaf6' }}>
            <div style={{ padding: '32px 52px', borderRight: '1px solid #e8eaf6' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 18 }}>Informacion del Cliente</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0d1b3e', marginBottom: 16, lineHeight: 1.2, textTransform: 'capitalize' }}>{client.name}</div>
              {client.address && (
                <div style={{ fontSize: 14, color: '#555', marginBottom: 10, display: 'flex', gap: 10 }}>
                  <span style={{ color: '#1565c0', fontWeight: 700, flexShrink: 0, minWidth: 36 }}>Dir:</span>
                  <span>{client.address}{client.neighborhood ? `, Barrio ${client.neighborhood}` : ''}</span>
                </div>
              )}
              {client.city && (
                <div style={{ fontSize: 14, color: '#555', marginBottom: 10, display: 'flex', gap: 10 }}>
                  <span style={{ color: '#1565c0', fontWeight: 700, flexShrink: 0, minWidth: 36 }}>Ciudad:</span>
                  <span>{client.city}{client.commune ? ` — Comuna ${client.commune}` : ''}</span>
                </div>
              )}
              <div style={{ fontSize: 14, color: '#555', marginBottom: 10, display: 'flex', gap: 10 }}>
                <span style={{ color: '#1565c0', fontWeight: 700, flexShrink: 0, minWidth: 36 }}>Cel:</span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{client.cellphone}</span>
              </div>
              {client.phone && (
                <div style={{ fontSize: 14, color: '#555', marginBottom: 10, display: 'flex', gap: 10 }}>
                  <span style={{ color: '#1565c0', fontWeight: 700, flexShrink: 0, minWidth: 36 }}>Tel:</span>
                  <span>{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div style={{ fontSize: 14, color: '#555', display: 'flex', gap: 10 }}>
                  <span style={{ color: '#1565c0', fontWeight: 700, flexShrink: 0, minWidth: 36 }}>Email:</span>
                  <span>{client.email}</span>
                </div>
              )}
            </div>
            <div style={{ padding: '32px 52px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 18 }}>Detalles de Cobro</div>
              {[
                { label: 'N de Factura',         value: invoiceNum, color: '#1565c0', bold: false },
                { label: 'Periodo facturado',    value: period,     color: '#333',    bold: false },
                { label: 'Fecha de emision',     value: dateStr,    color: '#333',    bold: true  },
                { label: 'Fecha limite de pago', value: dueDate,    color: '#c62828', bold: true  },
                ...(client.reference ? [{ label: 'Referencia / Llave', value: client.reference, color: '#1b5e20', bold: false }] : []),
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ fontSize: 14, color: '#777' }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: row.bold ? 800 : 700, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '36px 52px 28px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 20 }}>Detalle de Servicios</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
              <thead>
                <tr style={{ backgroundColor: '#0d1b3e' }}>
                  <th style={{ padding: '16px 20px', textAlign: 'left',   color: 'white', fontWeight: 600, fontSize: 13 }}>Descripcion del Servicio</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', color: 'white', fontWeight: 600, fontSize: 13 }}>Velocidad</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', color: 'white', fontWeight: 600, fontSize: 13 }}>Periodo</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right',  color: 'white', fontWeight: 600, fontSize: 13 }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ backgroundColor: '#f8f9ff', borderBottom: '1px solid #e8eaf6' }}>
                  <td style={{ padding: '22px 20px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 800, color: '#0d1b3e', fontSize: 16, marginBottom: 6 }}>Internet Fibra Optica — {client.plan}</div>
                    <div style={{ fontSize: 13, color: '#666' }}>Servicio residencial de alta velocidad — Conectate con velocidad real</div>
                  </td>
                  <td style={{ padding: '22px 20px', textAlign: 'center', color: '#333', fontWeight: 700, fontSize: 15 }}>{speedMbps}</td>
                  <td style={{ padding: '22px 20px', textAlign: 'center', color: '#555', fontSize: 14 }}>{period}</td>
                  <td style={{ padding: '22px 20px', textAlign: 'right', fontSize: 20, fontWeight: 900, color: '#0d1b3e' }}>{formatCurrency(client.plan_value)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} />
                  <td style={{ padding: '18px 20px 8px', textAlign: 'right', fontSize: 14, color: '#777', fontWeight: 600 }}>Subtotal</td>
                  <td style={{ padding: '18px 20px 8px', textAlign: 'right', fontSize: 16, fontWeight: 700, color: '#333' }}>{formatCurrency(client.plan_value)}</td>
                </tr>
                <tr style={{ borderTop: '3px solid #0d1b3e', backgroundColor: '#eef2ff' }}>
                  <td colSpan={2} />
                  <td style={{ padding: '18px 20px', textAlign: 'right', fontSize: 16, fontWeight: 800, color: '#0d1b3e' }}>TOTAL A PAGAR</td>
                  <td style={{ padding: '18px 20px', textAlign: 'right', fontSize: 28, fontWeight: 900, color: '#0d1b3e' }}>{formatCurrency(client.plan_value)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ margin: '0 52px 36px', padding: 28, backgroundColor: '#f0f4ff', borderRadius: 12, border: '1px solid #c5cae9' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 22 }}>Canales de Pago Disponibles</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

              <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <img src="/bancolombia.png" alt="Bancolombia" crossOrigin="anonymous" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 8 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#333' }}>Bancolombia</div>
                    <div style={{ fontSize: 12, color: '#888' }}>Transferencia / PSE</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Tipo de cuenta</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 12 }}>Cuenta de Ahorros</div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Numero de cuenta</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0d1b3e', letterSpacing: 1, marginBottom: 12 }}>009-952025-14</div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>A nombre de</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>Medifibra S.A.S</div>
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <img src="/nequi.png" alt="Nequi" crossOrigin="anonymous" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 8 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#333' }}>Nequi</div>
                    <div style={{ fontSize: 12, color: '#888' }}>Pago inmediato</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Numero Nequi</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#2D0A4E', letterSpacing: 1, marginBottom: 12 }}>301 508 0961</div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>A nombre de</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10 }}>Medifibra S.A.S</div>
                <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>Envie comprobante al WhatsApp</div>
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <img src="/bre-b.png" alt="Bre-B" crossOrigin="anonymous" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 8 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#333' }}>Bre-B</div>
                    <div style={{ fontSize: 12, color: '#888' }}>Transferencia inmediata</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Llave / Referencia de pago</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1b5e20', letterSpacing: 1, marginBottom: 12, wordBreak: 'break-all' }}>
                  {client.reference || '— Sin referencia asignada —'}
                </div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>A nombre de</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10 }}>Medifibra S.A.S</div>
                <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>Pago disponible 24/7</div>
              </div>

            </div>
          </div>

          <div style={{ backgroundColor: '#0d1b3e', padding: '24px 52px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: '#90caf9', fontSize: 12, letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase' }}>Contacto y Soporte</div>
              <div style={{ color: 'white', fontSize: 17, fontWeight: 700 }}>WhatsApp: 333 728 8745</div>
              <div style={{ color: '#90caf9', fontSize: 12, marginTop: 5 }}>Medellin, Antioquia, Colombia</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'white', fontSize: 26, fontWeight: 900, letterSpacing: 4, fontFamily: 'Arial Black, Arial' }}>MEDIFIBRA</div>
              <div style={{ color: '#90caf9', fontSize: 13, marginTop: 5 }}>Conectate con velocidad real</div>
              <div style={{ color: '#546e7a', fontSize: 11, marginTop: 6 }}>Generado: {now.toLocaleString('es-CO')}</div>
            </div>
          </div>

          <div style={{ padding: '14px 52px', backgroundColor: '#fff9c4', borderTop: '3px solid #f9a825', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.8, margin: 0 }}>
              Al realizar el pago, envie el comprobante al WhatsApp <strong style={{ color: '#333' }}>333 728 8745</strong> indicando nombre completo y numero de factura <strong style={{ color: '#1565c0' }}>{invoiceNum}</strong>. Gracias por su pago puntual — <strong>Medifibra S.A.S</strong>
            </p>
          </div>

        </div>
      </div>
    </>
  )
}
