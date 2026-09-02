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

  const now        = new Date()
  const period     = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const invoiceNum = `MF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(id).padStart(4, '0')}`
  const dateStr    = now.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
  const dueDateObj = addBusinessDays(now, 3)
  const dueDate    = dueDateObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })

  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth
      setMobileScale(vw < W + 32 ? (vw - 16) / W : 1)
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
        format: 'CODE128', width: 2, height: 48,
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
      const imgData      = canvas.toDataURL('image/jpeg', 0.95)
      const PAGE_W_MM    = 210
      const PAGE_H_MM    = PAGE_W_MM * (canvas.height / canvas.width)
      const pdf          = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PAGE_W_MM, PAGE_H_MM] })
      pdf.addImage(imgData, 'JPEG', 0, 0, PAGE_W_MM, PAGE_H_MM)
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
      <p style={{ fontSize: 22, color: '#6b7280', fontFamily: 'Arial' }}>Cargando factura...</p>
    </div>
  )
  if (!client) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
      <p style={{ color: '#ef4444', fontFamily: 'Arial', fontSize: 22 }}>Cliente no encontrado</p>
    </div>
  )

  const speedMatch = client.plan.match(/\d+/)
  const speedMbps  = speedMatch ? `${speedMatch[0]} Mbps` : '—'
  const viewZoom   = isCapturing ? 1 : mobileScale

  const labelStyle  = { fontSize: 12, fontWeight: 700, color: '#1565c0', letterSpacing: 2.5, textTransform: 'uppercase' as const, marginBottom: 10 }
  const cardStyle   = { backgroundColor: 'white', borderRadius: 10, padding: '14px 16px', border: '1px solid #e0e0e0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }

  return (
    <>
      <div style={{ backgroundColor: '#0b0f19', padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', textDecoration: 'none', fontSize: 15, fontFamily: 'Arial' }}>
          <ArrowLeft size={16} /> Volver al Dashboard
        </Link>
        <button onClick={handleDownload} disabled={downloading} style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: downloading ? '#374151' : '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 15, fontWeight: 700, cursor: downloading ? 'not-allowed' : 'pointer', fontFamily: 'Arial' }}>
          {downloading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generando...</> : <><Download size={16} /> Descargar PDF</>}
        </button>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing:border-box; } body { margin:0; padding:0; }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#e8eef4', padding: '20px 0', overflow: 'hidden' }}>
        <div style={{ width: W, margin: '0 auto', transformOrigin: 'top center', transform: `scale(${viewZoom})`, marginBottom: viewZoom < 1 ? `${-W * (1 - viewZoom) * 1.4}px` : 0 }}>

          <div ref={invoiceRef} style={{ width: W, backgroundColor: '#ffffff', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>

            {/* ═══ HEADER ═══ */}
            <div style={{ background: 'linear-gradient(135deg,#0d1b3e 0%,#1a237e 55%,#0d47a1 100%)', padding: '22px 36px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* Logo + empresa */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <img src="/logofact.jpeg" alt="Medifibra" crossOrigin="anonymous"
                    style={{ width: 130, height: 130, objectFit: 'contain', borderRadius: 12, background: 'white', padding: 5 }} />
                  <div>
                    <div style={{ color: 'white', fontSize: 40, fontWeight: 900, letterSpacing: 4, lineHeight: 1, fontFamily: 'Arial Black, Arial' }}>MEDIFIBRA</div>
                    <div style={{ color: '#90caf9', fontSize: 16, marginTop: 6 }}>S.A.S — NIT: 902060057-8</div>
                    <div style={{ color: '#90caf9', fontSize: 16, marginTop: 3 }}>Proveedor de Internet Fibra Optica</div>
                    <div style={{ color: '#90caf9', fontSize: 16, marginTop: 3 }}>Medellin, Antioquia, Colombia</div>
                  </div>
                </div>
                {/* Numero + barcode */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#bbdefb', fontSize: 13, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4 }}>Factura de Servicio</div>
                  <div style={{ color: 'white', fontSize: 30, fontWeight: 900, letterSpacing: 1, fontFamily: 'Arial Black, Arial' }}>{invoiceNum}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '6px 0' }}>
                    <svg ref={barcodeRef} style={{ display: 'block' }} />
                  </div>
                  <div style={{ color: '#90caf9', fontSize: 15, marginTop: 4 }}>Fecha: {dateStr}</div>
                  <div style={{ color: '#90caf9', fontSize: 15, marginTop: 3 }}>Periodo: {period}</div>
                  <div style={{ marginTop: 10, display: 'inline-block', backgroundColor: client.status === 'active' ? '#2e7d32' : '#b71c1c', color: 'white', borderRadius: 5, padding: '5px 18px', fontSize: 13, fontWeight: 700, letterSpacing: 1.5 }}>
                    {client.status === 'active' ? 'SERVICIO ACTIVO' : 'SERVICIO SUSPENDIDO'}
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ FILA 2: CLIENTE | COBRO | QR ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 220px', borderBottom: '2px solid #e8eaf6' }}>

              {/* Cliente */}
              <div style={{ padding: '18px 24px', borderRight: '1px solid #e8eaf6' }}>
                <div style={labelStyle}>Informacion del Cliente</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0d1b3e', marginBottom: 10, lineHeight: 1.2 }}>{client.name}</div>
                {client.address && (
                  <div style={{ fontSize: 15, color: '#444', marginBottom: 7, display: 'flex', gap: 8 }}>
                    <span style={{ color: '#1565c0', fontWeight: 700, minWidth: 50 }}>Dir:</span>
                    <span>{client.address}{client.neighborhood ? `, Barrio ${client.neighborhood}` : ''}</span>
                  </div>
                )}
                {client.city && (
                  <div style={{ fontSize: 15, color: '#444', marginBottom: 7, display: 'flex', gap: 8 }}>
                    <span style={{ color: '#1565c0', fontWeight: 700, minWidth: 50 }}>Ciudad:</span>
                    <span>{client.city}{client.commune ? ` — Comuna ${client.commune}` : ''}</span>
                  </div>
                )}
                <div style={{ fontSize: 15, color: '#444', marginBottom: 7, display: 'flex', gap: 8 }}>
                  <span style={{ color: '#1565c0', fontWeight: 700, minWidth: 50 }}>Cel:</span>
                  <span style={{ fontWeight: 800, fontSize: 17 }}>{client.cellphone}</span>
                </div>
                {client.phone && (
                  <div style={{ fontSize: 15, color: '#444', marginBottom: 7, display: 'flex', gap: 8 }}>
                    <span style={{ color: '#1565c0', fontWeight: 700, minWidth: 50 }}>Tel:</span>
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div style={{ fontSize: 15, color: '#444', display: 'flex', gap: 8 }}>
                    <span style={{ color: '#1565c0', fontWeight: 700, minWidth: 50 }}>Email:</span>
                    <span>{client.email}</span>
                  </div>
                )}
              </div>

              {/* Detalles cobro */}
              <div style={{ padding: '18px 24px', borderRight: '1px solid #e8eaf6' }}>
                <div style={labelStyle}>Detalles de Cobro</div>
                {[
                  { label: 'N de Factura',           value: invoiceNum, color: '#1565c0', bold: false },
                  { label: 'Periodo facturado',       value: period,     color: '#222',    bold: true  },
                  { label: 'Fecha de emision',        value: dateStr,    color: '#222',    bold: true  },
                  { label: 'Vence (3 dias habiles)',  value: dueDate,    color: '#c62828', bold: true  },
                  { label: 'Llave / Referencia pago', value: CUENTA,     color: '#1b5e20', bold: true  },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9, paddingBottom: 9, borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ fontSize: 15, color: '#666' }}>{row.label}</span>
                    <span style={{ fontSize: 15, fontWeight: row.bold ? 800 : 700, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* QR grande */}
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8faff', borderLeft: '2px solid #1565c0' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#1565c0', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, textAlign: 'center' }}>Paga Aqui</div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 8, textAlign: 'center' }}>Escanea con tu banco</div>
                <img src="/QR.jpg" alt="QR Bancolombia" crossOrigin="anonymous"
                  style={{ width: 175, height: 175, objectFit: 'cover', borderRadius: 8, border: '2px solid #1565c0' }} />
                <div style={{ fontSize: 16, fontWeight: 900, color: '#0d1b3e', marginTop: 8, letterSpacing: 1, textAlign: 'center' }}>{CUENTA}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 3, textAlign: 'center' }}>Bancolombia · Bre-B</div>
              </div>
            </div>

            {/* ═══ SERVICIOS ═══ */}
            <div style={{ padding: '16px 28px 10px' }}>
              <div style={labelStyle}>Detalle de Servicios</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0d1b3e' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left',   color: 'white', fontWeight: 700, fontSize: 15 }}>Descripcion del Servicio</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: 'white', fontWeight: 700, fontSize: 15 }}>Velocidad</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: 'white', fontWeight: 700, fontSize: 15 }}>Periodo</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right',  color: 'white', fontWeight: 700, fontSize: 15 }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ backgroundColor: '#f8f9ff', borderBottom: '1px solid #e8eaf6' }}>
                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 800, color: '#0d1b3e', fontSize: 17, marginBottom: 4 }}>Internet Fibra Optica — {client.plan}</div>
                      <div style={{ fontSize: 14, color: '#666', marginBottom: 3 }}>Servicio residencial de alta velocidad — Conectate con velocidad real</div>
                      <div style={{ fontSize: 14, color: '#2e7d32', fontStyle: 'italic' }}>Exento de IVA (Art. 481, literal h, E.T.)</div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#333', fontWeight: 700, fontSize: 17, verticalAlign: 'middle' }}>{speedMbps}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#555', fontSize: 16, verticalAlign: 'middle' }}>{period}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 24, fontWeight: 900, color: '#0d1b3e', verticalAlign: 'middle' }}>{formatCurrency(client.plan_value)}</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f0fdf4', borderBottom: '1px solid #d1fae5' }}>
                    <td colSpan={3} style={{ padding: '8px 16px', fontSize: 14, color: '#166534', fontStyle: 'italic' }}>
                      IVA — Exento (Art. 481, literal h, E.T.) — Internet residencial estrato 1 y 2
                    </td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', fontSize: 15, fontWeight: 700, color: '#166534' }}>$ 0</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} />
                    <td style={{ padding: '8px 16px 3px', textAlign: 'right', fontSize: 15, color: '#666', fontWeight: 600 }}>Subtotal</td>
                    <td style={{ padding: '8px 16px 3px', textAlign: 'right', fontSize: 17, fontWeight: 700, color: '#333' }}>{formatCurrency(client.plan_value)}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} />
                    <td style={{ padding: '2px 16px', textAlign: 'right', fontSize: 14, color: '#166534', fontWeight: 600 }}>IVA (Art. 481, literal h)</td>
                    <td style={{ padding: '2px 16px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#166534' }}>$ 0</td>
                  </tr>
                  <tr style={{ borderTop: '3px solid #0d1b3e', backgroundColor: '#eef2ff' }}>
                    <td colSpan={2} style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>────────── TOTAL A PAGAR</span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 17, fontWeight: 800, color: '#0d1b3e' }}>TOTAL A PAGAR</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 30, fontWeight: 900, color: '#0d1b3e' }}>{formatCurrency(client.plan_value)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ═══ FILA 3: BANCOLOMBIA | BRE-B | POLITICA ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, padding: '10px 28px 14px' }}>

              {/* Bancolombia */}
              <div style={{ ...cardStyle, borderTop: '3px solid #fdda24' }}>
                <div style={labelStyle}>Bancolombia</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <img src="/bancolombia.png" alt="Bancolombia" crossOrigin="anonymous" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 8 }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#333' }}>Transferencia / PSE</div>
                    <div style={{ fontSize: 13, color: '#888' }}>Cuenta de Ahorros</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#999', marginBottom: 2 }}>Numero de cuenta</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#0d1b3e', letterSpacing: 1, marginBottom: 8 }}>{CUENTA}</div>
                <div style={{ fontSize: 13, color: '#999', marginBottom: 2 }}>A nombre de</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#333' }}>Jose Medardo Mosquera</div>
              </div>

              {/* Bre-B */}
              <div style={{ ...cardStyle, borderTop: '3px solid #00c853' }}>
                <div style={labelStyle}>Bre-B</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <img src="/bre-b.png" alt="Bre-B" crossOrigin="anonymous" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 8 }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#333' }}>Transferencia inmediata</div>
                    <div style={{ fontSize: 13, color: '#888' }}>Pago disponible 24/7</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#999', marginBottom: 2 }}>Llave / Referencia de pago</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#1b5e20', letterSpacing: 1, marginBottom: 8 }}>{CUENTA}</div>
                <div style={{ fontSize: 13, color: '#999', marginBottom: 2 }}>A nombre de</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#333' }}>Jose Medardo Mosquera</div>
              </div>

              {/* Politica */}
              <div style={{ backgroundColor: '#fffbeb', borderRadius: 10, padding: '14px 16px', border: '1px solid #fbbf24', borderTop: '3px solid #d97706' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Politica de Cobro</div>
                <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #fde68a' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#92400e', marginBottom: 3 }}>PLAZO — 3 Dias Habiles</div>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>Fecha limite: <strong style={{ color: '#c62828' }}>{dueDate}</strong>. Envie comprobante al WhatsApp 333 728 8745.</div>
                </div>
                <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #fde68a' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#92400e', marginBottom: 3 }}>AVISO — Suspension</div>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>Sin pago en el plazo, el servicio sera suspendido hasta regularizar la deuda.</div>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#92400e', marginBottom: 3 }}>IMPORTANTE — 60 Dias</div>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>A los 60 dias se retiran equipos. La no entrega genera multas y sobrecargos.</div>
                </div>
              </div>
            </div>

            {/* ═══ FOOTER ═══ */}
            <div style={{ backgroundColor: '#0d1b3e', padding: '16px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#90caf9', fontSize: 12, letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' }}>Contacto y Soporte</div>
                <div style={{ color: 'white', fontSize: 19, fontWeight: 700 }}>WhatsApp: 333 728 8745</div>
                <div style={{ color: '#90caf9', fontSize: 14, marginTop: 3 }}>Medellin, Antioquia, Colombia</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'white', fontSize: 26, fontWeight: 900, letterSpacing: 4, fontFamily: 'Arial Black, Arial' }}>MEDIFIBRA</div>
                <div style={{ color: '#90caf9', fontSize: 13, marginTop: 4 }}>Conectate con velocidad real</div>
                <div style={{ color: '#546e7a', fontSize: 11, marginTop: 4 }}>Generado: {now.toLocaleString('es-CO')}</div>
              </div>
            </div>

            {/* ═══ NOTA PAGO ═══ */}
            <div style={{ padding: '10px 36px', backgroundColor: '#fff9c4', borderTop: '3px solid #f9a825', textAlign: 'center' }}>
              <p style={{ fontSize: 15, color: '#555', lineHeight: 1.7, margin: 0 }}>
                Al realizar el pago, envie el comprobante al WhatsApp <strong style={{ color: '#333' }}>333 728 8745</strong> indicando nombre completo y numero de factura <strong style={{ color: '#1565c0' }}>{invoiceNum}</strong>. Gracias por su pago puntual — <strong>Medifibra S.A.S</strong>
              </p>
            </div>

            {/* ═══ AVISO DIAN ═══ */}
            <div style={{ padding: '7px 36px', backgroundColor: '#f1f5f9', borderTop: '1px solid #cbd5e1', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0, letterSpacing: 0.3 }}>
                <strong>Documento comercial</strong> — no valido como factura electronica DIAN &nbsp;|&nbsp; NIT 902060057-8 &nbsp;|&nbsp; Medifibra S.A.S &nbsp;|&nbsp; Medellin, Colombia
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
