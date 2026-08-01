'use client'
import { useEffect, useState, useCallback } from 'react'
import { PLANS, TV_PLAN, formatCurrency } from '@/lib/plans'
import { Wifi, Users, UserCheck, UserX, DollarSign, Bell, Plus, Trash2, Pencil, X, Tv } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

type Client = {
  id: number; name: string; email: string; phone: string; cellphone: string
  address: string; city: string; neighborhood: string; commune: string
  consumption_date: string; payment_date: string; plan: string; plan_value: number
  reference: string; status: string; notes: string; created_at: string
}
type Stats = { total: number; active: number; suspended: number; monthly_income: number }
const EMPTY = { name:'',email:'',phone:'',cellphone:'',address:'',city:'',neighborhood:'',commune:'',consumption_date:'',payment_date:'',plan:'',plan_value:0,reference:'',status:'active',notes:'' }

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<Stats>({ total:0, active:0, suspended:0, monthly_income:0 })
  const [showModal, setShowModal] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [sseConnected, setSseConnected] = useState(false)
  const [tab, setTab] = useState<'dashboard'|'plans'|'clients'>('dashboard')

  const fetchClients = useCallback(async () => {
    const res = await fetch('/api/clients')
    const data = await res.json()
    setClients(data.clients ?? [])
    setStats(data.stats ?? { total:0, active:0, suspended:0, monthly_income:0 })
  }, [])

  useEffect(() => { fetch('/api/init').then(() => fetchClients()) }, [fetchClients])

  useEffect(() => {
    const es = new EventSource('/api/sse')
    es.addEventListener('connected', () => setSseConnected(true))
    es.addEventListener('new-client', e => {
      const c = JSON.parse(e.data)
      setClients(prev => [c, ...prev])
      toast.success('✅ Nuevo cliente: ' + c.name)
      fetchClients()
    })
    es.addEventListener('update-client', e => {
      const u = JSON.parse(e.data)
      setClients(prev => prev.map(c => c.id === u.id ? u : c))
      toast.success('📝 Actualizado: ' + u.name)
    })
    es.addEventListener('delete-client', () => { fetchClients(); toast.success('🗑️ Cliente eliminado') })
    es.onerror = () => setSseConnected(false)
    return () => es.close()
  }, [fetchClients])

  const handleSave = async () => {
    if (!form.name || !form.cellphone || !form.plan) { toast.error('Completa los campos obligatorios'); return }
    const url = editClient ? `/api/clients/${editClient.id}` : '/api/clients'
    const res = await fetch(url, { method: editClient ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { setShowModal(false); setEditClient(null); setForm(EMPTY); fetchClients() }
    else toast.error('Error al guardar')
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este cliente?')) return
    await fetch(`/api/clients/${id}`, { method: 'DELETE' })
  }

  const openEdit = (c: Client) => { setEditClient(c); setForm({...c}); setShowModal(true) }
  const getPlanColor = (n: string) => PLANS.find(p => p.name === n)?.color ?? '#64748b'

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <Toaster position="top-right" />
      <header className="bg-[#0d1f3c] border-b border-blue-900/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 rounded-xl p-2"><Wifi className="w-6 h-6" /></div>
          <div><h1 className="text-xl font-bold">MEDI<span className="text-blue-400">FIBRA</span></h1><p className="text-xs text-blue-300">Sistema de Gestión</p></div>
        </div>
        <div className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full ${sseConnected ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
          <span className={`w-2 h-2 rounded-full animate-pulse ${sseConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          {sseConnected ? 'En vivo' : 'Desconectado'}
        </div>
      </header>

      <nav className="bg-[#0d1f3c] border-b border-blue-900/40 px-6 flex gap-1">
        {(['dashboard','plans','clients'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab===t ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
            {t === 'dashboard' ? 'Dashboard' : t === 'plans' ? 'Planes' : 'Clientes'}
          </button>
        ))}
      </nav>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {tab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label:'Total Clientes', value:stats.total, icon:<Users className="w-5 h-5"/>, color:'blue' },
                { label:'Activos', value:stats.active, icon:<UserCheck className="w-5 h-5"/>, color:'green' },
                { label:'Suspendidos', value:stats.suspended, icon:<UserX className="w-5 h-5"/>, color:'red' },
                { label:'Ingresos / Mes', value:formatCurrency(stats.monthly_income??0), icon:<DollarSign className="w-5 h-5"/>, color:'yellow' },
              ].map((s,i) => (
                <div key={i} className="bg-[#0d1f3c] rounded-xl p-4 border border-blue-900/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-400 text-xs">{s.label}</p>
                    <span className={`text-${s.color}-400`}>{s.icon}</span>
                  </div>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#0d1f3c] rounded-xl border border-blue-900/30 p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">Clientes Recientes</h2>
              <table className="w-full text-sm">
                <thead><tr className="text-slate-500 text-xs border-b border-blue-900/30">
                  {['Cliente','Plan','Valor','Estado'].map(h => <th key={h} className="text-left pb-2">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-blue-900/20">
                  {clients.slice(0,5).map(c => (
                    <tr key={c.id} className="text-slate-300 hover:bg-blue-900/10">
                      <td className="py-2.5 font-medium text-white">{c.name}</td>
                      <td className="py-2.5"><span className="px-2 py-0.5 rounded text-xs text-white" style={{backgroundColor:getPlanColor(c.plan)}}>{c.plan}</span></td>
                      <td className="py-2.5">{formatCurrency(c.plan_value)}</td>
                      <td className="py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs ${c.status==='active' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>{c.status==='active' ? 'Activo' : 'Suspendido'}</span></td>
                    </tr>
                  ))}
                  {!clients.length && <tr><td colSpan={4} className="py-8 text-center text-slate-500">No hay clientes aún</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'plans' && (
          <div className="space-y-6">
            <div className="text-center"><h2 className="text-2xl font-bold mb-1">Planes Disponibles</h2><p className="text-blue-400 text-sm">Conéctate con velocidad real 🚀</p></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {PLANS.map(plan => (
                <div key={plan.id} className="bg-[#0d1f3c] border border-blue-900/30 rounded-xl p-4 text-center hover:border-blue-500/50 hover:scale-105 transition-all">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{backgroundColor:plan.color}}>
                    <span className="text-white font-bold text-lg">{plan.label}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">Mbps</p>
                  <p className="text-lg font-bold mb-1">{formatCurrency(plan.value)}</p>
                  <p className="text-xs text-slate-500">mensuales</p>
                  <div className="mt-3 flex justify-center"><Wifi className="w-5 h-5" style={{color:plan.color}} /></div>
                </div>
              ))}
            </div>
            <div className="bg-[#0d1f3c] border border-blue-900/30 rounded-xl p-5 flex items-center gap-4">
              <div className="bg-blue-700 rounded-xl p-3"><Tv className="w-6 h-6" /></div>
              <div><h3 className="font-semibold">Televisión</h3><p className="text-slate-400 text-sm">Cada punto: <span className="text-blue-400 font-bold">{formatCurrency(TV_PLAN.value)}</span></p></div>
            </div>
            <div className="bg-[#0d1f3c] border border-blue-900/30 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Clientes por Plan</h3>
              <div className="space-y-3">
                {PLANS.map(plan => {
                  const count = clients.filter(c => c.plan === plan.name).length
                  const pct = clients.length ? Math.round((count/clients.length)*100) : 0
                  return (
                    <div key={plan.id}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">{plan.name}</span><span className="text-slate-300">{count} · {pct}%</span></div>
                      <div className="h-2 bg-blue-900/30 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${pct}%`,backgroundColor:plan.color}} /></div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'clients' && (
          <div className="bg-[#0d1f3c] rounded-xl border border-blue-900/30">
            <div className="flex items-center justify-between p-5 border-b border-blue-900/30">
              <h2 className="font-semibold">Gestión de Clientes ({clients.length})</h2>
              <button onClick={() => { setEditClient(null); setForm(EMPTY); setShowModal(true) }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-sm px-4 py-2 rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Nuevo Cliente
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-slate-500 text-xs border-b border-blue-900/30">
                  {['Cliente','Celular','Plan','Valor','F. Pago','Referencia','Estado','Acciones'].map(h => <th key={h} className="text-left px-5 py-3">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-blue-900/20">
                  {clients.map(c => (
                    <tr key={c.id} className="text-slate-300 hover:bg-blue-900/10">
                      <td className="px-5 py-3 font-medium text-white">{c.name}</td>
                      <td className="px-5 py-3">{c.cellphone}</td>
                      <td className="px-5 py-3"><span className="px-2 py-0.5 rounded text-xs text-white" style={{backgroundColor:getPlanColor(c.plan)}}>{c.plan}</span></td>
                      <td className="px-5 py-3">{formatCurrency(c.plan_value)}</td>
                      <td className="px-5 py-3 text-xs">{c.payment_date}</td>
                      <td className="px-5 py-3 text-xs text-slate-400">{c.reference}</td>
                      <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${c.status==='active' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>{c.status==='active' ? 'Activo' : 'Suspendido'}</span></td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(c)} className="text-blue-400 hover:text-blue-300"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!clients.length && <tr><td colSpan={8} className="py-12 text-center text-slate-500">No hay clientes. ¡Agrega el primero!</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1f3c] border border-blue-900/40 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-blue-900/30">
              <h3 className="font-semibold">{editClient ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[{label:'Nombre Completo *',key:'name',type:'text'},{label:'Celular *',key:'cellphone',type:'text'},{label:'Correo',key:'email',type:'email'},{label:'Teléfono Fijo',key:'phone',type:'text'},{label:'Dirección',key:'address',type:'text'},{label:'Ciudad',key:'city',type:'text'},{label:'Barrio',key:'neighborhood',type:'text'},{label:'Comuna',key:'commune',type:'text'},{label:'Fecha Consumo',key:'consumption_date',type:'date'},{label:'Fecha Pago',key:'payment_date',type:'date'},{label:'Referencia / Llave BRE-B',key:'reference',type:'text'}].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                  <input type={f.type} value={(form as Record<string,string|number>)[f.key] as string} onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))} className="w-full bg-[#0a1628] border border-blue-900/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Plan *</label>
                <select value={form.plan} onChange={e => { const p=PLANS.find(x=>x.name===e.target.value); setForm(prev=>({...prev,plan:e.target.value,plan_value:p?.value??0})) }} className="w-full bg-[#0a1628] border border-blue-900/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">Seleccionar plan...</option>
                  {PLANS.map(p => <option key={p.id} value={p.name}>{p.name} — {formatCurrency(p.value)}/mes</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Valor ($)</label>
                <input type="number" value={form.plan_value} onChange={e => setForm(p => ({...p,plan_value:Number(e.target.value)}))} className="w-full bg-[#0a1628] border border-blue-900/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Estado</label>
                <select value={form.status} onChange={e => setForm(p => ({...p,status:e.target.value}))} className="w-full bg-[#0a1628] border border-blue-900/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="active">Activo</option>
                  <option value="suspended">Suspendido</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Novedades</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({...p,notes:e.target.value}))} rows={3} className="w-full bg-[#0a1628] border border-blue-900/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-blue-900/30">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 border border-blue-900/40 rounded-lg hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleSave} className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors">{editClient ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
