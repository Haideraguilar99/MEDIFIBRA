'use client'
import { useEffect, useState, useCallback, useMemo, memo } from 'react'
import { PLANS, TV_PLAN, formatCurrency } from '@/lib/plans'
import { Wifi, Users, UserCheck, UserX, DollarSign, Plus, Trash2, Pencil, X, Tv,
         CreditCard, CheckCircle, Clock, BarChart2, AlertCircle, FileText, LogOut,
         Phone, MapPin, Calendar, UserPlus, Image, Sun, Moon, MessageCircle } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import NotificationBell from '@/components/NotificationBell'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

type Client = {
  id: number; name: string; email: string; phone: string; cellphone: string
  address: string; city: string; neighborhood: string; commune: string
  consumption_date: string; payment_date: string; plan: string; plan_value: number
  reference: string; status: string; classification: string; notes: string; created_at: string
  cedula: string; punto_referencia: string; foto_fachada: string
  telefono_alternativo: string; fecha_instalacion: string
  incluye_tv: number; dia_pago: string
  referido_nombre: string; referido_telefono: string
}
type Payment = {
  id: number; client_id: number; amount: number; period: string
  method: string; status: string; notes: string; created_at: string
  client_name: string; plan: string; cellphone: string
}
type Stats        = { total: number; active: number; suspended: number; monthly_income: number }
type PaymentStats = { total: number; total_amount: number; paid_amount: number; pending_amount: number }
type ClassStat    = { classification: string; n: number }
type ReportData   = {
  byMonth:        { month: string; total: number; count: number }[]
  byMethod:       { method: string; count: number; total: number }[]
  byPlan:         { plan: string; count: number; potential: number }[]
  pendingClients: { id: number; name: string; cellphone: string; plan: string; plan_value: number; payment_date: string }[]
}

const BLUE = '#2563eb'

const CLASSIFICATIONS = [
  'AL DÍA','PRÓXIMO A PAGAR','RECORDAR ENVIAR RECIBO',
  'DEBE MUCHO – RECOGER EQUIPO','DEUDA PENDIENTE','NOVEDAD DE PAGO',
  'NO PAGA – AUTORIZADO','SUSPENDIDO','USUARIO PERDIDO',
] as const
type Classification = typeof CLASSIFICATIONS[number]

const CLASS_CONFIG: Record<Classification, { bg:string; text:string; border:string; label:string }> = {
  'AL DÍA':                      { bg:'#052e16', text:'#4ade80', border:'#166534', label:'Al día'             },
  'PRÓXIMO A PAGAR':             { bg:'#1c1917', text:'#fdba74', border:'#9a3412', label:'Próximo a pagar'    },
  'RECORDAR ENVIAR RECIBO':      { bg:'#1c1400', text:'#fcd34d', border:'#92400e', label:'Enviar recibo'      },
  'DEBE MUCHO – RECOGER EQUIPO': { bg:'#2d0a0a', text:'#f87171', border:'#991b1b', label:'Recoger equipo'    },
  'DEUDA PENDIENTE':             { bg:'#2d0a0a', text:'#fca5a5', border:'#7f1d1d', label:'Deuda pendiente'    },
  'NOVEDAD DE PAGO':             { bg:'#1a0533', text:'#c084fc', border:'#6b21a8', label:'Novedad de pago'    },
  'NO PAGA – AUTORIZADO':        { bg:'#022c3a', text:'#22d3ee', border:'#164e63', label:'No paga autorizado' },
  'SUSPENDIDO':                  { bg:'#0f1e3a', text:'#60a5fa', border:'#1e3a8a', label:'Suspendido'         },
  'USUARIO PERDIDO':             { bg:'#1a1f2e', text:'#9ca3af', border:'#374151', label:'Usuario perdido'    },
}
function getCC(cls: string) {
  return CLASS_CONFIG[cls as Classification] ?? { bg:'#1a1f2e', text:'#9ca3af', border:'#374151', label: cls }
}

const ClassBadge = ({ cls, size='sm' }:{ cls:string; size?:'xs'|'sm' }) => {
  const c = getCC(cls)
  return (
    <span className={`inline-flex items-center font-semibold rounded-full whitespace-nowrap ${size==='xs'?'px-2 py-0.5 text-xs':'px-3 py-1.5 text-sm'}`}
      style={{ backgroundColor:c.bg, color:c.text, border:`1px solid ${c.border}` }}>
      {c.label}
    </span>
  )
}

const SectionHeader = ({ icon, title }:{ icon:React.ReactNode; title:string }) => (
  <div className="md:col-span-2 flex items-center gap-2 mt-2 mb-1 pb-2" style={{borderBottom:'1px solid #1e2533'}}>
    <span style={{color:BLUE}}>{icon}</span>
    <span className="text-sm font-semibold uppercase tracking-wider" style={{color:'#9ca3af'}}>{title}</span>
  </div>
)

const EMPTY_CLIENT = {
  name:'', email:'', phone:'', cellphone:'', address:'', city:'',
  neighborhood:'', commune:'', consumption_date:'', payment_date:'',
  plan:'', plan_value:0, reference:'', status:'active', classification:'AL DÍA', notes:'',
  cedula:'', punto_referencia:'', foto_fachada:'', telefono_alternativo:'',
  fecha_instalacion:'', incluye_tv:0, dia_pago:'30',
  referido_nombre:'', referido_telefono:'',
}
const EMPTY_PAYMENT = { client_id:0, amount:0, period:'', method:'efectivo', status:'paid', notes:'' }
const METHODS = ['efectivo','transferencia','nequi','daviplata','bancolombia']

export default function Dashboard() {
  const router = useRouter()
  const [dark, setDark] = useState(true)

  const BG    = dark ? '#0b0f19' : '#f0f4f8'
  const BG2   = dark ? '#0f1420' : '#ffffff'
  const CARD  = dark ? '#131920' : '#ffffff'
  const CARD2 = dark ? '#161d28' : '#e8edf2'
  const BORDER= dark ? '#1e2533' : '#cbd5e1'
  const MUTED = dark ? '#6b7280' : '#64748b'
  const LIGHT = dark ? '#9ca3af' : '#334155'
  const TEXT  = dark ? '#ffffff' : '#0f172a'
  const [clients,      setClients]      = useState<Client[]>([])
  const [payments,     setPayments]     = useState<Payment[]>([])
  const [stats,        setStats]        = useState<Stats>({ total:0, active:0, suspended:0, monthly_income:0 })
  const [payStats,     setPayStats]     = useState<PaymentStats>({ total:0, total_amount:0, paid_amount:0, pending_amount:0 })
  const [classStats,   setClassStats]   = useState<ClassStat[]>([])
  const [reports,      setReports]      = useState<ReportData|null>(null)
  const [showModal,    setShowModal]    = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [editClient,   setEditClient]   = useState<Client|null>(null)
  const [editPayment,  setEditPayment]  = useState<Payment|null>(null)
  const [form,         setForm]         = useState(EMPTY_CLIENT)
  const [payForm,      setPayForm]      = useState(EMPTY_PAYMENT)
  const [sseStatus,    setSseStatus]    = useState<'connecting'|'connected'|'error'>('connecting')
  const [dbStatus,     setDbStatus]     = useState<'checking'|'ok'|'error'>('checking')
  const [tab,          setTab]          = useState<'dashboard'|'plans'|'clients'|'payments'|'reports'>('dashboard')
  const [search,       setSearch]       = useState('')
  const [filterPlan,   setFilterPlan]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClass,  setFilterClass]  = useState('')

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients')
      if (!res.ok) { setDbStatus('error'); return }
      const data = await res.json()
      setClients(data.clients ?? [])
      setStats(data.stats ?? { total:0, active:0, suspended:0, monthly_income:0 })
      setClassStats(data.byClassification ?? [])
      setDbStatus('ok')
    } catch { setDbStatus('error') }
  }, [])

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch('/api/payments')
      if (!res.ok) return
      const data = await res.json()
      setPayments(data.payments ?? [])
      setPayStats(data.stats ?? { total:0, total_amount:0, paid_amount:0, pending_amount:0 })
    } catch {}
  }, [])

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/reports')
      if (!res.ok) return
      setReports(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    fetch('/api/init')
      .then(r => { if (r.ok) setDbStatus('ok'); else setDbStatus('error') })
      .catch(() => setDbStatus('error'))
      .finally(() => { fetchClients(); fetchPayments(); fetchReports() })
  }, [fetchClients, fetchPayments, fetchReports])

  useEffect(() => {
    setSseStatus('connecting')
    const es = new EventSource('/api/sse')
    es.addEventListener('connected',      () => setSseStatus('connected'))
    es.addEventListener('new-client',     e  => { const c=JSON.parse(e.data); setClients(p=>[c,...p]); toast.success('Nuevo cliente: '+c.name); fetchClients() })
    es.addEventListener('update-client',  e  => { const u=JSON.parse(e.data); setClients(p=>p.map(c=>c.id===u.id?u:c)); toast.success('Actualizado: '+u.name) })
    es.addEventListener('delete-client',  () => { fetchClients(); toast.success('Cliente eliminado') })
    es.addEventListener('new-payment',    e  => { const p=JSON.parse(e.data); setPayments(prev=>[p,...prev]); toast.success('Pago registrado: '+p.client_name); fetchPayments(); fetchReports() })
    es.addEventListener('update-payment', e  => { const u=JSON.parse(e.data); setPayments(p=>p.map(x=>x.id===u.id?u:x)); fetchReports() })
    es.addEventListener('delete-payment', () => { fetchPayments(); fetchReports(); toast.success('Pago eliminado') })
    es.onerror = () => setSseStatus('error')
    return () => es.close()
  }, [fetchClients, fetchPayments, fetchReports])

  const handleSaveClient = async () => {
    if (!form.name||!form.cellphone||!form.plan) { toast.error('Nombre, celular y plan son obligatorios'); return }
    const url = editClient ? `/api/clients/${editClient.id}` : '/api/clients'
    const res = await fetch(url, { method: editClient?'PUT':'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
    if (res.ok) { setShowModal(false); setEditClient(null); setForm(EMPTY_CLIENT); fetchClients() }
    else toast.error('Error al guardar cliente')
  }

  const handleSavePayment = async () => {
    if (!payForm.client_id||!payForm.amount||!payForm.period) { toast.error('Cliente, monto y período son obligatorios'); return }
    const url = editPayment ? `/api/payments/${editPayment.id}` : '/api/payments'
    const res = await fetch(url, { method: editPayment?'PUT':'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payForm) })
    if (res.ok) { setShowPayModal(false); setEditPayment(null); setPayForm(EMPTY_PAYMENT); fetchPayments(); fetchReports() }
    else toast.error('Error al guardar pago')
  }

  const handleDeleteClient  = async (id:number) => { if (!confirm('¿Eliminar este cliente?')) return; await fetch(`/api/clients/${id}`,{method:'DELETE'}); fetchClients() }
  const handleDeletePayment = async (id:number) => { if (!confirm('¿Eliminar este pago?')) return; await fetch(`/api/payments/${id}`,{method:'DELETE'}); fetchPayments(); fetchReports() }

  const openEditClient = (c:Client) => { setEditClient(c); setForm({...c, incluye_tv: Number(c.incluye_tv)}); setShowModal(true) }
  const openNewPayment = (clientId?:number) => {
    setEditPayment(null)
    const client = clientId ? clients.find(c=>c.id===clientId) : null
    setPayForm({ ...EMPTY_PAYMENT, client_id: clientId??0, amount: client?.plan_value??0, period: new Date().toISOString().slice(0,7) })
    setShowPayModal(true)
  }
  const openEditPayment = (p:Payment) => { setEditPayment(p); setPayForm({ client_id:p.client_id, amount:p.amount, period:p.period, method:p.method, status:p.status, notes:p.notes }); setShowPayModal(true) }
  const getPlanColor = (n:string) => PLANS.find(p=>p.name===n)?.color ?? '#64748b'
  const sendWhatsAppReminder = async (c: Client) => {
    const diaTexto = c.dia_pago ? `el dia ${c.dia_pago} de este mes` : 'proximamente'
    const valor = formatCurrency(c.plan_value)
    const cedula = c.cedula ? `CC ${c.cedula}` : 'sin cedula registrada'
    const lineas = [
      `Estimado(a) ${c.name},`,
      `${cedula}`,
      ``,
      `Le informamos que su factura del servicio de internet ${c.plan} por valor de ${valor} tiene fecha de pago ${diaTexto}.`,
      ``,
      `Medios de pago disponibles:`,
      ``,
      `Bancolombia - Cuenta de Ahorros`,
      `Numero: 009-952025-14`,
      `A nombre de: Medifibra S.A.S`,
      ``,
      `Nequi`,
      `Numero: 301 508 0961`,
      `A nombre de: Medifibra S.A.S`,
      ``,
      `Recuerde enviar el comprobante de pago al WhatsApp de Medifibra una vez realizada la transferencia.`,
      ``,
      `Gracias por preferirnos.`,
      `Medifibra S.A.S`,
    ].join('\n')
    const phone = (c.cellphone ?? '').replace(/\D/g, '')
    window.open(`https://wa.me/57${phone}?text=${encodeURIComponent(lineas)}`, '_blank')
    try {
      await fetch('/api/notifications/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: c.id,
          channel: 'whatsapp',
          type: 'payment_reminder',
          message: lineas,
          status: 'sent',
        }),
      })
    } catch {}
  }

  const filteredClients = clients.filter(c => {
    const q = search.toLowerCase()
    const ms = !q || c.name.toLowerCase().includes(q) || c.cellphone.includes(q) || c.cedula?.includes(q) || c.reference?.toLowerCase().includes(q) || c.neighborhood?.toLowerCase().includes(q)
    const mp = !filterPlan   || c.plan   === filterPlan
    const mst= !filterStatus || c.status === filterStatus
    const mc = !filterClass  || c.classification === filterClass
    return ms && mp && mst && mc
  })

  const handleLogout = async () => { await fetch('/api/auth/logout',{method:'POST'}); router.push('/login'); router.refresh() }

  const iStyle = useMemo(() => ({ backgroundColor:BG, border:`1px solid ${BORDER}`, color:TEXT }), [BG, BORDER, TEXT])
  const iCls   = "w-full rounded-lg px-3 py-2.5 text-base focus:outline-none transition-colors"

  const F = ({ label, children, span2=false }:{ label:string; children:React.ReactNode; span2?:boolean }) => (
    <div className={span2?'md:col-span-2':''}>
      <label className="block text-sm font-medium mb-1.5" style={{color:MUTED}}>{label}</label>
      {children}
    </div>
  )

  const StatusDot = ({ status, label }:{ status:string; label:string }) => {
    const ok=status==='ok'||status==='connected'; const err=status==='error'
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          {ok&&<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${ok?'bg-green-400':err?'bg-red-500':'bg-yellow-400'}`}/>
        </span>
        <span className={`text-xs ${ok?'text-green-400':err?'text-red-400':'text-yellow-400'}`}>{label}</span>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customTooltip = ({ active, payload, label }:any) => {
    if (active&&payload?.length) return (
      <div style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="px-3 py-2 rounded-lg text-sm">
        <p style={{color:MUTED}}>{label}</p>
        <p className="text-blue-400 font-bold">{formatCurrency(Number(payload[0]?.value??0))}</p>
      </div>
    )
    return null
  }

  const TABS = [
    {key:'dashboard',label:'Dashboard'},{key:'plans',label:'Planes'},
    {key:'clients',label:'Clientes'},{key:'payments',label:'Pagos'},{key:'reports',label:'Reportes'},
  ] as const

  const MetricCard = ({ label, value, icon, sub }:{ label:string; value:string|number; icon:React.ReactNode; sub?:string }) => (
    <div style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="rounded-xl p-3 sm:p-5 flex items-center gap-2 sm:gap-4 min-w-0 overflow-hidden">
      <div style={{backgroundColor:CARD2,color:LIGHT}} className="p-2 sm:p-3 rounded-lg flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight break-all" style={{color:TEXT}}>{value}</p>
        <p className="text-xs sm:text-sm mt-1 leading-tight" style={{color:MUTED}}>{label}</p>
        {sub&&<p className="text-xs mt-0.5" style={{color:BLUE}}>{sub}</p>}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{backgroundColor:BG, color:TEXT}}>
      <style>{'@keyframes mfPulse { 0%,100%{ opacity:1; text-shadow:0 0 8px rgba(220,38,38,0.9); } 50%{ opacity:0.35; text-shadow:none; } } .mf-pulse{ animation: mfPulse 1.4s ease-in-out infinite; }'}</style>
      {!dark && <style>{'.tw-white { color: #0f172a } .text-white { color: #0f172a !important } .text-green-400 { color: #15803d !important } .text-blue-400 { color: #1d4ed8 !important } .text-red-400 { color: #b91c1c !important } .text-yellow-400 { color: #a16207 !important } .bg-green-900\/40 { background-color: #dcfce7 !important } .bg-red-900\/40 { background-color: #fee2e2 !important } .bg-yellow-900\/40 { background-color: #fef9c3 !important }'}</style>}
      <Toaster position="top-right" toastOptions={{style:{background:CARD,color:TEXT,border:`1px solid ${BORDER}`}}}/>

      <header style={{backgroundColor:BG2,borderBottom:`1px solid ${BORDER}`}} className="px-3 md:px-6 py-3 flex items-center justify-between gap-2">
        <div>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@900&display=swap"/>
          <div className="flex items-baseline leading-none" style={{fontFamily:"'Nunito', sans-serif"}}>
            <span className="text-2xl sm:text-3xl font-black mf-pulse" style={{color:'#dc2626',letterSpacing:'0.04em'}}>M</span>
            <span className="text-2xl sm:text-3xl font-black" style={{color:TEXT,letterSpacing:'0.04em'}}>EDI</span>
            <span className="text-2xl sm:text-3xl font-black mf-pulse" style={{color:'#dc2626',letterSpacing:'0.04em'}}>F</span>
            <span className="text-2xl sm:text-3xl font-black" style={{color:TEXT,letterSpacing:'0.04em'}}>IBRA</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-1.5 mt-0.5">
            <span className="text-xs font-medium" style={{color:MUTED}}>NIT 902060057-8</span>
            <span className="text-xs" style={{color:BORDER}}>·</span>
            <span className="text-xs font-medium" style={{color:MUTED}}>Secretaria / Mariana</span>
            <span className="text-xs" style={{color:BORDER}}>·</span>
            <span className="text-xs font-medium" style={{color:MUTED}}>Medellín / Blanquizal</span>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/import" style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors">
            📥 Importar
          </Link>
          <div style={{backgroundColor:BG,border:`1px solid ${BORDER}`}} className="hidden sm:flex items-center gap-4 px-4 py-2 rounded-lg">
            <StatusDot status={dbStatus} label="Turso DB"/>
            <div style={{width:1,height:14,backgroundColor:BORDER}}/>
            <StatusDot status={sseStatus} label="SSE Live"/>
          </div>
          <NotificationBell dark={dark} BG={BG} BG2={BG2} CARD={CARD} BORDER={BORDER} MUTED={MUTED} TEXT={TEXT} LIGHT={LIGHT}/>
          <button onClick={()=>setDark(d=>!d)} style={{backgroundColor:CARD,border:`1px solid ${BORDER}`,color:LIGHT}} className="flex items-center justify-center w-9 h-9 rounded-lg hover:opacity-80 transition-opacity flex-shrink-0">
            {dark ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
          </button>
          <button onClick={handleLogout} style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4"/><span className="hidden sm:inline" style={{color:LIGHT}}>Salir</span>
          </button>
        </div>
      </header>

      <nav style={{backgroundColor:BG2,borderBottom:`1px solid ${BORDER}`}} className="px-4 md:px-6 flex gap-1 overflow-x-auto">
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            className={`px-4 md:px-5 py-3 text-base font-semibold border-b-2 whitespace-nowrap transition-colors ${tab===t.key?'border-blue-500 text-white':'border-transparent hover:text-white'}`}
            style={{color:tab===t.key?'white':MUTED}}>{t.label}
          </button>
        ))}
      </nav>

      <main className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-5">

        {/* ── DASHBOARD ── */}
        {tab==='dashboard'&&(
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              <MetricCard label="Total Clientes" value={stats.total}                             icon={<Users className="w-5 h-5"/>}/>
              <MetricCard label="Activos"         value={stats.active}                            icon={<UserCheck className="w-5 h-5"/>}/>
              <MetricCard label="Suspendidos"     value={stats.suspended}                         icon={<UserX className="w-5 h-5"/>}/>
              <MetricCard label="Ingresos / Mes"  value={formatCurrency(stats.monthly_income??0)} icon={<DollarSign className="w-5 h-5"/>}/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <MetricCard label="Total Cobrado"    value={formatCurrency(payStats.paid_amount??0)}    icon={<CheckCircle className="w-5 h-5"/>}/>
              <MetricCard label="Pendiente"         value={formatCurrency(payStats.pending_amount??0)} icon={<Clock className="w-5 h-5"/>}/>
              <MetricCard label="Pagos Registrados" value={payStats.total??0}                          icon={<CreditCard className="w-5 h-5"/>}/>
            </div>

            {classStats.length>0&&(
              <div style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="rounded-xl p-5">
                <h2 className="text-base font-semibold mb-4" style={{color:LIGHT}}>Estado de la Cartera — {stats.total} clientes</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {classStats.map(cs=>{
                    const cfg=getCC(cs.classification)
                    const pct=stats.total?Math.round((Number(cs.n)/stats.total)*100):0
                    return (
                      <button key={cs.classification}
                        onClick={()=>{setTab('clients');setFilterClass(cs.classification)}}
                        className="rounded-xl p-3 text-left transition-all hover:border-blue-500/50 active:scale-[0.98]"
                        style={{backgroundColor:CARD2,border:`1px solid ${BORDER}`}}>
                        <p className="text-xl font-bold" style={{color:BLUE}}>{cs.n}</p>
                        <p className="text-xs font-medium mt-0.5 leading-tight" style={{color:BLUE,opacity:.8}}>{cfg.label}</p>
                        <div className="mt-2 h-0.5 rounded-full" style={{backgroundColor:BORDER}}>
                          <div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:BLUE}}/>
                        </div>
                        <p className="text-xs mt-1" style={{color:MUTED}}>{pct}%</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="rounded-xl overflow-hidden">
                <div className="px-5 py-4" style={{borderBottom:`1px solid ${BORDER}`}}>
                  <h2 className="text-sm font-semibold" style={{color:LIGHT}}>Clientes Recientes</h2>
                </div>
                <table className="w-full text-sm">
                  <thead><tr style={{borderBottom:`1px solid ${BORDER}`}}>
                    {['Cliente','Estado'].map(h=><th key={h} className="text-left px-5 py-3 text-sm font-semibold uppercase tracking-wider" style={{color:MUTED}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {clients.slice(0,6).map(c=>(
                      <tr key={c.id} style={{borderBottom:`1px solid ${BORDER}`}} className="hover:bg-white/5">
                        <td className="px-5 py-2.5">
                          <p className="font-medium text-white text-sm truncate max-w-[180px]">{c.name}</p>
                          <p className="text-xs mt-0.5" style={{color:MUTED}}>{c.plan}</p>
                        </td>
                        <td className="px-5 py-2.5"><ClassBadge cls={c.classification} size="xs"/></td>
                      </tr>
                    ))}
                    {!clients.length&&<tr><td colSpan={2} className="py-8 text-center text-sm" style={{color:MUTED}}>Sin clientes aún</td></tr>}
                  </tbody>
                </table>
              </div>
              <div style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="rounded-xl overflow-hidden">
                <div className="px-5 py-4" style={{borderBottom:`1px solid ${BORDER}`}}>
                  <h2 className="text-sm font-semibold" style={{color:LIGHT}}>Últimos Pagos</h2>
                </div>
                <table className="w-full text-sm">
                  <thead><tr style={{borderBottom:`1px solid ${BORDER}`}}>
                    {['Cliente','Monto','Estado'].map(h=><th key={h} className="text-left px-5 py-3 text-sm font-semibold uppercase tracking-wider" style={{color:MUTED}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {payments.slice(0,6).map(p=>(
                      <tr key={p.id} style={{borderBottom:`1px solid ${BORDER}`}} className="hover:bg-white/5">
                        <td className="px-5 py-2.5 font-medium text-base">{p.client_name}</td>
                        <td className="px-5 py-2.5 text-green-400 font-semibold">{formatCurrency(p.amount)}</td>
                        <td className="px-5 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.status==='paid'?'bg-green-900/40 text-green-400':'bg-yellow-900/40 text-yellow-400'}`}>{p.status==='paid'?'Pagado':'Pendiente'}</span></td>
                      </tr>
                    ))}
                    {!payments.length&&<tr><td colSpan={3} className="py-8 text-center text-sm" style={{color:MUTED}}>Sin pagos aún</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── PLANES ── */}
        {tab==='plans'&&(
          <div className="space-y-5">
            <div className="text-center pt-2">
              <h2 className="text-2xl font-bold text-white mb-1">Planes Disponibles</h2>
              <p className="text-sm" style={{color:MUTED}}>Conéctate con velocidad real</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {PLANS.map(plan=>(
                <div key={plan.id} style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="rounded-xl p-4 text-center hover:border-blue-500/50 transition-all">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{backgroundColor:plan.color}}>
                    <span className="text-white font-bold text-lg">{plan.label}</span>
                  </div>
                  <p className="text-xs mb-1" style={{color:MUTED}}>Mbps</p>
                  <p className="text-base font-bold text-white mb-1">{formatCurrency(plan.value)}</p>
                  <p className="text-xs" style={{color:MUTED}}>mensuales</p>
                  <div className="mt-3 flex justify-center"><Wifi className="w-5 h-5" style={{color:plan.color}}/></div>
                </div>
              ))}
            </div>
            <div style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="rounded-xl p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl" style={{backgroundColor:CARD2}}><Tv className="w-6 h-6" style={{color:LIGHT}}/></div>
              <div>
                <h3 className="font-semibold text-white">Televisión Satelital — MediTV</h3>
                <p className="text-sm" style={{color:MUTED}}>Cada punto: <span style={{color:BLUE}} className="font-bold">{formatCurrency(TV_PLAN.value)}</span></p>
              </div>
            </div>
            <div style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4" style={{color:LIGHT}}>Distribución por Plan</h3>
              <div className="space-y-3">
                {PLANS.map(plan=>{
                  const count=clients.filter(c=>c.plan===plan.name).length
                  const pct=clients.length?Math.round((count/clients.length)*100):0
                  return (
                    <div key={plan.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{color:LIGHT}}>{plan.name}</span>
                        <span style={{color:LIGHT}}>{count} · {pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{backgroundColor:BG}}>
                        <div className="h-full rounded-full transition-all duration-500" style={{width:`${pct}%`,backgroundColor:plan.color}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CLIENTES ── */}
        {tab==='clients'&&(
          <div className="space-y-3">
            <div style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="rounded-xl p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input type="text" placeholder="Buscar por nombre, celular, cédula, barrio..." value={search} onChange={e=>setSearch(e.target.value)} style={iStyle} className={iCls+" pl-9"}/>
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm">🔍</span>
                  </div>
                  <select value={filterPlan} onChange={e=>setFilterPlan(e.target.value)} style={iStyle} className={`${iCls} sm:w-44`}>
                    <option value="">Todos los planes</option>
                    {PLANS.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={iStyle} className={`${iCls} sm:w-36`}>
                    <option value="">Todos</option>
                    <option value="active">Activos</option>
                    <option value="suspended">Suspendidos</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-medium" style={{color:MUTED}}>Estado:</span>
                  <button onClick={()=>setFilterClass('')}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${!filterClass?'text-white border-blue-500 bg-blue-500/20':'border-transparent hover:border-slate-600'}`}
                    style={{color:!filterClass?'white':MUTED}}>Todos ({clients.length})</button>
                  {classStats.map(cs=>{
                    const cfg=getCC(cs.classification); const active=filterClass===cs.classification
                    return (
                      <button key={cs.classification} onClick={()=>setFilterClass(active?'':cs.classification)}
                        className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                        style={{
                          backgroundColor: active ? BLUE+'22' : 'transparent',
                          color: active ? 'white' : LIGHT,
                          border: `1px solid ${active ? BLUE : 'transparent'}`,
                        }}>
                        {cfg.label} ({cs.n})
                      </button>
                    )
                  })}
                  {(search||filterPlan||filterStatus||filterClass)&&(
                    <button onClick={()=>{setSearch('');setFilterPlan('');setFilterStatus('');setFilterClass('')}}
                      style={{border:`1px solid ${BORDER}`,color:LIGHT}} className="px-3 py-1 rounded-full text-xs hover:text-white transition-colors">
                      ✕ Limpiar
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4" style={{borderBottom:`1px solid ${BORDER}`}}>
                <h2 className="font-semibold text-white">Clientes <span style={{color:MUTED}}>({filteredClients.length})</span></h2>
                <button onClick={()=>{setEditClient(null);setForm(EMPTY_CLIENT);setShowModal(true)}} style={{backgroundColor:BLUE}} className="flex items-center gap-2 hover:opacity-90 text-base px-4 py-2.5 rounded-lg transition-opacity font-semibold text-white">
                  <Plus className="w-4 h-4"/><span className="hidden sm:inline">Nuevo Cliente</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr style={{borderBottom:`1px solid ${BORDER}`,backgroundColor:BG}}>
                    {['Cliente','Cédula','Celular','Plan','Estado','F. Pago','Acciones'].map(h=>(
                      <th key={h} className="text-left px-4 py-3 text-sm font-semibold uppercase tracking-wider whitespace-nowrap" style={{color:MUTED}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filteredClients.map(c=>(
                      <tr key={c.id} style={{borderBottom:`1px solid ${BORDER}`}} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="font-medium text-white truncate">{c.name}</p>
                          {c.address&&<p className="text-xs truncate mt-0.5" style={{color:MUTED}}>{c.address}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap" style={{color:LIGHT}}>{c.cedula||'—'}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap" style={{color:LIGHT}}>
                          <p>{c.cellphone}</p>
                          {c.telefono_alternativo&&<p className="text-xs mt-0.5" style={{color:MUTED}}>{c.telefono_alternativo}</p>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-xs text-white font-medium" style={{backgroundColor:getPlanColor(c.plan)}}>{c.plan}</span>
                          <p className="text-xs mt-1 text-green-400 font-semibold">{formatCurrency(c.plan_value)}</p>
                          {c.incluye_tv?<p className="text-xs mt-0.5" style={{color:LIGHT}}>📺 MediTV</p>:null}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap"><ClassBadge cls={c.classification}/></td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap" style={{color:LIGHT}}>
                          <p>Día {c.dia_pago}</p>
                          {c.fecha_instalacion&&<p className="mt-0.5" style={{color:MUTED}}>Inst: {c.fecha_instalacion}</p>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button onClick={()=>openNewPayment(c.id)} title="Registrar pago" className="text-green-400 hover:text-green-300 transition-colors"><CreditCard className="w-4 h-4"/></button>
                            <Link href={`/factura/${c.id}`} target="_blank" title="Factura" className="text-blue-400 hover:text-blue-300 transition-colors"><FileText className="w-4 h-4"/></Link>
                            <button onClick={()=>sendWhatsAppReminder(c)} title="Recordatorio de pago WhatsApp" className="text-emerald-400 hover:text-emerald-300 transition-colors"><MessageCircle className="w-4 h-4"/></button>
                            <button onClick={()=>openEditClient(c)} className="hover:text-white transition-colors" style={{color:LIGHT}}><Pencil className="w-4 h-4"/></button>
                            <button onClick={()=>handleDeleteClient(c.id)} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredClients.length&&<tr><td colSpan={7} className="py-12 text-center text-sm" style={{color:MUTED}}>{clients.length?'Sin resultados para esa búsqueda':'No hay clientes aún. ¡Agrega el primero!'}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── PAGOS ── */}
        {tab==='payments'&&(
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              <MetricCard label="Total Pagos"     value={payStats.total??0}                         icon={<CreditCard className="w-5 h-5"/>}/>
              <MetricCard label="Total Recaudado" value={formatCurrency(payStats.total_amount??0)}   icon={<DollarSign className="w-5 h-5"/>}/>
              <MetricCard label="Cobrado"          value={formatCurrency(payStats.paid_amount??0)}    icon={<CheckCircle className="w-5 h-5"/>}/>
              <MetricCard label="Pendiente"        value={formatCurrency(payStats.pending_amount??0)} icon={<Clock className="w-5 h-5"/>}/>
            </div>
            <div style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4" style={{borderBottom:`1px solid ${BORDER}`}}>
                <h2 className="font-semibold text-white">Pagos <span style={{color:MUTED}}>({payments.length})</span></h2>
                <button onClick={()=>openNewPayment()} style={{backgroundColor:'#16a34a'}} className="flex items-center gap-2 hover:opacity-90 text-base px-4 py-2.5 rounded-lg transition-opacity font-semibold text-white">
                  <Plus className="w-4 h-4"/><span className="hidden sm:inline">Registrar Pago</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr style={{borderBottom:`1px solid ${BORDER}`,backgroundColor:BG}}>
                    {['Cliente','Celular','Período','Monto','Método','Estado','Fecha','Acciones'].map(h=>(
                      <th key={h} className="text-left px-4 py-3 text-sm font-semibold uppercase tracking-wider whitespace-nowrap" style={{color:MUTED}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {payments.map(p=>(
                      <tr key={p.id} style={{borderBottom:`1px solid ${BORDER}`}} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{p.client_name}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap" style={{color:LIGHT}}>{p.cellphone}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap" style={{color:LIGHT}}>{p.period}</td>
                        <td className="px-4 py-3 text-green-400 font-semibold whitespace-nowrap">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-3 text-xs capitalize whitespace-nowrap" style={{color:LIGHT}}>{p.method}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.status==='paid'?'bg-green-900/40 text-green-400':'bg-yellow-900/40 text-yellow-400'}`}>{p.status==='paid'?'Pagado':'Pendiente'}</span></td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap" style={{color:MUTED}}>{p.created_at?.slice(0,10)}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><div className="flex gap-2">
                          <button onClick={()=>openEditPayment(p)} className="text-blue-400 hover:text-blue-300 transition-colors"><Pencil className="w-4 h-4"/></button>
                          <button onClick={()=>handleDeletePayment(p.id)} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div></td>
                      </tr>
                    ))}
                    {!payments.length&&<tr><td colSpan={8} className="py-12 text-center text-sm" style={{color:MUTED}}>No hay pagos registrados aún</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── REPORTES ── */}
        {tab==='reports'&&(
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-1">
              <BarChart2 className="w-5 h-5" style={{color:BLUE}}/>
              <h2 className="text-lg font-bold text-white">Reportes y Estadísticas</h2>
            </div>
            <div style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4" style={{color:LIGHT}}>Recaudo Mensual (últimos 12 meses)</h3>
              {reports?.byMonth?.length?(
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={reports.byMonth} margin={{top:4,right:4,left:0,bottom:4}}>
                    <XAxis dataKey="month" tick={{fill:MUTED,fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis tickFormatter={v=>formatCurrency(v).replace('$','')} tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false} width={70}/>
                    <Tooltip content={customTooltip}/>
                    <Bar dataKey="total" fill={BLUE} radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              ):<div className="h-36 flex items-center justify-center text-sm" style={{color:MUTED}}>Sin datos de pagos aún</div>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4" style={{color:LIGHT}}>Por Método de Pago</h3>
                {reports?.byMethod?.length?(
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={reports.byMethod} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={75}>
                        {reports.byMethod.map((_,i)=><Cell key={i} fill={[BLUE,'#16a34a','#8b5cf6','#ec4899','#f59e0b'][i%5]}/>)}
                      </Pie>
                      <Legend formatter={v=><span style={{color:LIGHT,fontSize:12}}>{v}</span>}/>
                    </PieChart>
                  </ResponsiveContainer>
                ):<div className="h-36 flex items-center justify-center text-sm" style={{color:MUTED}}>Sin datos aún</div>}
              </div>
              <div style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4" style={{color:LIGHT}}>Clientes por Plan</h3>
                <div className="space-y-3">
                  {(reports?.byPlan??PLANS.map(p=>({plan:p.name,count:0,potential:0}))).map((row,i)=>{
                    const planObj=PLANS.find(p=>p.name===row.plan)
                    const total=reports?.byPlan?.reduce((s,r)=>s+Number(r.count),0)||1
                    const pct=Math.round((Number(row.count)/total)*100)
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{color:LIGHT}}>{row.plan}</span>
                          <span style={{color:LIGHT}}>{row.count} · {pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{backgroundColor:BG}}>
                          <div className="h-full rounded-full transition-all duration-500" style={{width:`${pct}%`,backgroundColor:planObj?.color??'#64748b'}}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4" style={{borderBottom:`1px solid ${BORDER}`}}>
                <AlertCircle className="w-4 h-4 text-yellow-400"/>
                <h3 className="font-semibold text-sm text-white">Sin pago este mes <span style={{color:MUTED}}>({reports?.pendingClients?.length??0})</span></h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr style={{borderBottom:`1px solid ${BORDER}`,backgroundColor:BG}}>
                    {['Cliente','Celular','Plan','Valor','F. Pago','Acción'].map(h=>(
                      <th key={h} className="text-left px-4 py-3 text-sm font-semibold uppercase tracking-wider whitespace-nowrap" style={{color:MUTED}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {reports?.pendingClients?.map(c=>(
                      <tr key={c.id} style={{borderBottom:`1px solid ${BORDER}`}} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{c.name}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap" style={{color:LIGHT}}>{c.cellphone}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><span className="px-2 py-0.5 rounded text-xs text-white font-medium" style={{backgroundColor:getPlanColor(c.plan)}}>{c.plan}</span></td>
                        <td className="px-4 py-3 text-yellow-400 font-semibold whitespace-nowrap">{formatCurrency(c.plan_value)}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap" style={{color:LIGHT}}>{c.payment_date}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button onClick={()=>openNewPayment(c.id)} style={{backgroundColor:'#16a34a'}} className="flex items-center gap-1 hover:opacity-90 text-xs px-3 py-1.5 rounded-lg transition-opacity font-medium text-white">
                            <CreditCard className="w-3 h-3"/> Registrar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!reports?.pendingClients?.length&&<tr><td colSpan={6} className="py-10 text-center text-green-400 font-medium text-sm">✅ Todos los clientes pagaron este mes</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ══ MODAL CLIENTE ══ */}
      {showModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor:'rgba(0,0,0,0.85)'}}>
          <div style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 sticky top-0 z-10" style={{backgroundColor:CARD,borderBottom:`1px solid ${BORDER}`}}>
              <div>
                <h3 className="font-semibold text-white">{editClient?'Editar Cliente':'Nuevo Cliente'}</h3>
                <p className="text-xs mt-0.5" style={{color:MUTED}}>Completa la información del cliente</p>
              </div>
              <button onClick={()=>setShowModal(false)} style={{color:MUTED}} className="hover:text-white transition-colors p-1"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">

              {/* ── Identificación ── */}
              <SectionHeader icon={<Users className="w-3.5 h-3.5"/>} title="Identificación"/>
              <F label="Nombre Completo *">
                <input type="text" value={form.name} onChange={e=>{const v=e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g,"");setForm(p=>({...p,name:v}))}} style={iStyle} className={iCls} placeholder="Nombre y apellidos"/>
              </F>
              <F label="Cédula de Ciudadanía">
                <input type="text" value={form.cedula} onChange={e=>{const v=e.target.value.replace(/\D/g,"").slice(0,12);setForm(p=>({...p,cedula:v}))}} style={iStyle} className={iCls} placeholder="Número de cédula"/>
              </F>

              {/* ── Contacto ── */}
              <SectionHeader icon={<Phone className="w-3.5 h-3.5"/>} title="Contacto"/>
              <F label="Celular Principal *">
                <input type="text" value={form.cellphone} onChange={e=>{const v=e.target.value.replace(/\D/g,"").slice(0,10);setForm(p=>({...p,cellphone:v}))}} style={iStyle} className={iCls} placeholder="3XX XXX XXXX"/>
              </F>
              <F label="Teléfono Alternativo">
                <input type="text" value={form.telefono_alternativo} onChange={e=>{const v=e.target.value.replace(/\D/g,"").slice(0,10);setForm(p=>({...p,telefono_alternativo:v}))}} style={iStyle} className={iCls} placeholder="Otro número de contacto"/>
              </F>
              <F label="Teléfono Fijo">
                <input type="text" value={form.phone} onChange={e=>{const v=e.target.value.replace(/\D/g,"").slice(0,10);setForm(p=>({...p,phone:v}))}} style={iStyle} className={iCls} placeholder="Fijo residencial"/>
              </F>
              <F label="Correo Electrónico">
                <input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} style={iStyle} className={iCls} placeholder="correo@ejemplo.com"/>
              </F>

              {/* ── Ubicación ── */}
              <SectionHeader icon={<MapPin className="w-3.5 h-3.5"/>} title="Ubicación"/>
              <F label="Dirección de Instalación" span2>
                <input type="text" value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} style={iStyle} className={iCls} placeholder="Calle, carrera, número..."/>
              </F>
              <F label="Punto de Referencia" span2>
                <input type="text" value={form.punto_referencia} onChange={e=>setForm(p=>({...p,punto_referencia:e.target.value}))} style={iStyle} className={iCls} placeholder="Casa azul, frente al parque..."/>
              </F>
              <F label="Barrio">
                <input type="text" value={form.neighborhood} onChange={e=>setForm(p=>({...p,neighborhood:e.target.value}))} style={iStyle} className={iCls} placeholder="Nombre del barrio"/>
              </F>
              <F label="Comuna">
                <input type="text" value={form.commune} onChange={e=>setForm(p=>({...p,commune:e.target.value}))} style={iStyle} className={iCls} placeholder="Comuna o sector"/>
              </F>
              <F label="Ciudad">
                <input type="text" value={form.city} onChange={e=>setForm(p=>({...p,city:e.target.value}))} style={iStyle} className={iCls} placeholder="Medellín"/>
              </F>

              {/* ── Foto de ubicación ── */}
              <SectionHeader icon={<Image className="w-3.5 h-3.5"/>} title="Foto de Ubicación"/>
              <F label="URL Foto Fachada / Cuadra" span2>
                <input type="text" value={form.foto_fachada} onChange={e=>setForm(p=>({...p,foto_fachada:e.target.value}))} style={iStyle} className={iCls} placeholder="https://... (link de Google Photos, Drive, etc.)"/>
              </F>
              {form.foto_fachada&&(
                <div className="md:col-span-2">
                  <a href={form.foto_fachada} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{backgroundColor:CARD2,border:`1px solid ${BORDER}`,color:LIGHT}}>
                    <Image className="w-3.5 h-3.5"/> Ver foto
                  </a>
                </div>
              )}

              {/* ── Servicio ── */}
              <SectionHeader icon={<Wifi className="w-3.5 h-3.5"/>} title="Plan y Servicio"/>
              <F label="Plan de Internet *">
                <select value={form.plan} onChange={e=>{const p=PLANS.find(x=>x.name===e.target.value);setForm(prev=>({...prev,plan:e.target.value,plan_value:p?.value??0}))}} style={iStyle} className={iCls}>
                  <option value="">Seleccionar plan...</option>
                  {PLANS.map(p=><option key={p.id} value={p.name}>{p.name} — {formatCurrency(p.value)}/mes</option>)}
                </select>
              </F>
              <F label="Valor Mensual ($)">
                <input type="number" value={form.plan_value} onChange={e=>setForm(p=>({...p,plan_value:Number(e.target.value)}))} style={iStyle} className={iCls}/>
              </F>
              <F label="¿Incluye MediTV (TV satelital)?">
                <div className="flex items-center gap-3 mt-1">
                  {[{v:1,l:'Sí, incluye MediTV'},{v:0,l:'No incluye TV'}].map(opt=>(
                    <label key={opt.v} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={form.incluye_tv===opt.v} onChange={()=>setForm(p=>({...p,incluye_tv:opt.v}))}
                        className="accent-blue-500"/>
                      <span className="text-sm" style={{color:form.incluye_tv===opt.v?'white':MUTED}}>{opt.l}</span>
                    </label>
                  ))}
                </div>
              </F>
              <F label="Fecha de Instalación">
                <input type="date" value={form.fecha_instalacion} onChange={e=>setForm(p=>({...p,fecha_instalacion:e.target.value}))} style={iStyle} className={iCls}/>
              </F>

              {/* ── Facturación ── */}
              <SectionHeader icon={<Calendar className="w-3.5 h-3.5"/>} title="Facturación"/>
              <F label="Día Preferido de Pago">
                <select value={form.dia_pago} onChange={e=>setForm(p=>({...p,dia_pago:e.target.value}))} style={iStyle} className={iCls}>
                  <option value="15">Día 15 de cada mes</option>
                  <option value="30">Día 30 de cada mes</option>
                </select>
              </F>
              <F label="Referencia / Llave BRE-B">
                <input type="text" value={form.reference} onChange={e=>setForm(p=>({...p,reference:e.target.value}))} style={iStyle} className={iCls} placeholder="Código de referencia"/>
              </F>
              <F label="Fecha Consumo">
                <input type="date" value={form.consumption_date} onChange={e=>setForm(p=>({...p,consumption_date:e.target.value}))} style={iStyle} className={iCls}/>
              </F>
              <F label="Fecha Pago (sistema)">
                <input type="date" value={form.payment_date} onChange={e=>setForm(p=>({...p,payment_date:e.target.value}))} style={iStyle} className={iCls}/>
              </F>

              {/* ── Clasificación ── */}
              <SectionHeader icon={<CheckCircle className="w-3.5 h-3.5"/>} title="Estado y Clasificación"/>
              <F label="Estado del sistema">
                <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={iStyle} className={iCls}>
                  <option value="active">Activo</option>
                  <option value="suspended">Suspendido</option>
                </select>
              </F>
              <F label="Clasificación de cobro">
                <select value={form.classification} onChange={e=>setForm(p=>({...p,classification:e.target.value}))} style={iStyle} className={iCls}>
                  {CLASSIFICATIONS.map(c=><option key={c} value={c}>{getCC(c).label}</option>)}
                </select>
              </F>
              {form.classification&&(
                <div className="md:col-span-2">
                  <ClassBadge cls={form.classification}/>
                </div>
              )}

              {/* ── Referido ── */}
              <SectionHeader icon={<UserPlus className="w-3.5 h-3.5"/>} title="Programa de Referidos"/>
              <F label="¿Deseas referir a alguien? — Nombre">
                <input type="text" value={form.referido_nombre} onChange={e=>{const v=e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g,"");setForm(p=>({...p,referido_nombre:v}))}} style={iStyle} className={iCls} placeholder="Nombre del referido"/>
              </F>
              <F label="Teléfono del Referido">
                <input type="text" value={form.referido_telefono} onChange={e=>{const v=e.target.value.replace(/\D/g,"").slice(0,10);setForm(p=>({...p,referido_telefono:v}))}} style={iStyle} className={iCls} placeholder="Celular del referido"/>
              </F>
              {(form.referido_nombre||form.referido_telefono)&&(
                <div className="md:col-span-2 rounded-lg p-3 text-xs" style={{backgroundColor:'#0d1f12',border:'1px solid #166534',color:'#4ade80'}}>
                  🎁 Este cliente está refiriendo a <strong>{form.referido_nombre||'—'}</strong> ({form.referido_telefono||'sin teléfono'})
                </div>
              )}

              {/* ── Notas ── */}
              <div className="md:col-span-2 mt-2 pb-2" style={{borderBottom:`1px solid ${BORDER}`}}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-3.5 h-3.5" style={{color:BLUE}}/>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{color:LIGHT}}>Novedades y Notas</span>
                </div>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={3} style={iStyle} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none transition-colors" placeholder="Observaciones internas, novedades de pago, acuerdos..."/>
              </div>

            </div>
            <div className="flex justify-end gap-3 p-5" style={{borderTop:`1px solid ${BORDER}`}}>
              <button onClick={()=>setShowModal(false)} style={{border:`1px solid ${BORDER}`,color:LIGHT}} className="px-4 py-2 text-sm rounded-lg hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleSaveClient} style={{backgroundColor:BLUE}} className="px-6 py-2 text-sm rounded-lg font-medium hover:opacity-90 transition-opacity text-white">{editClient?'Actualizar Cliente':'Guardar Cliente'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL PAGO ══ */}
      {showPayModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor:'rgba(0,0,0,0.85)'}}>
          <div style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}} className="rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5" style={{borderBottom:`1px solid ${BORDER}`}}>
              <h3 className="font-semibold text-white">{editPayment?'Editar Pago':'Registrar Pago'}</h3>
              <button onClick={()=>setShowPayModal(false)} style={{color:MUTED}} className="hover:text-white transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1.5" style={{color:MUTED}}>Cliente *</label>
                <select value={payForm.client_id} onChange={e=>{const c=clients.find(x=>x.id===Number(e.target.value));setPayForm(p=>({...p,client_id:Number(e.target.value),amount:c?.plan_value??p.amount}))}} style={iStyle} className={iCls}>
                  <option value={0}>Seleccionar cliente...</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.name} — {c.cellphone}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{color:MUTED}}>Período *</label>
                <input type="month" value={payForm.period} onChange={e=>setPayForm(p=>({...p,period:e.target.value}))} style={iStyle} className={iCls}/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{color:MUTED}}>Monto *</label>
                <input type="number" value={payForm.amount} onChange={e=>setPayForm(p=>({...p,amount:Number(e.target.value)}))} style={iStyle} className={iCls}/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{color:MUTED}}>Método de Pago</label>
                <select value={payForm.method} onChange={e=>setPayForm(p=>({...p,method:e.target.value}))} style={iStyle} className={iCls}>
                  {METHODS.map(m=><option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{color:MUTED}}>Estado</label>
                <select value={payForm.status} onChange={e=>setPayForm(p=>({...p,status:e.target.value}))} style={iStyle} className={iCls}>
                  <option value="paid">Pagado</option>
                  <option value="pending">Pendiente</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1.5" style={{color:MUTED}}>Notas</label>
                <textarea value={payForm.notes} onChange={e=>setPayForm(p=>({...p,notes:e.target.value}))} rows={2} style={iStyle} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none transition-colors"/>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5" style={{borderTop:`1px solid ${BORDER}`}}>
              <button onClick={()=>setShowPayModal(false)} style={{border:`1px solid ${BORDER}`,color:LIGHT}} className="px-4 py-2 text-sm rounded-lg hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleSavePayment} style={{backgroundColor:'#16a34a'}} className="px-6 py-2 text-sm rounded-lg font-medium hover:opacity-90 transition-opacity text-white">{editPayment?'Actualizar':'Guardar Pago'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
