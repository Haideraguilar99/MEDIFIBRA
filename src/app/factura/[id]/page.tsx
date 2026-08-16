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

const NequiLogo = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="36" height="36" rx="8" fill="#2D0A4E"/>
    <rect x="7" y="7" width="7" height="7" rx="2" fill="#E91E8C"/>
    <text x="12" y="28" fontFamily="Arial" fontWeight="900" fontSize="18" fill="white">N</text>
  </svg>
)

const BancolombiaLogo = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="36" height="36" rx="8" fill="#FDDA24"/>
    <rect x="8" y="13" width="20" height="3.5" rx="1.5" fill="#1A1A1A"/>
    <rect x="8" y="19" width="20" height="3.5" rx="1.5" fill="#1A1A1A"/>
    <path d="M8 25 Q18 29 28 25" stroke="#E8380D" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <path d="M8 25 Q18 29 28 25" stroke="#8B1AE8" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeDasharray="6 6"/>
    <path d="M8 25 Q18 29 28 25" stroke="#FDDA24" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeDasharray="4 8" strokeDashoffset="4"/>
  </svg>
)

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
      <p style={{color:'#6b7280',fontFamily:'Arial',fontSize:16}}>Cargando factura...</p>
    </div>
  )
  if (!client) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'#f3f4f6'}}>
      <p style={{color:'#ef4444',fontFamily:'Arial',fontSize:16}}>Cliente no encontrado</p>
    </div>
  )

  const dueDate = client.payment_date
    ? new Date(client.payment_date + 'T12:00:00').toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })
    : 'Según acuerdo'

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; background: #e5e7eb; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .invoice-wrap { background: white; padding: 0; }
          .invoice-page { box-shadow: none !important; max-width: 100% !important; }
        }
      `}</style>

      {/* Barra de control */}
      <div className="no-print" style={{backgroundColor:'#0b0f19',padding:'14px 28px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <Link href="/dashboard" style={{display:'flex',alignItems:'center',gap:8,color:'#9ca3af',textDecoration:'none',fontSize:14}}>
          <ArrowLeft size={16}/> Volver al Dashboard
        </Link>
        <button onClick={() => window.print()} style={{display:'flex',alignItems:'center',gap:8,backgroundColor:'#2563eb',color:'white',border:'none',borderRadius:8,padding:'10px 24px',fontSize:14,fontWeight:600,cursor:'pointer'}}>
          <Printer size={16}/> Imprimir / Guardar PDF
        </button>
      </div>

      <div className="invoice-wrap" style={{minHeight:'100vh',padding:'36px 16px'}}>
        <div className="invoice-page" style={{maxWidth:860,margin:'0 auto',backgroundColor:'white',boxShadow:'0 10px 40px rgba(0,0,0,0.15)'}}>

          {/* ── CABECERA ── */}
          <div style={{background:'linear-gradient(135deg,#0d1b3e 0%,#1a237e 50%,#0d47a1 100%)',padding:'36px 44px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:20}}>
                <img src="/logo.png" alt="Medifibra" style={{width:120,height:80,objectFit:'contain',filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.4))'}}/>
                <div>
                  <div style={{color:'white',fontSize:32,fontWeight:900,letterSpacing:3,lineHeight:1}}>MEDIFIBRA</div>
                  <div style={{color:'#90caf9',fontSize:12,marginTop:5}}>S.A.S — NIT: 902060057-8</div>
                  <div style={{color:'#90caf9',fontSize:12,marginTop:3}}>Proveedor de Internet Fibra Optica</div>
                  <div style={{color:'#90caf9',fontSize:12,marginTop:3}}>Medellin, Antioquia, Colombia</div>
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{color:'#bbdefb',fontSize:11,letterSpacing:2,textTransform:'uppercase',marginBottom:6}}>Factura de Servicio</div>
                <div style={{color:'white',fontSize:28,fontWeight:900,letterSpacing:1}}>{invoiceNum}</div>
                <div style={{color:'#90caf9',fontSize:13,marginTop:8}}>Fecha: {dateStr}</div>
                <div style={{color:'#90caf9',fontSize:13,marginTop:3}}>Periodo: {period}</div>
                <div style={{marginTop:12,display:'inline-block',backgroundColor:client.status==='active'?'#2e7d32':'#b71c1c',color:'white',borderRadius:4,padding:'4px 14px',fontSize:12,fontWeight:700,letterSpacing:1}}>
                  {client.status==='active'?'SERVICIO ACTIVO':'SERVICIO SUSPENDIDO'}
                </div>
              </div>
            </div>
          </div>

          {/* ── INFO CLIENTE + DETALLES ── */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',borderBottom:'2px solid #e8eaf6'}}>
            <div style={{padding:'28px 44px',borderRight:'1px solid #e8eaf6'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#1565c0',letterSpacing:2,textTransform:'uppercase',marginBottom:16}}>Informacion del Cliente</div>
              <div style={{fontSize:20,fontWeight:800,color:'#0d1b3e',marginBottom:12,lineHeight:1.3}}>{client.name}</div>
              {client.address && (
                <div style={{fontSize:13,color:'#555',marginBottom:7,display:'flex',gap:8,alignItems:'flex-start'}}>
                  <span style={{color:'#1565c0',fontWeight:700,flexShrink:0}}>Dir:</span>
                  <span>{client.address}{client.neighborhood ? `, Barrio ${client.neighborhood}` : ''}</span>
                </div>
              )}
              {client.city && (
                <div style={{fontSize:13,color:'#555',marginBottom:7,display:'flex',gap:8}}>
                  <span style={{color:'#1565c0',fontWeight:700,flexShrink:0}}>Ciudad:</span>
                  <span>{client.city}{client.commune ? ` — Comuna ${client.commune}` : ''}</span>
                </div>
              )}
              <div style={{fontSize:13,color:'#555',marginBottom:7,display:'flex',gap:8}}>
                <span style={{color:'#1565c0',fontWeight:700,flexShrink:0}}>Cel:</span>
                <span style={{fontWeight:600}}>{client.cellphone}</span>
              </div>
              {client.phone && (
                <div style={{fontSize:13,color:'#555',marginBottom:7,display:'flex',gap:8}}>
                  <span style={{color:'#1565c0',fontWeight:700,flexShrink:0}}>Tel:</span>
                  <span>{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div style={{fontSize:13,color:'#555',display:'flex',gap:8}}>
                  <span style={{color:'#1565c0',fontWeight:700,flexShrink:0}}>Email:</span>
                  <span>{client.email}</span>
                </div>
              )}
            </div>
            <div style={{padding:'28px 44px'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#1565c0',letterSpacing:2,textTransform:'uppercase',marginBottom:16}}>Detalles de Cobro</div>
              {[
                { label:'N de Factura',        value: invoiceNum, highlight: true  },
                { label:'Periodo facturado',   value: period,     highlight: false },
                { label:'Fecha de emision',    value: dateStr,    highlight: false },
                { label:'Fecha limite de pago',value: dueDate,    highlight: false, red: true },
                ...(client.reference ? [{ label:'Referencia / Llave', value: client.reference, highlight: false, red: false }] : []),
              ].map((row,i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,paddingBottom:12,borderBottom:'1px solid #f0f0f0'}}>
                  <span style={{fontSize:13,color:'#777'}}>{row.label}</span>
                  <span style={{fontSize:13,fontWeight:700,color:row.red?'#c62828':row.highlight?'#1565c0':'#333'}}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── TABLA DE SERVICIOS ── */}
          <div style={{padding:'32px 44px 24px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#1565c0',letterSpacing:2,textTransform:'uppercase',marginBottom:18}}>Detalle de Servicios</div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
              <thead>
                <tr style={{backgroundColor:'#0d1b3e'}}>
                  <th style={{padding:'14px 18px',textAlign:'left',  color:'white',fontWeight:600,fontSize:12}}>Descripcion del Servicio</th>
                  <th style={{padding:'14px 18px',textAlign:'center', color:'white',fontWeight:600,fontSize:12}}>Velocidad</th>
                  <th style={{padding:'14px 18px',textAlign:'center', color:'white',fontWeight:600,fontSize:12}}>Periodo</th>
                  <th style={{padding:'14px 18px',textAlign:'right',  color:'white',fontWeight:600,fontSize:12}}>Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{backgroundColor:'#f8f9ff',borderBottom:'1px solid #e8eaf6'}}>
                  <td style={{padding:'18px',verticalAlign:'top'}}>
                    <div style={{fontWeight:700,color:'#0d1b3e',fontSize:15}}>
                      Internet Fibra Optica — {client.plan}
                      {client.plan_value > 95000 ? ' + TV' : ''}
                    </div>
                    <div style={{fontSize:12,color:'#666',marginTop:5}}>Servicio residencial de alta velocidad — Conectate con velocidad real</div>
                  </td>
                  <td style={{padding:'18px',textAlign:'center',color:'#333',fontWeight:600,fontSize:14}}>{client.plan.match(/\d+/)?.[0] ?? '—'} Mbps</td>
                  <td style={{padding:'18px',textAlign:'center',color:'#555',fontSize:13}}>{period}</td>
                  <td style={{padding:'18px',textAlign:'right',fontSize:18,fontWeight:800,color:'#0d1b3e'}}>{formatCurrency(client.plan_value)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}/>
                  <td style={{padding:'16px 18px 8px',textAlign:'right',fontSize:13,color:'#777',fontWeight:600}}>Subtotal</td>
                  <td style={{padding:'16px 18px 8px',textAlign:'right',fontSize:15,fontWeight:700,color:'#333'}}>{formatCurrency(client.plan_value)}</td>
                </tr>
                <tr style={{borderTop:'3px solid #0d1b3e',backgroundColor:'#f0f4ff'}}>
                  <td colSpan={2}/>
                  <td style={{padding:'16px 18px',textAlign:'right',fontSize:15,fontWeight:800,color:'#0d1b3e'}}>TOTAL A PAGAR</td>
                  <td style={{padding:'16px 18px',textAlign:'right',fontSize:26,fontWeight:900,color:'#0d1b3e'}}>{formatCurrency(client.plan_value)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── METODOS DE PAGO ── */}
          <div style={{margin:'0 44px 32px',padding:24,backgroundColor:'#f0f4ff',borderRadius:10,border:'1px solid #c5cae9'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#1565c0',letterSpacing:2,textTransform:'uppercase',marginBottom:20}}>Canales de Pago Disponibles</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>

              {/* BANCOLOMBIA */}
              <div style={{backgroundColor:'white',borderRadius:10,padding:18,border:'1px solid #e0e0e0',boxShadow:'0 2px 6px rgba(0,0,0,0.07)'}}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                  <BancolombiaLogo/>
                  <div>
                    <div style={{fontWeight:800,fontSize:14,color:'#333'}}>Bancolombia</div>
                    <div style={{fontSize:11,color:'#888'}}>Transferencia / PSE</div>
                  </div>
                </div>
                <div style={{fontSize:11,color:'#999',marginBottom:3}}>Tipo de cuenta</div>
                <div style={{fontSize:13,fontWeight:600,color:'#333',marginBottom:10}}>Cuenta de Ahorros</div>
                <div style={{fontSize:11,color:'#999',marginBottom:3}}>Numero de cuenta</div>
                <div style={{fontSize:16,fontWeight:800,color:'#0d1b3e',letterSpacing:1,marginBottom:10}}>009-952025-14</div>
                <div style={{fontSize:11,color:'#999',marginBottom:3}}>A nombre de</div>
                <div style={{fontSize:12,fontWeight:600,color:'#333'}}>Medifibra S.A.S</div>
              </div>

              {/* NEQUI */}
              <div style={{backgroundColor:'white',borderRadius:10,padding:18,border:'1px solid #e0e0e0',boxShadow:'0 2px 6px rgba(0,0,0,0.07)'}}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                  <NequiLogo/>
                  <div>
                    <div style={{fontWeight:800,fontSize:14,color:'#333'}}>Nequi</div>
                    <div style={{fontSize:11,color:'#888'}}>Pago inmediato</div>
                  </div>
                </div>
                <div style={{fontSize:11,color:'#999',marginBottom:3}}>Numero Nequi</div>
                <div style={{fontSize:18,fontWeight:800,color:'#2D0A4E',letterSpacing:1,marginBottom:10}}>301 508 0961</div>
                <div style={{fontSize:11,color:'#999',marginBottom:3}}>A nombre de</div>
                <div style={{fontSize:12,fontWeight:600,color:'#333',marginBottom:8}}>Medifibra S.A.S</div>
                <div style={{fontSize:11,color:'#888',fontStyle:'italic'}}>Envie comprobante al WhatsApp</div>
              </div>

              {/* BRE-B */}
              <div style={{backgroundColor:'white',borderRadius:10,padding:18,border:'1px solid #e0e0e0',boxShadow:'0 2px 6px rgba(0,0,0,0.07)'}}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                  <div style={{width:36,height:36,backgroundColor:'#1b5e20',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{color:'white',fontWeight:900,fontSize:13}}>B2</span>
                  </div>
                  <div>
                    <div style={{fontWeight:800,fontSize:14,color:'#333'}}>Bre-B</div>
                    <div style={{fontSize:11,color:'#888'}}>Transferencia inmediata</div>
                  </div>
                </div>
                <div style={{fontSize:11,color:'#999',marginBottom:3}}>Llave / Referencia de pago</div>
                <div style={{fontSize:14,fontWeight:800,color:'#1b5e20',letterSpacing:1,marginBottom:10,wordBreak:'break-all'}}>
                  {client.reference || '— Sin referencia asignada —'}
                </div>
                <div style={{fontSize:11,color:'#999',marginBottom:3}}>A nombre de</div>
                <div style={{fontSize:12,fontWeight:600,color:'#333',marginBottom:8}}>Medifibra S.A.S</div>
                <div style={{fontSize:11,color:'#888',fontStyle:'italic'}}>Pago disponible 24/7</div>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{backgroundColor:'#0d1b3e',padding:'20px 44px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{color:'#90caf9',fontSize:11,letterSpacing:1,marginBottom:5,textTransform:'uppercase'}}>Contacto y Soporte</div>
              <div style={{color:'white',fontSize:15,fontWeight:700}}>WhatsApp: 333 728 8745</div>
              <div style={{color:'#90caf9',fontSize:11,marginTop:4}}>Medellin, Antioquia, Colombia</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{color:'white',fontSize:22,fontWeight:900,letterSpacing:3}}>MEDIFIBRA</div>
              <div style={{color:'#90caf9',fontSize:11,marginTop:4}}>Conectate con velocidad real</div>
              <div style={{color:'#546e7a',fontSize:10,marginTop:5}}>Generado: {now.toLocaleString('es-CO')}</div>
            </div>
          </div>

          {/* Nota final */}
          <div style={{padding:'12px 44px',backgroundColor:'#fff9c4',borderTop:'3px solid #f9a825',textAlign:'center'}}>
            <p style={{fontSize:12,color:'#555',lineHeight:1.7}}>
              Al realizar el pago, envie el comprobante al WhatsApp <strong>333 728 8745</strong> indicando nombre completo y numero de factura <strong>{invoiceNum}</strong>. Gracias por su pago puntual — <strong>Medifibra S.A.S</strong>
            </p>
          </div>

        </div>
      </div>
    </>
  )
}
