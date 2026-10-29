'use client'
import { useEffect, useState, useCallback } from 'react'
import { Search, CheckCircle, DollarSign } from 'lucide-react'

type Cliente = {
  id: number; name: string; cellphone: string; plan: string
  plan_value: number; classification: string; dia_pago: string; incluye_tv: number
}
type PagoReciente = {
  id: number; client_name: string; cellphone: string
  amount: number; method: string; period: string; created_at: string
}
const METHODS = ['efectivo','bancolombia','bre-b','nequi']
const CLS_AL_DIA = ['AL_DIA']
function fmt(v: number) { return '$' + v.toLocaleString('es-CO') }
function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
function puedeRegistrar(diaPago: string): boolean {
  if (!diaPago) return true
  const dia = parseInt(diaPago, 10)
  if (isNaN(dia)) return true
  return new Date().getDate() >= dia - 3
}
export default function PagosTab({ BG, CARD, CARD2, BORDER, TEXT, MUTED }: {
  BG: string; CARD: string; CARD2: string; BORDER: string; TEXT: string; MUTED: string
}) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Cliente[]>([])
  const [allClients, setAllClients] = useState<Cliente[]>([])
  const [searching, setSearching] = useState(false)
  const [recientes, setRecientes] = useState<PagoReciente[]>([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [pagados, setPagados] = useState<Set<number>>(new Set())
  const [forms, setForms] = useState<Record<number,{amount:number;method:string;notes:string}>>({}) 
  const [cobradoMes, setCobradoMes] = useState(0)
  const loadInit = useCallback(async () => {
    setLoadingInit(true)
    try {
      const [rc, rp] = await Promise.all([fetch('/api/clients?limit=600'), fetch('/api/payments')])
      const dc = await rc.json()
      const dp = await rp.json()
      const todos: Cliente[] = dc.clients || []
      setAllClients(todos)
      const f: Record<number,{amount:number;method:string;notes:string}> = {}
      todos.forEach(c => { f[c.id] = { amount: c.plan_value, method: 'efectivo', notes: '' } })
      setForms(f)
      const pagos: PagoReciente[] = (dp.payments || []).slice(0, 20)
      setRecientes(pagos)
      setCobradoMes(pagos.reduce((s, p) => s + (p.amount || 0), 0))
    } catch (e) { console.error('Error:', e) }
    finally { setLoadingInit(false) }
  }, [])
  useEffect(() => { loadInit() }, [loadInit])
  useEffect(() => {
    const q = normalizar(search.trim())
    if (!q) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(() => {
      setResults(allClients.filter(c =>
        normalizar(c.name).includes(q) || (c.cellphone || '').includes(q)
      ).slice(0, 30))
      setSearching(false)
    }, 150)
    return () => clearTimeout(t)
  }, [search, allClients])
  const registrarPago = async (c: Cliente) => {
    const f = forms[c.id]
    if (!f?.amount) { alert('Ingresa un monto valido'); return }
    setSaving(c.id)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: c.id, amount: f.amount,
          period: new Date().toISOString().slice(0,7), method: f.method,
          status: 'paid', notes: f.notes || 'Registrado desde modulo Pagos' })
      })
      if (!res.ok) { const e = await res.json(); alert('Error: '+(e.error||res.status)); return }
      const data = await res.json()
      const newClass = data.client?.classification ?? 'AL_DIA'
      setPagados(prev => new Set([...prev, c.id]))
      setAllClients(prev => prev.map(x => x.id===c.id ? {...x, classification: newClass} : x))
      const nuevo: PagoReciente = { id: Date.now(), client_name: c.name, cellphone: c.cellphone,
        amount: f.amount, method: f.method, period: new Date().toISOString().slice(0,7),
        created_at: new Date().toISOString() }
      setRecientes(prev => [nuevo, ...prev.slice(0,19)])
      setCobradoMes(prev => prev + f.amount)
    } catch (e) { alert('Error: '+String(e)) }
    finally { setSaving(null) }
  }
  const upd = (id: number, field: string, value: string|number) =>
    setForms(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  const renderC = (c: Cliente, i: number) => {
    const ya = pagados.has(c.id) || CLS_AL_DIA.includes(c.classification)
    const isSaving = saving === c.id
    const f = forms[c.id] || { amount: c.plan_value, method: 'efectivo', notes: '' }
    const ok = puedeRegistrar(c.dia_pago)
    return (
      <div key={c.id} style={{ backgroundColor: i%2===0?CARD:BG,
        borderTop: i>0?`1px solid ${BORDER}`:undefined, opacity: isSaving?0.6:1 }}
        className='px-3 py-3 sm:px-4'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3'>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <span className='font-semibold text-sm' style={{color:TEXT}}>{c.name}</span>
              {ya && <span className='text-xs px-1.5 py-0.5 rounded-full font-semibold'
                style={{backgroundColor:'#6ee7b720',color:'#6ee7b7',border:'1px solid #6ee7b740'}}>Al dia</span>}
              {!ok&&!ya&&<span className='text-xs px-1.5 py-0.5 rounded-full'
                style={{backgroundColor:'#4f6ef720',color:'#4f6ef7'}}>
                Disponible dia {parseInt(c.dia_pago)-3}</span>}
            </div>
            <div className='flex flex-wrap gap-x-3 mt-0.5 text-xs' style={{color:MUTED}}>
              <span>{c.cellphone||'—'}</span>
              <span style={{color:'#4f6ef7'}}>{c.plan}</span>
              <span className='font-bold' style={{color:TEXT}}>{fmt(c.plan_value)}</span>
              {c.incluye_tv>0&&<span>+TV {fmt(c.incluye_tv)}</span>}
              {c.dia_pago&&<span>Dia {c.dia_pago}</span>}
            </div>
          </div>
          {!ya&&ok&&(
            <div className='flex items-center gap-2 flex-wrap'>
              <input type='number' value={f.amount}
                onChange={e=>upd(c.id,'amount',Number(e.target.value))}
                className='w-24 text-sm rounded-lg px-2 py-1.5 outline-none text-right font-bold'
                style={{backgroundColor:CARD2,border:`1px solid ${BORDER}`,color:TEXT}}/>
              <select value={f.method} onChange={e=>upd(c.id,'method',e.target.value)}
                className='text-xs rounded-lg px-2 py-1.5 outline-none'
                style={{backgroundColor:CARD2,border:`1px solid ${BORDER}`,color:TEXT}}>
                {METHODS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <input type='text' value={f.notes} onChange={e=>upd(c.id,'notes',e.target.value)}
                placeholder='Observacion...'
                className='w-28 text-xs rounded-lg px-2 py-1.5 outline-none'
                style={{backgroundColor:CARD2,border:`1px solid ${BORDER}`,color:TEXT}}/>
              <button onClick={()=>registrarPago(c)} disabled={isSaving}
                className='flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40'
                style={{backgroundColor:'#6ee7b720',border:'1px solid #6ee7b7',color:'#6ee7b7'}}>
                <CheckCircle className='w-3.5 h-3.5'/>
                {isSaving?'Guardando...':'Registrar'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }
  if (loadingInit) return (
    <div className='flex items-center justify-center h-64'>
      <div className='text-center'>
        <div className='w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3'/>
        <p className='text-sm' style={{color:MUTED}}>Cargando...</p>
      </div>
    </div>
  )
  return (
    <div className='space-y-4 max-w-5xl mx-auto'>
      <div className='grid grid-cols-2 gap-3'>
        <div className='rounded-xl p-4' style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}}>
          <p className='text-xs' style={{color:MUTED}}>Cobrado este mes</p>
          <p className='text-2xl font-black mt-1' style={{color:'#6ee7b7'}}>{fmt(cobradoMes)}</p>
        </div>
        <div className='rounded-xl p-4' style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}}>
          <p className='text-xs' style={{color:MUTED}}>Clientes totales</p>
          <p className='text-2xl font-black mt-1' style={{color:TEXT}}>{allClients.length}</p>
        </div>
      </div>
      <div className='rounded-xl p-4' style={{backgroundColor:CARD,border:`1px solid ${BORDER}`}}>
        <h2 className='text-base font-bold mb-3' style={{color:TEXT}}>Registro de pagos</h2>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4' style={{color:MUTED}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder='Buscar cliente por nombre o celular...' autoComplete='off'
            className='w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none'
            style={{backgroundColor:CARD2,border:`1px solid ${BORDER}`,color:TEXT}}/>
          {searching&&<div className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin'/>}
        </div>
        {search.trim().length>0&&(
          <div className='mt-3 rounded-xl overflow-hidden' style={{border:`1px solid ${BORDER}`}}>
            {results.length===0&&!searching
              ?<p className='text-xs px-4 py-3' style={{color:MUTED}}>Sin resultados</p>
              :results.map((c,i)=>renderC(c,i))}
          </div>
        )}
        {search.trim().length===0&&(
          <p className='text-xs mt-2 text-center' style={{color:MUTED}}>
            Escribe el nombre o celular del cliente para buscar
          </p>
        )}
      </div>
      {recientes.length>0&&(
        <div className='rounded-xl overflow-hidden' style={{border:`1px solid ${BORDER}`}}>
          <div className='flex items-center gap-2 px-4 py-3'
            style={{backgroundColor:CARD,borderBottom:`1px solid ${BORDER}`}}>
            <DollarSign className='w-4 h-4' style={{color:'#6ee7b7'}}/>
            <span className='text-sm font-bold' style={{color:TEXT}}>Pagos recientes</span>
          </div>
          {recientes.map((p,i)=>(
            <div key={p.id} className='flex items-center justify-between px-4 py-2.5 text-sm'
              style={{backgroundColor:i%2===0?CARD:BG,borderTop:i>0?`1px solid ${BORDER}`:undefined}}>
              <div className='min-w-0 flex-1'>
                <span className='font-semibold' style={{color:TEXT}}>{p.client_name}</span>
                <span className='text-xs ml-2' style={{color:MUTED}}>{p.cellphone} · {p.method}</span>
              </div>
              <div className='text-right flex-shrink-0'>
                <span className='font-bold' style={{color:'#6ee7b7'}}>{fmt(p.amount)}</span>
                <span className='text-xs ml-2' style={{color:MUTED}}>{p.period}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}