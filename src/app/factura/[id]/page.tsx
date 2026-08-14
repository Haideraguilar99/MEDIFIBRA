'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/plans'
import { Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Client = {
  id: number; name: string; email: string; phone: string; cellphone: string
  address: string; city: string; neighborhood: string; commune: string
  consumption_date: string; payment_date: string; plan: string; plan_value: number
  reference: string; status: string; notes: string; created_at: string
}

export default function FacturaPage() {
  const { id } = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  const now        = new Date()
  const period     = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  const invoiceNum = `MF-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-${String(id).padStart(4,'0')}`
  const dateStr    = now.toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then(r => r.json())
      .then(d => { setClient(d.client); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'#f3f4f6'}}>
      <p style={{color:'#6b7280',fontFamily:'Arial'}}>Cargando factura...</p>
    </div>
  )
  if (!client) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'#f3f4f6'}}>
      <p style={{color:'#ef4444',fontFamily:'Arial'}}>Cliente no encontrado</p>
    </div>
  )

  const dueDate = client.payment_date
    ? new Date(client.payment_date + 'T12:00:00').toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })
    : 'Según acuerdo'

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .invoice-wrap { background: white; padding: 0; }
          .invoice-page { box-shadow: none !important; max-width: 100% !important; }
        }
      `}</style>

      {/* Barra de control */}
      <div className="no-print" style={{backgroundColor:'#0b0f19',padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <Link href="/dashboard" style={{display:'flex',alignItems:'center',gap:8,color:'#9ca3af',textDecoration:'none',fontSize:14}}>
          <ArrowLeft size={16}/> Volver al Dashboard
        </Link>
        <button onClick={() => window.print()} style={{display:'flex',alignItems:'center',gap:8,backgroundColor:'#2563eb',color:'white',border:'none',borderRadius:8,padding:'8px 20px',fontSize:14,fontWeight:600,cursor:'pointer'}}>
          <Printer size={16}/> Imprimir / Guardar PDF
        </button>
      </div>

      {/* Fondo gris para vista previa */}
      <div className="invoice-wrap" style={{backgroundColor:'#e5e7eb',minHeight:'100vh',padding:'32px 16px'}}>
        <div className="invoice-page" style={{maxWidth:820,margin:'0 auto',backgroundColor:'white',boxShadow:'0 10px 40px rgba(0,0,0,0.15)'}}>

          {/* ── CABECERA ─────────────────────────────────────────── */}
          <div style={{background:'linear-gradient(135deg, #0d1b3e 0%, #1a237e 50%, #0d47a1 100%)',padding:'32px 40px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              {/* Logo + empresa */}
              <div style={{display:'flex',alignItems:'center',gap:20}}>
                <img src="/logo.webp" alt="Medifibra" style={{width:110,height:75,objectFit:'contain',filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.4))'}}/>
                <div>
                  <div style={{color:'white',fontSize:30,fontWeight:900,letterSpacing:3,lineHeight:1}}>MEDIFIBRA</div>
                  <div style={{color:'#90caf9',fontSize:11,marginTop:4}}>S.A.S — NIT: 901.XXX.XXX-X</div>
                  <div style={{color:'#90caf9',fontSize:11,marginTop:2}}>Proveedor de Internet Fibra Óptica</div>
                  <div style={{color:'#90caf9',fontSize:11,marginTop:2}}>📍 Medellín, Antioquia, Colombia</div>
                </div>
              </div>
              {/* Info factura */}
              <div style={{textAlign:'right'}}>
                <div style={{color:'#bbdefb',fontSize:11,letterSpacing:2,textTransform:'uppercase',marginBottom:4}}>Factura de Servicio</div>
                <div style={{color:'white',fontSize:26,fontWeight:900,letterSpacing:1}}>{invoiceNum}</div>
                <div style={{color:'#90caf9',fontSize:12,marginTop:6}}>Fecha: {dateStr}</div>
                <div style={{color:'#90caf9',fontSize:12,marginTop:2}}>Período: {period}</div>
                <div style={{
                  marginTop:10,display:'inline-block',
                  backgroundColor: client.status==='active'?'#2e7d32':'#b71c1c',
                  color:'white',borderRadius:4,padding:'3px 12px',fontSize:11,fontWeight:700,letterSpacing:1
                }}>
                  {client.status==='active'?'● SERVICIO ACTIVO':'● SERVICIO SUSPENDIDO'}
                </div>
              </div>
            </div>
          </div>

          {/* ── INFO CLIENTE + FACTURACIÓN ───────────────────────── */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',borderBottom:'2px solid #e8eaf6'}}>
            <div style={{padding:'24px 40px',borderRight:'1px solid #e8eaf6'}}>
              <div style={{fontSize:10,fontWeight:700,color:'#1565c0',letterSpacing:2,textTransform:'uppercase',marginBottom:14}}>Información del Cliente</div>
              <div style={{fontSize:18,fontWeight:800,color:'#0d1b3e',marginBottom:10}}>{client.name}</div>
              {client.address && (
                <div style={{fontSize:12,color:'#555',marginBottom:5,display:'flex',gap:6,alignItems:'flex-start'}}>
                  <span>📍</span><span>{client.address}{client.neighborhood?`, Barrio ${client.neighborhood}`:''}</span>
                </div>
              )}
              {client.city && (
                <div style={{fontSize:12,color:'#555',marginBottom:5,display:'flex',gap:6}}>
                  <span>🏙️</span><span>{client.city}{client.commune?` — Comuna ${client.commune}`:''}</span>
                </div>
              )}
              <div style={{fontSize:12,color:'#555',marginBottom:5,display:'flex',gap:6}}>
                <span>📱</span><span style={{fontWeight:600}}>{client.cellphone}</span>
              </div>
              {client.phone && <div style={{fontSize:12,color:'#555',marginBottom:5,display:'flex',gap:6}}><span>📞</span><span>{client.phone}</span></div>}
              {client.email && <div style={{fontSize:12,color:'#555',display:'flex',gap:6}}><span>✉️</span><span>{client.email}</span></div>}
            </div>
            <div style={{padding:'24px 40px'}}>
              <div style={{fontSize:10,fontWeight:700,color:'#1565c0',letterSpacing:2,textTransform:'uppercase',marginBottom:14}}>Detalles de Cobro</div>
              {[
                { label:'N° de Factura',       value: invoiceNum,                  highlight: true  },
                { label:'Período facturado',   value: period,                      highlight: false },
                { label:'Fecha de emisión',    value: dateStr,                     highlight: false },
                { label:'Fecha límite de pago',value: dueDate,                     highlight: false, red: true },
                ...(client.reference?[{ label:'Referencia / Llave', value: client.reference, highlight: false }]:[]),
              ].map((row,i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,paddingBottom:10,borderBottom:'1px solid #f0f0f0'}}>
                  <span style={{fontSize:12,color:'#777'}}>{row.label}</span>
                  <span style={{fontSize:12,fontWeight:700,color:row.red?'#c62828':row.highlight?'#1565c0':'#333'}}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── TABLA DE SERVICIOS ───────────────────────────────── */}
          <div style={{padding:'28px 40px 20px'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#1565c0',letterSpacing:2,textTransform:'uppercase',marginBottom:16}}>Detalle de Servicios</div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style={{backgroundColor:'#0d1b3e'}}>
                  <th style={{padding:'12px 16px',textAlign:'left',  color:'white',fontWeight:600,fontSize:11}}>Descripción del Servicio</th>
                  <th style={{padding:'12px 16px',textAlign:'center', color:'white',fontWeight:600,fontSize:11}}>Velocidad</th>
                  <th style={{padding:'12px 16px',textAlign:'center', color:'white',fontWeight:600,fontSize:11}}>Período</th>
                  <th style={{padding:'12px 16px',textAlign:'right',  color:'white',fontWeight:600,fontSize:11}}>Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{backgroundColor:'#f8f9ff',borderBottom:'1px solid #e8eaf6'}}>
                  <td style={{padding:'16px',verticalAlign:'top'}}>
                    <div style={{fontWeight:700,color:'#0d1b3e',fontSize:14}}>Internet Fibra Óptica — {client.plan}</div>
                    <div style={{fontSize:11,color:'#666',marginTop:4}}>Servicio residencial de alta velocidad · Conéctate con velocidad real</div>
                  </td>
                  <td style={{padding:'16px',textAlign:'center',color:'#333',fontWeight:600}}>{client.plan.match(/\d+/)?.[0] ?? '—'} Mbps</td>
                  <td style={{padding:'16px',textAlign:'center',color:'#555',fontSize:12}}>{period}</td>
                  <td style={{padding:'16px',textAlign:'right',fontSize:16,fontWeight:800,color:'#0d1b3e'}}>{formatCurrency(client.plan_value)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{padding:'0'}}/>
                  <td style={{padding:'16px 16px 8px',textAlign:'right',fontSize:12,color:'#777',fontWeight:600}}>Subtotal</td>
                  <td style={{padding:'16px 16px 8px',textAlign:'right',fontSize:14,fontWeight:700,color:'#333'}}>{formatCurrency(client.plan_value)}</td>
                </tr>
                <tr style={{borderTop:'3px solid #0d1b3e',backgroundColor:'#f0f4ff'}}>
                  <td colSpan={2}/>
                  <td style={{padding:'14px 16px',textAlign:'right',fontSize:14,fontWeight:800,color:'#0d1b3e'}}>TOTAL A PAGAR</td>
                  <td style={{padding:'14px 16px',textAlign:'right',fontSize:22,fontWeight:900,color:'#0d1b3e'}}>{formatCurrency(client.plan_value)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── MÉTODOS DE PAGO ──────────────────────────────────── */}
          <div style={{margin:'0 40px 28px',padding:20,backgroundColor:'#f0f4ff',borderRadius:10,border:'1px solid #c5cae9'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#1565c0',letterSpacing:2,textTransform:'uppercase',marginBottom:16}}>Canales de Pago Disponibles</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>

              {/* BANCOLOMBIA */}
              <div style={{backgroundColor:'white',borderRadius:8,padding:16,border:'1px solid #e0e0e0',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <div style={{width:36,height:36,backgroundColor:'#ffb300',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{color:'white',fontWeight:900,fontSize:14}}>B</span>
                  </div>
                  <div>
                    <div style={{fontWeight:800,fontSize:13,color:'#333'}}>Bancolombia</div>
                    <div style={{fontSize:10,color:'#888'}}>Transferencia / PSE</div>
                  </div>
                </div>
                <div style={{fontSize:10,color:'#999',marginBottom:2}}>Tipo de cuenta</div>
                <div style={{fontSize:12,fontWeight:600,color:'#333',marginBottom:8}}>Cuenta de Ahorros</div>
                <div style={{fontSize:10,color:'#999',marginBottom:2}}>Número de cuenta</div>
                <div style={{fontSize:15,fontWeight:800,color:'#0d1b3e',letterSpacing:1,marginBottom:8}}>XXX-XXXXXX-XX</div>
                <div style={{fontSize:10,color:'#999',marginBottom:2}}>A nombre de</div>
                <div style={{fontSize:11,fontWeight:600,color:'#333'}}>Medifibra S.A.S</div>
              </div>

              {/* NEQUI */}
              <div style={{backgroundColor:'white',borderRadius:8,padding:16,border:'1px solid #e0e0e0',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <div style={{width:36,height:36,backgroundColor:'#6c1fc8',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{color:'white',fontWeight:900,fontSize:14}}>N</span>
                  </div>
                  <div>
                    <div style={{fontWeight:800,fontSize:13,color:'#333'}}>Nequi</div>
                    <div style={{fontSize:10,color:'#888'}}>Pago inmediato</div>
                  </div>
                </div>
                <div style={{fontSize:10,color:'#999',marginBottom:2}}>Número Nequi</div>
                <div style={{fontSize:18,fontWeight:800,color:'#6c1fc8',letterSpacing:1,marginBottom:8}}>333 728 8745</div>
                <div style={{fontSize:10,color:'#999',marginBottom:2}}>A nombre de</div>
                <div style={{fontSize:11,fontWeight:600,color:'#333',marginBottom:6}}>Medifibra S.A.S</div>
                <div style={{fontSize:10,color:'#888',fontStyle:'italic'}}>Envíe comprobante al WhatsApp</div>
              </div>

              {/* BRE-B */}
              <div style={{backgroundColor:'white',borderRadius:8,padding:16,border:'1px solid #e0e0e0',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <div style={{width:36,height:36,backgroundColor:'#1b5e20',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{color:'white',fontWeight:900,fontSize:12}}>B²</span>
                  </div>
                  <div>
                    <div style={{fontWeight:800,fontSize:13,color:'#333'}}>Bre-B</div>
                    <div style={{fontSize:10,color:'#888'}}>Transferencia inmediata</div>
                  </div>
                </div>
                <div style={{fontSize:10,color:'#999',marginBottom:2}}>Llave / Referencia de pago</div>
                <div style={{fontSize:15,fontWeight:800,color:'#1b5e20',letterSpacing:1,marginBottom:8,wordBreak:'break-all'}}>
                  {client.reference || '— Sin referencia asignada —'}
                </div>
                <div style={{fontSize:10,color:'#999',marginBottom:2}}>A nombre de</div>
                <div style={{fontSize:11,fontWeight:600,color:'#333',marginBottom:6}}>Medifibra S.A.S</div>
                <div style={{fontSize:10,color:'#888',fontStyle:'italic'}}>Pago disponible 24/7</div>
              </div>
            </div>
          </div>

          {/* ── FOOTER ───────────────────────────────────────────── */}
          <div style={{backgroundColor:'#0d1b3e',padding:'18px 40px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{color:'#90caf9',fontSize:10,letterSpacing:1,marginBottom:4}}>CONTACTO Y SOPORTE</div>
              <div style={{color:'white',fontSize:14,fontWeight:700}}>📱 WhatsApp: 333 728 8745</div>
              <div style={{color:'#90caf9',fontSize:10,marginTop:3}}>Medellín, Antioquia, Colombia</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{color:'white',fontSize:20,fontWeight:900,letterSpacing:3}}>MEDIFIBRA</div>
              <div style={{color:'#90caf9',fontSize:10,marginTop:3}}>Conéctate con velocidad real</div>
              <div style={{color:'#546e7a',fontSize:9,marginTop:4}}>Generado: {now.toLocaleString('es-CO')}</div>
            </div>
          </div>

          {/* Nota final */}
          <div style={{padding:'10px 40px',backgroundColor:'#fff9c4',borderTop:'3px solid #f9a825',textAlign:'center'}}>
            <p style={{fontSize:10,color:'#555',lineHeight:1.6}}>
              Al realizar el pago, envíe el comprobante al WhatsApp <strong>333 728 8745</strong> indicando nombre completo y número de factura <strong>{invoiceNum}</strong>.
              Gracias por su pago puntual — <strong>Medifibra S.A.S</strong>
            </p>
          </div>

        </div>
      </div>
    </>
  )
}
