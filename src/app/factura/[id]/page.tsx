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
const W = 794

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

  const now         = new Date()
  // Periodo = mes ANTERIOR al dia actual
  const prevMonth   = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const period      = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
  const periodLabel = prevMonth.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  const invoiceNum  = `MF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(id).padStart(4, '0')}`
  const dateStr     = now.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
  const dueDateObj  = addBusinessDays(now, 3)
  const dueDate     = dueDateObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })

  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth
      setMobileScale(vw < W + 32 ? (vw - 8) / W : 1)
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
        format: 'CODE128', width: 1.4, height: 36,
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
        imageTimeout: 15000, windowWidth: W,
      })
      const imgData   = canvas.toDataURL('image/jpeg', 0.95)
      const PAGE_W_MM = 210
      const PAGE_H_MM = PAGE_W_MM * (canvas.height / canvas.width)
      const pdf       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PAGE_W_MM, PAGE_H_MM] })
      pdf.addImage(imgData, 'JPEG', 0, 0, PAGE_W_MM, PAGE_H_MM)
      const safeName  = client.name
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

  const lbl = {
    fontSize: 11, fontWeight: 700, color: '#1565c0',
    letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8
  }

  return (
    <>
      <div style={{ backgroundColor: '#0b0f19', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af', textDecoration: 'none', fontSize: 14, fontFamily: 'Arial' }}>
          <ArrowLeft size={15} /> Dashboard
        </Link>
        <button onClick={handleDownload} disabled={downloading} style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: downloading ? '#374151' : '#2563eb', color: 'white', border: 'none', borderRadius: 7, padding: '8px 18px', fontSize: 14, fontWeight: 700, cursor: downloading ? 'not-allowed' : 'pointer', fontFamily: 'Arial' }}>
          {downloading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generando...</> : <><Download size={14} /> Descargar PDF</>}
        </button>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing:border-box; } body { margin:0; padding:0; }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#e8eef4', padding: '12px 0', overflow: 'hidden' }}>
        <div style={{ width: W, margin: '0 auto', transformOrigin: 'top center', transform: `scale(${viewZoom})`, marginBottom: viewZoom < 1 ? `${-W * (1 - viewZoom) * 1.35}px` : 0 }}>

          <div ref={invoiceRef} style={{ width: W, backgroundColor: '#ffffff', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>

            {/* ═══ HEADER ═══ */}
            <div style={{ background: 'linear-gradient(135deg,#0d1b3e 0%,#1a237e 55%,#0d47a1 100%)', padding: '18px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* Logo + empresa */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <img src="/logofact.jpeg" alt="Medifibra" crossOrigin="anonymous"
                    style={{ width: 110, height: 110, objectFit: 'contain', borderRadius: 10, background: 'white', padding: 4 }} />
                  <div>
                    <div style={{ color: 'white', fontSize: 30, fontWeight: 900, letterSpacing: 2, lineHeight: 1, fontFamily: 'Arial Black, Arial' }}>MEDIFIBRA <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: 2, color: '#90caf9' }}>S.A.S</span></div>
                    <div style={{ color: '#90caf9', fontSize: 13, marginTop: 10 }}>NIT: 902060057-8</div>
                    <div style={{ color: '#90caf9', fontSize: 14, marginTop: 2 }}>Proveedor de Internet Fibra Optica</div>
                    <div style={{ color: '#90caf9', fontSize: 14, marginTop: 2 }}>Medellin, Antioquia, Colombia</div>
                  </div>
                </div>
                {/* Factura info + barcode */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#bbdefb', fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 2 }}>Factura de Servicio</div>
                  <div style={{ color: 'white', fontSize: 26, fontWeight: 900, letterSpacing: 1, fontFamily: 'Arial Black, Arial' }}>{invoiceNum}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '4px 0' }}>
                    <svg ref={barcodeRef} style={{ display: 'block', maxWidth: 200 }} />
                  </div>
                  <div style={{ color: '#90caf9', fontSize: 13, marginTop: 2 }}>Emision: {dateStr}</div>
                  <div style={{ color: '#90caf9', fontSize: 13, marginTop: 1 }}>Periodo facturado: {periodLabel}</div>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: client.status === 'active' ? '#2e7d32' : '#b71c1c', color: 'white', borderRadius: 4, padding: '6px 14px', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, width: '100%' }}>
                    {client.status === 'active' ? 'SERVICIO ACTIVO' : 'SERVICIO SUSPENDIDO'}
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ FILA: CLIENTE | COBRO | QR ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 190px', borderBottom: '2px solid #e8eaf6' }}>
              {/* Cliente */}
              <div style={{ padding: '14px 20px', borderRight: '1px solid #e8eaf6' }}>
                <div style={lbl}>Informacion del Cliente</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0d1b3e', marginBottom: 8, lineHeight: 1.25 }}>{client.name}</div>
                {client.address && (
                  <div style={{ fontSize: 15, color: '#444', marginBottom: 5, display: 'flex', gap: 6 }}>
                    <span style={{ color: '#1565c0', fontWeight: 700, minWidth: 40 }}>Dir:</span>
                    <span>{client.address}{client.neighborhood ? `, ${client.neighborhood}` : ''}</span>
                  </div>
                )}
                {client.city && (
                  <div style={{ fontSize: 15, color: '#444', marginBottom: 5, display: 'flex', gap: 6 }}>
                    <span style={{ color: '#1565c0', fontWeight: 700, minWidth: 40 }}>Ciudad:</span>
                    <span>{client.city}{client.commune ? ` — Comuna ${client.commune}` : ''}</span>
                  </div>
                )}
                <div style={{ fontSize: 15, color: '#444', marginBottom: 5, display: 'flex', gap: 6 }}>
                  <span style={{ color: '#1565c0', fontWeight: 700, minWidth: 40 }}>Cel:</span>
                  <span style={{ fontWeight: 800, fontSize: 17 }}>{client.cellphone}</span>
                </div>
                {client.phone && (
                  <div style={{ fontSize: 14, color: '#444', marginBottom: 5, display: 'flex', gap: 6 }}>
                    <span style={{ color: '#1565c0', fontWeight: 700, minWidth: 40 }}>Tel:</span>
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div style={{ fontSize: 14, color: '#444', display: 'flex', gap: 6 }}>
                    <span style={{ color: '#1565c0', fontWeight: 700, minWidth: 40 }}>Email:</span>
                    <span>{client.email}</span>
                  </div>
                )}
              </div>

              {/* Cobro */}
              <div style={{ padding: '14px 20px', borderRight: '1px solid #e8eaf6' }}>
                <div style={lbl}>Detalles de Cobro</div>
                {[
                  { label: 'N de Factura',          value: invoiceNum, color: '#1565c0', bold: false },
                  { label: 'Periodo facturado',      value: periodLabel, color: '#222',  bold: true  },
                  { label: 'Fecha de emision',       value: dateStr,   color: '#222',    bold: true  },
                  { label: 'Vence (3 dias habiles)', value: dueDate,   color: '#c62828', bold: true  },
                  { label: 'Llave / Referencia',     value: CUENTA,    color: '#1b5e20', bold: true  },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7, paddingBottom: 7, borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ fontSize: 14, color: '#666', flexShrink: 0, marginRight: 8, whiteSpace: 'nowrap' }}>{row.label}</span>
                    <span style={{ fontSize: 14, fontWeight: row.bold ? 800 : 700, color: row.color, textAlign: 'right', whiteSpace: 'nowrap' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* QR */}
              <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8faff', borderLeft: '2px solid #1565c0' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#1565c0', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4, textAlign: 'center' }}>Paga Aqui</div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textAlign: 'center' }}>Escanea con tu banco</div>
                <img src="/QR.jpg" alt="QR Bancolombia" crossOrigin="anonymous"
                  style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 8, border: '2px solid #1565c0' }} />
                <div style={{ fontSize: 15, fontWeight: 900, color: '#0d1b3e', marginTop: 6, letterSpacing: 1, textAlign: 'center' }}>{CUENTA}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2, textAlign: 'center' }}>Bancolombia · Bre-B</div>
              </div>
            </div>

            {/* ═══ SERVICIOS ═══ */}
            <div style={{ padding: '12px 22px 8px' }}>
              <div style={lbl}>Detalle de Servicios</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0d1b3e' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left',   color: 'white', fontWeight: 700, fontSize: 14 }}>Descripcion del Servicio</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>Velocidad</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>Periodo</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right',  color: 'white', fontWeight: 700, fontSize: 14 }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ backgroundColor: '#f8f9ff', borderBottom: '1px solid #e8eaf6' }}>
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 800, color: '#0d1b3e', fontSize: 16, marginBottom: 3 }}>Internet Fibra Optica — {client.plan}</div>
                      <div style={{ fontSize: 13, color: '#2e7d32', fontStyle: 'italic' }}>Exento de IVA (Art. 481, literal h, E.T.) — Estrato 1 y 2</div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#333', fontWeight: 700, fontSize: 16, verticalAlign: 'middle' }}>{speedMbps}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#555', fontSize: 14, verticalAlign: 'middle' }}>{period}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 24, fontWeight: 900, color: '#0d1b3e', verticalAlign: 'middle' }}>{formatCurrency(client.plan_value)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f0fdf4' }}>
                    <td colSpan={2} style={{ padding: '7px 14px', fontSize: 13, color: '#166534', fontStyle: 'italic' }}>IVA — Exento (Art. 481, literal h, E.T.)</td>
                    <td style={{ padding: '7px 14px', textAlign: 'right', fontSize: 13, color: '#666', fontWeight: 600 }}>Subtotal</td>
                    <td style={{ padding: '7px 14px', textAlign: 'right', fontSize: 15, fontWeight: 700, color: '#333' }}>{formatCurrency(client.plan_value)}</td>
                  </tr>
                  <tr style={{ borderTop: '3px solid #0d1b3e', backgroundColor: '#eef2ff' }}>
                    <td colSpan={2} style={{ padding: '10px 14px', fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>IVA (Art. 481, literal h) — $ 0 &nbsp;·&nbsp; Internet residencial exento</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 15, fontWeight: 800, color: '#0d1b3e' }}>TOTAL A PAGAR</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 28, fontWeight: 900, color: '#0d1b3e' }}>{formatCurrency(client.plan_value)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ═══ PAGOS + POLITICA ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, padding: '8px 22px 12px' }}>

              {/* Bancolombia */}
              <div style={{ backgroundColor: 'white', borderRadius: 8, padding: '12px 14px', border: '1px solid #e0e0e0', borderTop: '3px solid #fdda24', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <div style={lbl}>Bancolombia</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <img src="/bancolombia.png" alt="Bancolombia" crossOrigin="anonymous" style={{ width: 38, height: 38, objectFit: 'contain', borderRadius: 6 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#333' }}>Transferencia</div>
                    <div style={{ fontSize: 12, color: '#888' }}>Cuenta de Ahorros</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 2 }}>Numero de cuenta</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#0d1b3e', letterSpacing: 1, marginBottom: 6 }}>{CUENTA}</div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 1 }}>A nombre de</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>Medifibra S.A.S</div>
              </div>

              {/* Bre-B */}
              <div style={{ backgroundColor: 'white', borderRadius: 8, padding: '12px 14px', border: '1px solid #e0e0e0', borderTop: '3px solid #00c853', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <div style={lbl}>Bre-B</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <img src="/bre-b.png" alt="Bre-B" crossOrigin="anonymous" style={{ width: 38, height: 38, objectFit: 'contain', borderRadius: 6 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#333' }}>Transferencia inmediata</div>
                    <div style={{ fontSize: 12, color: '#888' }}>Disponible 24/7</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 2 }}>Llave / Referencia de pago</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#1b5e20', letterSpacing: 1, marginBottom: 6 }}>{CUENTA}</div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 1 }}>A nombre de</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>Medifibra S.A.S</div>
              </div>

              {/* Politica */}
              <div style={{ backgroundColor: '#fffbeb', borderRadius: 8, padding: '12px 14px', border: '1px solid #fbbf24', borderTop: '3px solid #d97706' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Politica de Cobro</div>
                <div style={{ marginBottom: 7, paddingBottom: 7, borderBottom: '1px solid #fde68a' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e', marginBottom: 2 }}>PLAZO — 3 Dias Habiles</div>
                  <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>Limite: <strong style={{ color: '#c62828' }}>{dueDate}</strong>. Envie comprobante al WhatsApp 333 728 8745.</div>
                </div>
                <div style={{ marginBottom: 7, paddingBottom: 7, borderBottom: '1px solid #fde68a' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e', marginBottom: 2 }}>AVISO — Suspension</div>
                  <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>Sin pago en el plazo, el servicio sera suspendido hasta regularizar.</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e', marginBottom: 2 }}>IMPORTANTE — 60 Dias</div>
                  <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>A los 60 dias se retiran equipos. La no entrega genera multas y sobrecargos.</div>
                </div>
              </div>
            </div>

            {/* ═══ FOOTER UNIFICADO ═══ */}
            <div style={{ backgroundColor: '#0d1b3e', padding: '14px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ color: '#90caf9', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>Contacto y Soporte</div>
                  <div style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>WhatsApp: 333 728 8745</div>
                  <div style={{ color: '#90caf9', fontSize: 13, marginTop: 2 }}>Medellin, Antioquia, Colombia</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'white', fontSize: 24, fontWeight: 900, letterSpacing: 4, fontFamily: 'Arial Black, Arial' }}>MEDIFIBRA</div>
                  <div style={{ color: '#90caf9', fontSize: 12, marginTop: 3 }}>Conectate con velocidad real</div>
                  <div style={{ color: '#546e7a', fontSize: 10, marginTop: 2 }}>Generado: {now.toLocaleString('es-CO')}</div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #1e3a5f', paddingTop: 8, textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: '#90caf9', margin: '0 0 4px', lineHeight: 1.6 }}>
                  Al pagar, envie el comprobante al WhatsApp <strong style={{ color: 'white' }}>333 728 8745</strong> indicando su nombre y numero de factura <strong style={{ color: '#60a5fa' }}>{invoiceNum}</strong>.
                </p>
                <p style={{ fontSize: 11, color: '#546e7a', margin: 0 }}>
                  <strong>Documento comercial</strong> — no valido como factura electronica DIAN &nbsp;|&nbsp; NIT 902060057-8 &nbsp;|&nbsp; Medifibra S.A.S &nbsp;|&nbsp; Medellin, Colombia
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
