'use client'
import { useEffect, useState, useCallback } from 'react'
import { PLANS, TV_PLAN, formatCurrency } from '@/lib/plans'
import { Wifi, Users, UserCheck, UserX, DollarSign, Plus, Trash2, Pencil, X, Tv, CreditCard, CheckCircle, Clock, BarChart2, AlertCircle } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import Image from 'next/image'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

type Client = {
  id: number; name: string; email: string; phone: string; cellphone: string
  address: string; city: string; neighborhood: string; commune: string
  consumption_date: string; payment_date: string; plan: string; plan_value: number
  reference: string; status: string; notes: string; created_at: string
}
type Payment = {
  id: number; client_id: number; amount: number; period: string
  method: string; status: string; notes: string; created_at: string
  client_name: string; plan: string; cellphone: string
}
type Stats = { total: number; active: number; suspended: number; monthly_income: number }
type PaymentStats = { total: number; total_amount: number; paid_amount: number; pending_amount: number }
type ReportData = {
  byMonth: { month: string; total: number; count: number }[]
  byMethod: { method: string; count: number; total: number }[]
  byPlan: { plan: string; count: number; potential: number }[]
  pendingClients: { id: number; name: string; cellphone: string; plan: string; plan_value: number; payment_date: string }[]
}

const EMPTY_CLIENT = { name:'',email:'',phone:'',cellphone:'',address:'',city:'',neighborhood:'',commune:'',consumption_date:'',payment_date:'',plan:'',plan_value:0,reference:'',status:'active',notes:'' }
const EMPTY_PAYMENT = { client_id:0, amount:0, period:'', method:'efectivo', status:'paid', notes:'' }
const METHODS = ['efectivo','transferencia','nequi','daviplata','bancolombia']
const METHOD_COLORS: Record<string,string> = { efectivo:'#22c55e', transferencia:'#3b82f6', nequi:'#8b5cf6', daviplata:'#ec4899', bancolombia:'#f59e0b' }

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<Stats>({ total:0, active:0, suspended:0, monthly_income:0 })
  const [payStats, setPayStats] = useState<PaymentStats>({ total:0, total_amount:0, paid_amount:0, pending_amount:0 })
  const [reports, setReports] = useState<ReportData | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [editPayment, setEditPayment] = useState<Payment | null>(null)
  const [form, setForm] = useState(EMPTY_CLIENT)
  const [payForm, setPayForm] = useState(EMPTY_PAYMENT)
  const [sseStatus, setSseStatus] = useState<'connecting'|'connected'|'error'>('connecting')
  const [dbStatus, setDbStatus] = useState<'checking'|'ok'|'error'>('checking')
  const [tab, setTab] = useState<'dashboard'|'plans'|'clients'|'payments'|'reports'>('dashboard')

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients')
      if (!res.ok) { setDbStatus('error'); return }
      const data = await res.json()
      setClients(data.clients ?? [])
      setStats(data.stats ?? { total:0, active:0, suspended:0, monthly_income:0 })
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
      const data = await res.json()
      setReports(data)
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
    es.addEventListener('connected', () => setSseStatus('connected'))
    es.addEventListener('new-client', e => { const c = JSON.parse(e.data); setClients(p => [c,...p]); toast.success('✅ Nuevo cliente: '+c.name); fetchClients() })
    es.addEventListener('update-client', e => { const u = JSON.parse(e.data); setClients(p => p.map(c => c.id===u.id?u:c)); toast.success('📝 Actualizado: '+u.name) })
    es.addEventListener('delete-client', () => { fetchClients(); toast.success('🗑️ Cliente eliminado') })
    es.addEventListener('new-payment', e => { const p = JSON.parse(e.data); setPayments(prev => [p,...prev]); toast.success('💰 Pago registrado: '+p.client_name); fetchPayments(); fetchReports() })
    es.addEventListener('update-payment', e => { const u = JSON.parse(e.data); setPayments(p => p.map(x => x.id===u.id?u:x)); fetchReports() })
    es.addEventListener('delete-payment', () => { fetchPayments(); fetchReports(); toast.success('🗑️ Pago eliminado') })
    es.onerror = () => setSseStatus('error')
    return () => es.close()
  }, [fetchClients, fetchPayments, fetchReports])

  const handleSaveClient = async () => {
    if (!form.name||!form.cellphone||!form.plan) { toast.error('Completa los campos obligatorios'); return }
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

  const handleDeleteClient = async (id: number) => {
    if (!confirm('¿Eliminar este cliente?')) return
    await fetch(`/api/clients/${id}`, { method:'DELETE' })
    fetchClients()
  }

  const handleDeletePayment = async (id: number) => {
    if (!confirm('¿Eliminar este pago?')) return
    await fetch(`/api/payments/${id}`, { method:'DELETE' })
    fetchPayments(); fetchReports()
  }

  const openEditClient = (c: Client) => { setEditClient(c); setForm({...c}); setShowModal(true) }
  const openNewPayment = (clientId?: number) => {
    setEditPayment(null)
    const client = clientId ? clients.find(c => c.id===clientId) : null
    setPayForm({ ...EMPTY_PAYMENT, client_id: clientId??0, amount: client?.plan_value??0, period: new Date().toISOString().slice(0,7) })
    setShowPayModal(true)
  }
  const openEditPayment = (p: Payment) => { setEditPayment(p); setPayForm({ client_id:p.client_id, amount:p.amount, period:p.period, method:p.method, status:p.status, notes:p.notes }); setShowPayModal(true) }
  const getPlanColor = (n: string) => PLANS.find(p => p.name===n)?.color ?? '#64748b'

  const inputCls = "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
  const inputStyle = { backgroundColor:'#111827', border:'1px solid #1e3a5f', color:'white' }

  const StatusDot = ({ status, label }: { status: string; label: string }) => {
    const isGreen = status==='ok'||status==='connected'
    const isRed = status==='error'
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          {isGreen && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${isGreen?'bg-green-400':isRed?'bg-red-500':'bg-yellow-400'}`}/>
        </span>
        <span className={`text-xs font-medium ${isGreen?'text-green-400':isRed?'text-red-400':'text-yellow-400'}`}>{label}</span>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) return (
      <div style={{backgroundColor:'#1e2a3d',border:'1px solid #1e3a5f'}} className="px-3 py-2 rounded-lg text-sm">
        <p style={{color:'#94a3b8'}}>{label}</p>
        <p className="text-green-400 font-bold">{formatCurrency(Number(payload[0]?.value ?? 0))}</p>
      </div>
    )
    return null
  }

  const TABS = [
    { key:'dashboard', label:'Dashboard' },
    { key:'plans',     label:'Planes'    },
    { key:'clients',   label:'Clientes'  },
    { key:'payments',  label:'Pagos'     },
    { key:'reports',   label:'Reportes'  },
  ] as const

  return (
    <div className="min-h-screen text-white" style={{backgroundColor:'#1a1f2e'}}>
      <Toaster position="top-right"/>

      {/* Header */}
      <header style={{backgroundColor:'#111827',borderBottom:'1px solid #1e3a5f'}} className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 flex-shrink-0">
            <Image src="/logo.png" alt="Medifibra" fill className="object-contain"/>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">MEDI<span style={{color:'#3b82f6'}}>FIBRA</span></h1>
            <p className="text-xs" style={{color:'#64748b'}}>Sistema de Gestión</p>
          </div>
        </div>
        <div style={{backgroundColor:'#0f172a',border:'1px solid #1e3a5f'}} className="flex items-center gap-4 px-4 py-2 rounded-lg">
          <StatusDot status={dbStatus} label="Turso DB"/>
          <div style={{width:1,height:14,backgroundColor:'#1e3a5f'}}/>
          <StatusDot status={sseStatus} label="SSE Live"/>
        </div>
      </header>

      {/* Nav */}
      <nav style={{backgroundColor:'#111827',borderBottom:'1px solid #1e3a5f'}} className="px-6 flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab===t.key?'border-blue-500 text-blue-400':'border-transparent text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="p-6 max-w-7xl mx-auto space-y-5">

        {/* ── DASHBOARD ── */}
        {tab==='dashboard' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {label:'Total Clientes',    value:stats.total,                         icon:<Users className="w-5 h-5"/>,       accent:'#3b82f6'},
                {label:'Activos',           value:stats.active,                        icon:<UserCheck className="w-5 h-5"/>,    accent:'#22c55e'},
                {label:'Suspendidos',       value:stats.suspended,                     icon:<UserX className="w-5 h-5"/>,        accent:'#ef4444'},
                {label:'Ingresos / Mes',    value:formatCurrency(stats.monthly_income??0), icon:<DollarSign className="w-5 h-5"/>, accent:'#f59e0b'},
              ].map((s,i) => (
                <div key={i} style={{backgroundColor:'#1e2a3d',border:'1px solid #1e3a5f',borderTop:`3px solid ${s.accent}`}} className="rounded-xl p-4 flex items-center gap-4">
                  <div style={{backgroundColor:s.accent+'22',color:s.accent}} className="p-2.5 rounded-lg">{s.icon}</div>
                  <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs" style={{color:'#64748b'}}>{s.label}</p></div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {label:'Total Cobrado',       value:formatCurrency(payStats.paid_amount??0),    icon:<CheckCircle className="w-5 h-5"/>, accent:'#22c55e'},
                {label:'Pendiente',           value:formatCurrency(payStats.pending_amount??0), icon:<Clock className="w-5 h-5"/>,       accent:'#f59e0b'},
                {label:'Pagos Registrados',   value:payStats.total??0,                          icon:<CreditCard className="w-5 h-5"/>,  accent:'#8b5cf6'},
              ].map((s,i) => (
                <div key={i} style={{backgroundColor:'#1e2a3d',border:'1px solid #1e3a5f',borderTop:`3px solid ${s.accent}`}} className="rounded-xl p-4 flex items-center gap-4">
                  <div style={{backgroundColor:s.accent+'22',color:s.accent}} className="p-2.5 rounded-lg">{s.icon}</div>
                  <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs" style={{color:'#64748b'}}>{s.label}</p></div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div style={{backgroundColor:'#1e2a3d',border:'1px solid #1e3a5f'}} className="rounded-xl overflow-hidden">
                <div className="px-5 py-4" style={{borderBottom:'1px solid #1e3a5f'}}><h2 className="text-sm font-semibold text-slate-300">Clientes Recientes</h2></div>
                <table className="w-full text-sm">
                  <thead><tr style={{borderBottom:'1px solid #1e3a5f'}}>
                    {['Cliente','Plan','Estado'].map(h=><th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{color:'#64748b'}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {clients.slice(0,5).map(c=>(
                      <tr key={c.id} style={{borderBottom:'1px solid #1e3a5f'}} className="hover:bg-blue-900/10">
                        <td className="px-5 py-3 font-medium">{c.name}</td>
                        <td className="px-5 py-3"><span className="px-2 py-0.5 rounded text-xs text-white font-medium" style={{backgroundColor:getPlanColor(c.plan)}}>{c.plan}</span></td>
                        <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.status==='active'?'bg-green-900/40 text-green-400':'bg-red-900/40 text-red-400'}`}>{c.status==='active'?'Activo':'Suspendido'}</span></td>
                      </tr>
                    ))}
                    {!clients.length&&<tr><td colSpan={3} className="py-8 text-center" style={{color:'#64748b'}}>Sin clientes aún</td></tr>}
                  </tbody>
                </table>
              </div>
              <div style={{backgroundColor:'#1e2a3d',border:'1px solid #1e3a5f'}} className="rounded-xl overflow-hidden">
                <div className="px-5 py-4" style={{borderBottom:'1px solid #1e3a5f'}}><h2 className="text-sm font-semibold text-slate-300">Últimos Pagos</h2></div>
                <table className="w-full text-sm">
                  <thead><tr style={{borderBottom:'1px solid #1e3a5f'}}>
                    {['Cliente','Monto','Estado'].map(h=><th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{color:'#64748b'}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {payments.slice(0,5).map(p=>(
                      <tr key={p.id} style={{borderBottom:'1px solid #1e3a5f'}} className="hover:bg-blue-900/10">
                        <td className="px-5 py-3 font-medium">{p.client_name}</td>
                        <td className="px-5 py-3 text-green-400 font-semibold">{formatCurrency(p.amount)}</td>
                        <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.status==='paid'?'bg-green-900/40 text-green-400':'bg-yellow-900/40 text-yellow-400'}`}>{p.status==='paid'?'Pagado':'Pendiente'}</span></td>
                      </tr>
                    ))}
                    {!payments.length&&<tr><td colSpan={3} className="py-8 text-center" style={{color:'#64748b'}}>Sin pagos aún</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── PLANES ── */}
        {tab==='plans' && (
          <div className="space-y-5">
            <div className="text-center pt-2">
              <h2 className="text-2xl font-bold mb-1">Planes Disponibles</h2>
              <p style={{color:'#3b82f6'}} className="text-sm">Conéctate con velocidad real 🚀</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {PLANS.map(plan=>(
                <div key={plan.id} style={{backgroundColor:'#1e2a3d',border:'1px solid #1e3a5f'}} className="rounded-xl p-4 text-center hover:border-blue-500/50 hover:scale-105 transition-all">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{backgroundColor:plan.color}}>
                    <span className="text-white font-bold text-lg">{plan.label}</span>
                  </div>
                  <p className="text-xs mb-1" style={{color:'#64748b'}}>Mbps</p>
                  <p className="text-base font-bold mb-1">{formatCurrency(plan.value)}</p>
                  <p className="text-xs" style={{color:'#64748b'}}>mensuales</p>
                  <div className="mt-3 flex justify-center"><Wifi className="w-5 h-5" style={{color:plan.color}}/></div>
                </div>
              ))}
            </div>
            <div style={{backgroundColor:'#1e2a3d',border:'1px solid #1e3a5f'}} className="rounded-xl p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl" style={{backgroundColor:'#1d4ed8'}}><Tv className="w-6 h-6"/></div>
              <div><h3 className="font-semibold">Televisión</h3><p style={{color:'#64748b'}} className="text-sm">Cada punto: <span style={{color:'#3b82f6'}} className="font-bold">{formatCurrency(TV_PLAN.value)}</span></p></div>
            </div>
            <div style={{backgroundColor:'#1e2a3d',border:'1px solid #1e3a5f'}} className="rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4" style={{color:'#94a3b8'}}>Distribución por Plan</h3>
              <div className="space-y-3">
                {PLANS.map(plan=>{
                  const count=clients.filter(c=>c.plan===plan.name).length
                  const pct=clients.length?Math.round((count/clients.length)*100):0
                  return (
                    <div key={plan.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{color:'#94a3b8'}}>{plan.name}</span>
                        <span style={{color:'#cbd5e1'}}>{count} · {pct}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{backgroundColor:'#0f172a'}}>
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
        {tab==='clients' && (
          <div style={{backgroundColor:'#1e2a3d',border:'1px solid #1e3a5f'}} className="rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4" style={{borderBottom:'1px solid #1e3a5f'}}>
              <h2 className="font-semibold">Gestión de Clientes <span style={{color:'#64748b'}}>({clients.length})</span></h2>
              <button onClick={()=>{setEditClient(null);setForm(EMPTY_CLIENT);setShowModal(true)}} style={{backgroundColor:'#1d4ed8'}} className="flex items-center gap-2 hover:bg-blue-700 text-sm px-4 py-2 rounded-lg transition-colors font-medium">
                <Plus className="w-4 h-4"/> Nuevo Cliente
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr style={{borderBottom:'1px solid #1e3a5f',backgroundColor:'#111827'}}>
                  {['Cliente','Celular','Plan','Valor','F. Pago','Referencia','Estado','Acciones'].map(h=><th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{color:'#64748b'}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {clients.map(c=>(
                    <tr key={c.id} style={{borderBottom:'1px solid #1e3a5f'}} className="hover:bg-blue-900/10 transition-colors">
                      <td className="px-5 py-3 font-medium">{c.name}</td>
                      <td className="px-5 py-3" style={{color:'#94a3b8'}}>{c.cellphone}</td>
                      <td className="px-5 py-3"><span className="px-2 py-0.5 rounded text-xs text-white font-medium" style={{backgroundColor:getPlanColor(c.plan)}}>{c.plan}</span></td>
                      <td className="px-5 py-3 text-green-400 font-semibold">{formatCurrency(c.plan_value)}</td>
                      <td className="px-5 py-3 text-xs" style={{color:'#94a3b8'}}>{c.payment_date}</td>
                      <td className="px-5 py-3 text-xs" style={{color:'#64748b'}}>{c.reference}</td>
                      <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.status==='active'?'bg-green-900/40 text-green-400':'bg-red-900/40 text-red-400'}`}>{c.status==='active'?'Activo':'Suspendido'}</span></td>
                      <td className="px-5 py-3"><div className="flex gap-2">
                        <button onClick={()=>openNewPayment(c.id)} title="Registrar pago" className="text-green-400 hover:text-green-300 transition-colors"><CreditCard className="w-4 h-4"/></button>
                        <button onClick={()=>openEditClient(c)} className="text-blue-400 hover:text-blue-300 transition-colors"><Pencil className="w-4 h-4"/></button>
                        <button onClick={()=>handleDeleteClient(c.id)} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4"/></button>
                      </div></td>
                    </tr>
                  ))}
                  {!clients.length&&<tr><td colSpan={8} className="py-12 text-center" style={{color:'#64748b'}}>No hay clientes. ¡Agrega el primero!</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PAGOS ── */}
        {tab==='payments' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {label:'Total Pagos',       value:payStats.total??0,                         icon:<CreditCard className="w-5 h-5"/>,  accent:'#8b5cf6'},
                {label:'Total Recaudado',   value:formatCurrency(payStats.total_amount??0),   icon:<DollarSign className="w-5 h-5"/>,  accent:'#3b82f6'},
                {label:'Cobrado',           value:formatCurrency(payStats.paid_amount??0),    icon:<CheckCircle className="w-5 h-5"/>, accent:'#22c55e'},
                {label:'Pendiente',         value:formatCurrency(payStats.pending_amount??0), icon:<Clock className="w-5 h-5"/>,       accent:'#f59e0b'},
              ].map((s,i) => (
                <div key={i} style={{backgroundColor:'#1e2a3d',border:'1px solid #1e3a5f',borderTop:`3px solid ${s.accent}`}} className="rounded-xl p-4 flex items-center gap-4">
                  <div style={{backgroundColor:s.accent+'22',color:s.accent}} className="p-2.5 rounded-lg">{s.icon}</div>
                  <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs" style={{color:'#64748b'}}>{s.label}</p></div>
                </div>
              ))}
            </div>
            <div style={{backgroundColor:'#1e2a3d',border:'1px solid #1e3a5f'}} className="rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4" style={{borderBottom:'1px solid #1e3a5f'}}>
                <h2 className="font-semibold">Registro de Pagos <span style={{color:'#64748b'}}>({payments.length})</span></h2>
                <button onClick={()=>openNewPayment()} style={{backgroundColor:'#16a34a'}} className="flex items-center gap-2 hover:bg-green-700 text-sm px-4 py-2 rounded-lg transition-colors font-medium">
                  <Plus className="w-4 h-4"/> Registrar Pago
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr style={{borderBottom:'1px solid #1e3a5f',backgroundColor:'#111827'}}>
                    {['Cliente','Celular','Período','Monto','Método','Estado','Fecha','Acciones'].map(h=><th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{color:'#64748b'}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {payments.map(p=>(
                      <tr key={p.id} style={{borderBottom:'1px solid #1e3a5f'}} className="hover:bg-blue-900/10 transition-colors">
                        <td className="px-5 py-3 font-medium">{p.client_name}</td>
                        <td className="px-5 py-3 text-xs" style={{color:'#94a3b8'}}>{p.cellphone}</td>
                        <td className="px-5 py-3 text-xs" style={{color:'#94a3b8'}}>{p.period}</td>
                        <td className="px-5 py-3 text-green-400 font-semibold">{formatCurrency(p.amount)}</td>
                        <td className="px-5 py-3 text-xs capitalize" style={{color:'#94a3b8'}}>{p.method}</td>
                        <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.status==='paid'?'bg-green-900/40 text-green-400':'bg-yellow-900/40 text-yellow-400'}`}>{p.status==='paid'?'Pagado':'Pendiente'}</span></td>
                        <td className="px-5 py-3 text-xs" style={{color:'#64748b'}}>{p.created_at?.slice(0,10)}</td>
                        <td className="px-5 py-3"><div className="flex gap-2">
                          <button onClick={()=>openEditPayment(p)} className="text-blue-400 hover:text-blue-300 transition-colors"><Pencil className="w-4 h-4"/></button>
                          <button onClick={()=>handleDeletePayment(p.id)} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div></td>
                      </tr>
                    ))}
                    {!payments.length&&<tr><td colSpan={8} className="py-12 text-center" style={{color:'#64748b'}}>No hay pagos registrados aún</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── REPORTES ── */}
        {tab==='reports' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-1">
              <BarChart2 className="w-5 h-5" style={{color:'#3b82f6'}}/>
              <h2 className="text-lg font-bold">Reportes y Estadísticas</h2>
            </div>

            {/* Recaudo mensual */}
            <div style={{backgroundColor:'#1e2a3d',border:'1px solid #1e3a5f'}} className="rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4" style={{color:'#94a3b8'}}>Recaudo Mensual (últimos 12 meses)</h3>
              {reports?.byMonth?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={reports.byMonth} margin={{top:4,right:4,left:0,bottom:4}}>
                    <XAxis dataKey="month" tick={{fill:'#64748b',fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis tickFormatter={v=>formatCurrency(v).replace('$','')} tick={{fill:'#64748b',fontSize:10}} axisLine={false} tickLine={false} width={70}/>
                    <Tooltip content={customTooltip}/>
                    <Bar dataKey="total" fill="#3b82f6" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-36 flex items-center justify-center" style={{color:'#64748b'}}>Sin datos de pagos aún</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Por método de pago */}
              <div style={{backgroundColor:'#1e2a3d',border:'1px solid #1e3a5f'}} className="rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4" style={{color:'#94a3b8'}}>Por Método de Pago</h3>
                {reports?.byMethod?.length ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={reports.byMethod} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={75} label={({method,percent})=>`${method} ${((percent??0)*100).toFixed(0)}%`} labelLine={false}>
                        {reports.byMethod.map((entry,i) => (
                          <Cell key={i} fill={METHOD_COLORS[entry.method]??'#64748b'}/>
                        ))}
                      </Pie>
                      <Legend formatter={v=><span style={{color:'#94a3b8',fontSize:12}}>{v}</span>}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-36 flex items-center justify-center" style={{color:'#64748b'}}>Sin datos aún</div>
                )}
              </div>

              {/* Por plan */}
              <div style={{backgroundColor:'#1e2a3d',border:'1px solid #1e3a5f'}} className="rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4" style={{color:'#94a3b8'}}>Clientes por Plan</h3>
                <div className="space-y-3">
                  {(reports?.byPlan ?? PLANS.map(p=>({plan:p.name,count:0,potential:0}))).map((row,i) => {
                    const planObj = PLANS.find(p=>p.name===row.plan)
                    const total = reports?.byPlan?.reduce((s,r)=>s+Number(r.count),0)||1
                    const pct = Math.round((Number(row.count)/total)*100)
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{color:'#94a3b8'}}>{row.plan}</span>
                          <span style={{color:'#cbd5e1'}}>{row.count} clientes · {pct}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{backgroundColor:'#0f172a'}}>
                          <div className="h-full rounded-full transition-all duration-500" style={{width:`${pct}%`,backgroundColor:planObj?.color??'#64748b'}}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Clientes sin pagar este mes */}
            <div style={{backgroundColor:'#1e2a3d',border:'1px solid #1e3a5f'}} className="rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4" style={{borderBottom:'1px solid #1e3a5f'}}>
                <AlertCircle className="w-4 h-4 text-yellow-400"/>
                <h3 className="font-semibold text-sm">Sin pago este mes <span style={{color:'#64748b'}}>({reports?.pendingClients?.length??0})</span></h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr style={{borderBottom:'1px solid #1e3a5f',backgroundColor:'#111827'}}>
                    {['Cliente','Celular','Plan','Valor','F. Pago','Acción'].map(h=><th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{color:'#64748b'}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {reports?.pendingClients?.map(c=>(
                      <tr key={c.id} style={{borderBottom:'1px solid #1e3a5f'}} className="hover:bg-yellow-900/10 transition-colors">
                        <td className="px-5 py-3 font-medium">{c.name}</td>
                        <td className="px-5 py-3 text-xs" style={{color:'#94a3b8'}}>{c.cellphone}</td>
                        <td className="px-5 py-3"><span className="px-2 py-0.5 rounded text-xs text-white font-medium" style={{backgroundColor:getPlanColor(c.plan)}}>{c.plan}</span></td>
                        <td className="px-5 py-3 text-yellow-400 font-semibold">{formatCurrency(c.plan_value)}</td>
                        <td className="px-5 py-3 text-xs" style={{color:'#94a3b8'}}>{c.payment_date}</td>
                        <td className="px-5 py-3">
                          <button onClick={()=>openNewPayment(c.id)} style={{backgroundColor:'#16a34a'}} className="flex items-center gap-1 hover:bg-green-700 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium">
                            <CreditCard className="w-3 h-3"/> Registrar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!reports?.pendingClients?.length&&<tr><td colSpan={6} className="py-10 text-center text-green-400 font-medium">✅ Todos los clientes pagaron este mes</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL CLIENTE */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor:'rgba(0,0,0,0.75)',backdropFilter:'blur(4px)'}}>
          <div style={{backgroundColor:'#1e2a3d',border:'1px solid #1e3a5f'}} className="rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5" style={{borderBottom:'1px solid #1e3a5f'}}>
              <h3 className="font-semibold text-base">{editClient?'Editar Cliente':'Nuevo Cliente'}</h3>
              <button onClick={()=>setShowModal(false)} style={{color:'#64748b'}} className="hover:text-white transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[{label:'Nombre Completo *',key:'name',type:'text'},{label:'Celular *',key:'cellphone',type:'text'},{label:'Correo',key:'email',type:'email'},{label:'Teléfono Fijo',key:'phone',type:'text'},{label:'Dirección',key:'address',type:'text'},{label:'Ciudad',key:'city',type:'text'},{label:'Barrio',key:'neighborhood',type:'text'},{label:'Comuna',key:'commune',type:'text'},{label:'Fecha Consumo',key:'consumption_date',type:'date'},{label:'Fecha Pago',key:'payment_date',type:'date'},{label:'Referencia / Llave BRE-B',key:'reference',type:'text'}].map(f=>(
                <div key={f.key}>
                  <label className="block text-xs font-medium mb-1" style={{color:'#64748b'}}>{f.label}</label>
                  <input type={f.type} value={(form as Record<string,string|number>)[f.key] as string} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} style={inputStyle} className={inputCls}/>
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium mb-1" style={{color:'#64748b'}}>Plan *</label>
                <select value={form.plan} onChange={e=>{const p=PLANS.find(x=>x.name===e.target.value);setForm(prev=>({...prev,plan:e.target.value,plan_value:p?.value??0}))}} style={inputStyle} className={inputCls}>
                  <option value="">Seleccionar plan...</option>
                  {PLANS.map(p=><option key={p.id} value={p.name}>{p.name} — {formatCurrency(p.value)}/mes</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{color:'#64748b'}}>Valor ($)</label>
                <input type="number" value={form.plan_value} onChange={e=>setForm(p=>({...p,plan_value:Number(e.target.value)}))} style={inputStyle} className={inputCls}/>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{color:'#64748b'}}>Estado</label>
                <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={inputStyle} className={inputCls}>
                  <option value="active">Activo</option>
                  <option value="suspended">Suspendido</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{color:'#64748b'}}>Novedades</label>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={3} style={inputStyle} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none transition-colors"/>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5" style={{borderTop:'1px solid #1e3a5f'}}>
              <button onClick={()=>setShowModal(false)} style={{border:'1px solid #1e3a5f',color:'#94a3b8'}} className="px-4 py-2 text-sm rounded-lg hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleSaveClient} style={{backgroundColor:'#1d4ed8'}} className="px-6 py-2 text-sm rounded-lg font-medium hover:bg-blue-700 transition-colors">{editClient?'Actualizar':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAGO */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor:'rgba(0,0,0,0.75)',backdropFilter:'blur(4px)'}}>
          <div style={{backgroundColor:'#1e2a3d',border:'1px solid #1e3a5f'}} className="rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5" style={{borderBottom:'1px solid #1e3a5f'}}>
              <h3 className="font-semibold text-base">{editPayment?'Editar Pago':'Registrar Pago'}</h3>
              <button onClick={()=>setShowPayModal(false)} style={{color:'#64748b'}} className="hover:text-white transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{color:'#64748b'}}>Cliente *</label>
                <select value={payForm.client_id} onChange={e=>{const c=clients.find(x=>x.id===Number(e.target.value));setPayForm(p=>({...p,client_id:Number(e.target.value),amount:c?.plan_value??p.amount}))}} style={inputStyle} className={inputCls}>
                  <option value={0}>Seleccionar cliente...</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.name} — {c.cellphone}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{color:'#64748b'}}>Período * (YYYY-MM)</label>
                <input type="month" value={payForm.period} onChange={e=>setPayForm(p=>({...p,period:e.target.value}))} style={inputStyle} className={inputCls}/>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{color:'#64748b'}}>Monto *</label>
                <input type="number" value={payForm.amount} onChange={e=>setPayForm(p=>({...p,amount:Number(e.target.value)}))} style={inputStyle} className={inputCls}/>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{color:'#64748b'}}>Método de Pago</label>
                <select value={payForm.method} onChange={e=>setPayForm(p=>({...p,method:e.target.value}))} style={inputStyle} className={inputCls}>
                  {METHODS.map(m=><option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{color:'#64748b'}}>Estado</label>
                <select value={payForm.status} onChange={e=>setPayForm(p=>({...p,status:e.target.value}))} style={inputStyle} className={inputCls}>
                  <option value="paid">Pagado</option>
                  <option value="pending">Pendiente</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{color:'#64748b'}}>Notas</label>
                <textarea value={payForm.notes} onChange={e=>setPayForm(p=>({...p,notes:e.target.value}))} rows={2} style={inputStyle} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none transition-colors"/>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5" style={{borderTop:'1px solid #1e3a5f'}}>
              <button onClick={()=>setShowPayModal(false)} style={{border:'1px solid #1e3a5f',color:'#94a3b8'}} className="px-4 py-2 text-sm rounded-lg hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleSavePayment} style={{backgroundColor:'#16a34a'}} className="px-6 py-2 text-sm rounded-lg font-medium hover:bg-green-700 transition-colors">{editPayment?'Actualizar':'Guardar Pago'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
