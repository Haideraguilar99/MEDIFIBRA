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

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return result
}

const CUENTA = '0093014896'

export default function FacturaPage() {
  const { id } = useParams()
  const [client, setClient]               = useState<Client | null>(null)
  const [loading, setLoading]             = useState(true)
  const [downloading, setDownloading]     = useState(false)
  const [autoTriggered, setAutoTriggered] = useState(false)
  const [mobileScale, setMobileScale]     = useState(1)
  const [isCapturing, setIsCapturing]     = useState(false)
  const invoiceRef = useRef<HTMLDivElement>(null)
  const barcodeRef = useRef<SVGSVGElement>(null)

  const now        = new Date()
  const period     = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const invoiceNum = `MF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(id).padStart(4, '0')}`
  const dateStr    = now.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
  const dueDateObj = addBusinessDays(now, 3)
  const dueDate    = dueDateObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })

  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth
      setMobileScale(vw < 826 ? (vw - 16) / 794 : 1)
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then(r => r.json())
      .then(d => { setClient(d.client); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!client || !barcodeRef.current) return
    import('jsbarcode').then(({ default: JsBarcode }) => {
      JsBarcode(barcodeRef.current!, invoiceNum, {
        format: 'CODE128', width: 1.8, height: 44,
        displayValue: false, background: 'transparent',
        lineColor: '#ffffff', margin: 0,
      })
    }).catch(err => console.error('[Barcode]', err))
  }, [client, invoiceNum])

  const handleDownload = useCallback(async () => {
    if (!invoiceRef.current || downloading || !client) return
    setDownloading(true)
    setIsCapturing(true)
    await new Promise(r => setTimeout(r, 150))
    try {
      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF }       = await import('jspdf')
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2, useCORS: true, allowTaint: true,
        backgroundColor: '#ffffff', logging: false,
        imageTimeout: 15000, windowWidth: 794,
      })
      const imgData     = canvas.toDataURL('image/jpeg', 0.95)
      const pdf         = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW        = pdf.internal.pageSize.getWidth()
      const pdfH        = pdf.internal.pageSize.getHeight()
      // Fondo blanco — sin bordes laterales
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, 0, pdfW, pdfH, 'F')
      const canvasAspect = canvas.height / canvas.width
      const imgW  = pdfW
      const imgH  = pdfW * canvasAspect
      const posY  = imgH < pdfH ? (pdfH - imgH) / 2 : 0
      pdf.addImage(imgData, 'JPEG', 0, posY, imgW, imgH)
      const safeName = client.name
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, '').trim()
        .replace(/\s+/g, '_').toUpperCase()
      pdf.save(`Factura_${invoiceNum}_${safeName}.pdf`)
    } catch (err) {
      console.error('[Factura] Error PDF:', err)
      alert('Error al generar el PDF. Recarga e intenta de nuevo.')
    } finally {
      setIsCapturing(false)
      setDownloading(false)
    }
  }, [client, downloading, invoiceNum])

  useEffect(() => {
    if (!client || loading || autoTriggered) return
    setAutoTriggered(true)
    const t = setTimeout(() => handleDownload(), 2000)
    return () => clearTimeout(t)
  }, [client, loading, autoTriggered, handleDownload])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
      <p style={{ fontSize: 20, color: '#6b7280', fontFamily: 'Arial' }}>Cargando factura...</p>
    </div>
  )
  if (!client) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
      <p style={{ color: '#ef4444', fontFamily: 'Arial', fontSize: 20 }}>Cliente no encontrado</p>
    </div>
  )

  const speedMatch = client.plan.match(/\d+/)
  const speedMbps  = speedMatch ? `${speedMatch[0]} Mbps` : '—'
  const viewZoom   = isCapturing ? 1 : mobileScale

  return (
    <>
      <div style={{ backgroundColor: '#0b0f19', padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', textDecoration: 'none', fontSize: 14, fontFamily: 'Arial' }}>
          <ArrowLeft size={16} /> Volver al Dashboard
        </Link>
        <button onClick={handleDownload} disabled={downloading} style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: downloading ? '#374151' : '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 14, fontWeight: 700, cursor: downloading ? 'not-allowed' : 'pointer', fontFamily: 'Arial' }}>
          {downloading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generando...</> : <><Download size={16} /> Descargar PDF</>}
        </button>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing:border-box; } body { margin:0; padding:0; }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#e8eef4', padding: '20px 0', overflow: 'hidden' }}>
        <div style={{ width: 794, margin: '0 auto', transformOrigin: 'top center', transform: `scale(${viewZoom})`, marginBottom: viewZoom < 1 ? `${-794 * (1 - viewZoom) * 1.4}px` : 0 }}>

          <div ref={invoiceRef} style={{ width: 794, backgroundColor: '#ffffff', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>

            {/* === CABECERA === */}
            <div style={{ background: 'linear-gradient(135deg,#0d1b3e 0%,#1a237e 55%,#0d47a1 100%)', padding: '24px 36px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <img src="/logofact.jpeg" alt="Medifibra" crossOrigin="anonymous"
                    style={{ width: 100, height: 100, objectFit: 'contain', borderRadius: 10, background: 'white', padding: 4 }} />
                  <div>
                    <div style={{ color: 'white', fontSize: 32, fontWeight: 900, letterSpacing: 3, lineHeight: 1, fontFamily: 'Arial Black, Arial' }}>MEDIFIBRA</div>
                    <div style={{ color: '#90caf9', fontSize: 14, marginTop: 5 }}>S.A.S — NIT: 902060057-8</div>
                    <div style={{ color: '#90caf9', fontSize: 14, marginTop: 3 }}>Proveedor de Internet Fibra Optica</div>
                    <div style={{ color: '#90caf9', fontSize: 14, marginTop: 3 }}>Medellin, Antioquia, Colombia</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#bbdefb', fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4 }}>Factura de Servicio</div>
                  <div style={{ color: 'white', fontSize: 26, fontWeight: 900, letterSpacing: 1, fontFamily: 'Arial Black, Arial' }}>{invoiceNum}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '6px 0' }}>
                    <svg ref={barcodeRef} style={{ display: 'block' }} />
                  </div>
                  <div style={{ color: '#90caf9', fontSize: 14, marginTop: 4 }}>Fecha: {dateStr}</div>
                  <div style={{ color: '#90caf9', fontSize: 14, marginTop: 3 }}>Periodo: {period}</div>
                  <div style={{ marginTop: 10, display: 'inline-block', backgroundColor: client.status === 'active' ? '#2e7d32' : '#b71c1c', color: 'white', borderRadius: 5, padding: '5px 16px', fontSize: 12, fontWeight: 700, letterSpacing: 1.5 }}>
                    {client.status === 'active' ? 'SERVICIO ACTIVO' : 'SERVICIO SUSPENDIDO'}
                  </div>
                </div>
              </div>
            </div>

            {/* === CLIENTE + COBRO === */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '2px solid #e8eaf6' }}>
              <div style={{ padding: '22px 36px', borderRight: '1px solid #e8eaf6' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 12 }}>Informacion del Cliente</div>
                <div style={{ fontSize: 23, fontWeight: 800, color: '#0d1b3e', marginBottom: 12, lineHeight: 1.2, textTransform: 'capitalize' }}>{client.name}</div>
                {client.address && (
                  <div style={{ fontSize: 15, color: '#444', marginBottom: 8, display: 'flex', gap: 8 }}>
                    <span style={{ color: '#1565c0', fontWeight: 700, minWidth: 44 }}>Dir:</span>
                    <span>{client.address}{client.neighborhood ? `, Barrio ${client.neighborhood}` : ''}</span>
                  </div>
                )}
                {client.city && (
                  <div style={{ fontSize: 15, color: '#444', marginBottom: 8, display: 'flex', gap: 8 }}>
                    <span style={{ color: '#1565c0', fontWeight: 700, minWidth: 44 }}>Ciudad:</span>
                    <span>{client.city}{client.commune ? ` — Comuna ${client.commune}` : ''}</span>
                  </div>
                )}
                <div style={{ fontSize: 15, color: '#444', marginBottom: 8, display: 'flex', gap: 8 }}>
                  <span style={{ color: '#1565c0', fontWeight: 700, minWidth: 44 }}>Cel:</span>
                  <span style={{ fontWeight: 800, fontSize: 17 }}>{client.cellphone}</span>
                </div>
                {client.phone && (
                  <div style={{ fontSize: 15, color: '#444', marginBottom: 8, display: 'flex', gap: 8 }}>
                    <span style={{ color: '#1565c0', fontWeight: 700, minWidth: 44 }}>Tel:</span>
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div style={{ fontSize: 15, color: '#444', display: 'flex', gap: 8 }}>
                    <span style={{ color: '#1565c0', fontWeight: 700, minWidth: 44 }}>Email:</span>
                    <span>{client.email}</span>
                  </div>
                )}
              </div>
              <div style={{ padding: '22px 36px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 12 }}>Detalles de Cobro</div>
                {[
                  { label: 'N de Factura',           value: invoiceNum,  color: '#1565c0', bold: false },
                  { label: 'Periodo facturado',       value: period,      color: '#222',    bold: true  },
                  { label: 'Fecha de emision',        value: dateStr,     color: '#222',    bold: true  },
                  { label: 'Vence (3 dias habiles)',  value: dueDate,     color: '#c62828', bold: true  },
                  { label: 'Llave / Referencia pago', value: CUENTA,      color: '#1b5e20', bold: true  },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ fontSize: 14, color: '#666' }}>{row.label}</span>
                    <span style={{ fontSize: 14, fontWeight: row.bold ? 800 : 700, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* === DETALLE DE SERVICIOS === */}
            <div style={{ padding: '20px 36px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 14 }}>Detalle de Servicios</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0d1b3e' }}>
                    <th style={{ padding: '13px 16px', textAlign: 'left',   color: 'white', fontWeight: 700, fontSize: 14 }}>Descripcion del Servicio</th>
                    <th style={{ padding: '13px 16px', textAlign: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>Velocidad</th>
                    <th style={{ padding: '13px 16px', textAlign: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>Periodo</th>
                    <th style={{ padding: '13px 16px', textAlign: 'right',  color: 'white', fontWeight: 700, fontSize: 14 }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ backgroundColor: '#f8f9ff', borderBottom: '1px solid #e8eaf6' }}>
                    <td style={{ padding: '16px 16px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 800, color: '#0d1b3e', fontSize: 17, marginBottom: 5 }}>Internet Fibra Optica — {client.plan}</div>
                      <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Servicio residencial de alta velocidad — Conectate con velocidad real</div>
                      <div style={{ fontSize: 13, color: '#2e7d32', fontStyle: 'italic' }}>Exento de IVA (Art. 481, literal h, E.T.)</div>
                    </td>
                    <td style={{ padding: '16px 16px', textAlign: 'center', color: '#333', fontWeight: 700, fontSize: 16, verticalAlign: 'top' }}>{speedMbps}</td>
                    <td style={{ padding: '16px 16px', textAlign: 'center', color: '#555', fontSize: 15, verticalAlign: 'top' }}>{period}</td>
                    <td style={{ padding: '16px 16px', textAlign: 'right', fontSize: 22, fontWeight: 900, color: '#0d1b3e', verticalAlign: 'top' }}>{formatCurrency(client.plan_value)}</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f0fdf4', borderBottom: '1px solid #d1fae5' }}>
                    <td colSpan={3} style={{ padding: '9px 16px', fontSize: 14, color: '#166534', fontStyle: 'italic' }}>
                      IVA — Exento (Art. 481, literal h, E.T.) — Internet residencial estrato 1 y 2
                    </td>
                    <td style={{ padding: '9px 16px', textAlign: 'right', fontSize: 15, fontWeight: 700, color: '#166534' }}>$ 0</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} />
                    <td style={{ padding: '10px 16px 4px', textAlign: 'right', fontSize: 15, color: '#666', fontWeight: 600 }}>Subtotal</td>
                    <td style={{ padding: '10px 16px 4px', textAlign: 'right', fontSize: 17, fontWeight: 700, color: '#333' }}>{formatCurrency(client.plan_value)}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} />
                    <td style={{ padding: '3px 16px', textAlign: 'right', fontSize: 14, color: '#166534', fontWeight: 600 }}>IVA (Art. 481, literal h)</td>
                    <td style={{ padding: '3px 16px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#166534' }}>$ 0</td>
                  </tr>
                  <tr style={{ borderTop: '3px solid #0d1b3e', backgroundColor: '#eef2ff' }}>
                    <td colSpan={2} style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic', letterSpacing: 0.5 }}>────────── TOTAL A PAGAR</span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 16, fontWeight: 800, color: '#0d1b3e' }}>TOTAL A PAGAR</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 28, fontWeight: 900, color: '#0d1b3e' }}>{formatCurrency(client.plan_value)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* === REFERENCIAS DE PAGO === */}
            <div style={{ margin: '0 36px 16px', padding: '18px 20px', backgroundColor: '#f0f4ff', borderRadius: 10, border: '1px solid #c5cae9' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 16 }}>Referencias de Pago</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 190px', gap: 14, alignItems: 'stretch' }}>

                {/* Bancolombia */}
                <div style={{ backgroundColor: 'white', borderRadius: 10, padding: 16, border: '1px solid #e0e0e0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                    <img src="/bancolombia.png" alt="Bancolombia" crossOrigin="anonymous" style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 8 }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#333' }}>Bancolombia</div>
                      <div style={{ fontSize: 13, color: '#888' }}>Transferencia / PSE</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#999', marginBottom: 3 }}>Tipo de cuenta</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 12 }}>Cuenta de Ahorros</div>
                  <div style={{ fontSize: 13, color: '#999', marginBottom: 3 }}>Numero de cuenta</div>
                  <div style={{ fontSize: 21, fontWeight: 900, color: '#0d1b3e', letterSpacing: 1, marginBottom: 12 }}>{CUENTA}</div>
                  <div style={{ fontSize: 13, color: '#999', marginBottom: 3 }}>A nombre de</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>Medifibra S.A.S</div>
                </div>

                {/* Bre-B */}
                <div style={{ backgroundColor: 'white', borderRadius: 10, padding: 16, border: '1px solid #e0e0e0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                    <img src="/bre-b.png" alt="Bre-B" crossOrigin="anonymous" style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 8 }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#333' }}>Bre-B</div>
                      <div style={{ fontSize: 13, color: '#888' }}>Transferencia inmediata</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#999', marginBottom: 3 }}>Llave / Referencia de pago</div>
                  <div style={{ fontSize: 21, fontWeight: 900, color: '#1b5e20', letterSpacing: 1, marginBottom: 12 }}>{CUENTA}</div>
                  <div style={{ fontSize: 13, color: '#999', marginBottom: 3 }}>A nombre de</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 8 }}>Medifibra S.A.S</div>
                  <div style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>Pago disponible 24/7</div>
                </div>

                {/* QR */}
                <div style={{ backgroundColor: 'white', borderRadius: 10, padding: 14, border: '2px solid #1565c0', boxShadow: '0 2px 8px rgba(21,101,192,0.15)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1565c0', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Paga Aqui</div>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>Escanea con la app de tu banco</div>
                  <img src="/qr-pago.jpg" alt="QR Bancolombia" crossOrigin="anonymous"
                    style={{ width: 138, height: 138, objectFit: 'contain', borderRadius: 6, border: '1px solid #e0e0e0' }} />
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#0d1b3e', marginTop: 10, letterSpacing: 1 }}>{CUENTA}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>Bancolombia · Bre-B</div>
                </div>

              </div>
            </div>

            {/* === POLITICA DE COBRO === */}
            <div style={{ margin: '0 36px 16px', padding: '16px 20px', backgroundColor: '#fffbeb', borderRadius: 10, border: '1px solid #fbbf24', borderLeft: '5px solid #d97706' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>Politica de Cobro y Condiciones del Servicio</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div style={{ backgroundColor: 'white', borderRadius: 8, padding: '12px 10px', border: '1px solid #fde68a', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#92400e", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>PLAZO</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#92400e', marginBottom: 6 }}>3 Dias Habiles de Pago</div>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>El plazo maximo para pagar es <strong style={{ color: '#c62828' }}>{dueDate}</strong>. Envie comprobante al WhatsApp 333 728 8745.</div>
                </div>
                <div style={{ backgroundColor: 'white', borderRadius: 8, padding: '12px 10px', border: '1px solid #fde68a', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#92400e", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>AVISO</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#92400e', marginBottom: 6 }}>Suspension del Servicio</div>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>Vencido el plazo sin pago, el servicio sera suspendido hasta la regularizacion total de la deuda.</div>
                </div>
                <div style={{ backgroundColor: 'white', borderRadius: 8, padding: '12px 10px', border: '1px solid #fde68a', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#92400e", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>IMPORTANTE</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#92400e', marginBottom: 6 }}>60 Dias — Retiro y Multas</div>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>Pasados 60 dias sin pago se retiran los equipos. La no entrega genera multas y sobrecargos adicionales.</div>
                </div>
              </div>
            </div>

            {/* === FOOTER === */}
            <div style={{ backgroundColor: '#0d1b3e', padding: '18px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#90caf9', fontSize: 12, letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' }}>Contacto y Soporte</div>
                <div style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>WhatsApp: 333 728 8745</div>
                <div style={{ color: '#90caf9', fontSize: 13, marginTop: 3 }}>Medellin, Antioquia, Colombia</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'white', fontSize: 24, fontWeight: 900, letterSpacing: 4, fontFamily: 'Arial Black, Arial' }}>MEDIFIBRA</div>
                <div style={{ color: '#90caf9', fontSize: 13, marginTop: 4 }}>Conectate con velocidad real</div>
                <div style={{ color: '#546e7a', fontSize: 10, marginTop: 4 }}>Generado: {now.toLocaleString('es-CO')}</div>
              </div>
            </div>

            {/* === NOTA PAGO === */}
            <div style={{ padding: '12px 36px', backgroundColor: '#fff9c4', borderTop: '3px solid #f9a825', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, margin: 0 }}>
                Al realizar el pago, envie el comprobante al WhatsApp <strong style={{ color: '#333' }}>333 728 8745</strong> indicando nombre completo y numero de factura <strong style={{ color: '#1565c0' }}>{invoiceNum}</strong>. Gracias por su pago puntual — <strong>Medifibra S.A.S</strong>
              </p>
            </div>

            {/* === AVISO DIAN === */}
            <div style={{ padding: '8px 36px', backgroundColor: '#f1f5f9', borderTop: '1px solid #cbd5e1', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0, letterSpacing: 0.3 }}>
                <strong>Documento comercial</strong> — no valido como factura electronica DIAN &nbsp;|&nbsp; NIT 902060057-8 &nbsp;|&nbsp; Medifibra S.A.S &nbsp;|&nbsp; Medellin, Colombia
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
