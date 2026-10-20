'use client'
import { useEffect, useState, useCallback } from 'react'
import { Search, CheckCircle, AlertCircle, Clock, DollarSign } from 'lucide-react'

type Cliente = {
  id: number
  name: string
  cellphone: string
  plan: string
  plan_value: number
  classification: string
  dia_pago: string
  incluye_tv: number
}

type PagoReciente = {
  id: number
  client_name: string
  cellphone: string
  amount: number
  method: string
  period: string
  created_at: string
}

const METHODS = ['efectivo','bancolombia','bre-b','transferencia']
const CLS_URGENTE = ['DEUDA_PENDIENTE','RECOGER_EQUIPO']
const CLS_PROXIMO = ['PROXIMO_PAGAR','RECORDAR_RECIBO']
function fmt(v: number) { return '$' + v.toLocaleString('es-CO') }

export default function PagosTab({
  BG, CARD, CARD2, BORDER, TEXT, MUTED
}: {
  BG: string; CARD: string; CARD2: string; BORDER: string; TEXT: string; MUTED: string
}) {
  const [search, setSearch]           = useState('')
  const [results, setResults]         = useState<Cliente[]>([])
  const [searching, setSearching]     = useState(false)
  const [deudores, setDeudores]       = useState<Cliente[]>([])
  const [proximos, setProximos]       = useState<Cliente[]>([])
  const [recientes, setRecientes]     = useState<PagoReciente[]>([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [saving, setSaving]           = useState<number|null>(null)
  const [pagados, setPagados]         = useState<Set<number>>(new Set())
  const [forms, setForms]             = useState<Record<number,{amount:number;method:string;notes:string}>>({})
  const [statsHoy, setStatsHoy]       = useState({ cobradoMes: 0, totalPagos: 0 })

  const loadInit = useCallback(async () => {
    setLoadingInit(true)
    try {
      const [rd, rp] = await Promise.all([
        fetch('/api/cobros'),
        fetch('/api/payments')
      ])
      const dd = await rd.json()
      const dp = await rp.json()
      const todos: Cliente[] = dd.clients || []
      setDeudores(todos.filter(c => CLS_URGENTE.includes(c.classification)))
      setProximos(todos.filter(c => CLS_PROXIMO.includes(c.classification)))
      const pagos: PagoReciente[] = (dp.payments || []).slice(0, 20)
      setRecientes(pagos)
      const cobradoMes = pagos.reduce((sum, p) => sum + (p.amount || 0), 0)
      setStatsHoy({
        cobradoMes,
        totalPagos: pagos.length
      })
      // Pre-llenar formularios
      const f: Record<number,{amount:number;method:string;notes:string}> = {}
      todos.forEach(c => {
        f[c.id] = { amount: c.plan_value, method: 'efectivo', notes: '' }
      })
      setForms(f)
    } catch (e) {
      alert('Error cargando datos: ' + String(e))
    } finally {
      setLoadingInit(false)
    }
  }, [])

  useEffect(() => { loadInit() }, [loadInit])

  // Búsqueda con debounce
  useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await fetch(`/api/clients?search=${encodeURIComponent(search)}&limit=10`)
        const d = await r.json()
        const lista: Cliente[] = d.clients || []
        setResults(lista)
        // Pre-llenar formularios para resultados nuevos
        setForms(prev => {
          const f = { ...prev }
          lista.forEach(c => {
            if (!f[c.id]) f[c.id] = { amount: c.plan_value, method: 'efectivo', notes: '' }
          })
          return f
        })
      } catch {}
      finally { setSearching(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const registrarPago = async (cliente: Cliente) => {
    const f = forms[cliente.id]
    if (!f || !f.amount) { alert('Ingresa un monto válido'); return }
    setSaving(cliente.id)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: cliente.id,
          amount: f.amount,
          period: new Date().toISOString().slice(0, 7),
          method: f.method,
          status: 'paid',
          notes: f.notes || 'Registrado desde módulo Pagos'
        })
      })
      if (!res.ok) {
        const e = await res.json()
        alert('Error: ' + (e.error || res.status))
        return
      }
      setPagados(prev => new Set([...prev, cliente.id]))
      setRecientes(prev => {
        const nuevo: PagoReciente = {
          id: Date.now(),
          client_name: cliente.name,
          cellphone: cliente.cellphone,
          amount: f.amount,
          method: f.method,
          period: new Date().toISOString().slice(0, 7),
          created_at: new Date().toISOString()
        }
        return [nuevo, ...prev.slice(0, 19)]
      })
      setStatsHoy(prev => ({ cobradoMes: prev.cobradoMes + f.amount, totalPagos: prev.totalPagos + 1 }))
    } catch (e) {
      alert('Error inesperado: ' + String(e))
    } finally {
      setSaving(null)
    }
  }

  const updateForm = (id: number, field: string, value: string|number) => {
    setForms(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const renderCliente = (c: Cliente, i: number, showBg = true) => {
    const ya = pagados.has(c.id)
    const isSaving = saving === c.id
    const f = forms[c.id] || { amount: c.plan_value, method: 'efectivo', notes: '' }
    const esUrgente = CLS_URGENTE.includes(c.classification)
    return (
      <div key={c.id}
        style={{ backgroundColor: showBg && i % 2 === 0 ? CARD : BG, borderTop: i > 0 ? `1px solid ${BORDER}` : undefined, opacity: isSaving ? 0.6 : 1 }}
        className="px-4 py-3">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm" style={{ color: TEXT }}>{c.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: esUrgente ? '#ef444420' : '#fb923c20', color: esUrgente ? '#ef4444' : '#fb923c' }}>
                {c.classification.replace(/_/g,' ')}
              </span>
              {ya && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#6ee7b720', color: '#6ee7b7' }}>Pagado</span>}
            </div>
            <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs" style={{ color: MUTED }}>
              <span>{c.cellphone || '—'}</span>
              <span style={{ color: '#4f6ef7' }}>{c.plan}</span>
              <span className="font-bold" style={{ color: TEXT }}>{fmt(c.plan_value)}</span>
              {c.incluye_tv > 0 && <span>+TV {fmt(c.incluye_tv)}</span>}
            </div>
          </div>
          {!ya && (
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              <input type="number" value={f.amount}
                onChange={e => updateForm(c.id, 'amount', Number(e.target.value))}
                className="w-24 text-sm rounded-lg px-2 py-1.5 outline-none text-right font-bold"
                style={{ backgroundColor: CARD2, border: `1px solid ${BORDER}`, color: TEXT }}/>
              <select value={f.method}
                onChange={e => updateForm(c.id, 'method', e.target.value)}
                className="text-xs rounded-lg px-2 py-1.5 outline-none"
                style={{ backgroundColor: CARD2, border: `1px solid ${BORDER}`, color: TEXT }}>
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input type="text" value={f.notes}
                onChange={e => updateForm(c.id, 'notes', e.target.value)}
                placeholder="Observación..."
                className="w-28 text-xs rounded-lg px-2 py-1.5 outline-none"
                style={{ backgroundColor: CARD2, border: `1px solid ${BORDER}`, color: TEXT }}/>
              <button onClick={() => registrarPago(c)} disabled={isSaving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                style={{ backgroundColor: '#6ee7b720', border: '1px solid #6ee7b7', color: '#6ee7b7' }}>
                <CheckCircle className="w-3.5 h-3.5"/>
                {isSaving ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loadingInit) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-sm" style={{ color: MUTED }}>Cargando...</p>
      </div>
    </div>
  )

  const mostrarResultados = search.trim().length > 0

  return (
    <div className="space-y-4 max-w-5xl mx-auto">

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-xs" style={{ color: MUTED }}>Cobrado este mes</p>
          <p className="text-xl font-black mt-1" style={{ color: '#6ee7b7' }}>{fmt(statsHoy.cobradoMes)}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-xs" style={{ color: MUTED }}>Clientes con deuda</p>
          <p className="text-xl font-black mt-1" style={{ color: '#ef4444' }}>{deudores.length}</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="rounded-xl p-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: TEXT }}>Registrar pago</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente por nombre o celular..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: CARD2, border: `1px solid ${BORDER}`, color: TEXT }}/>
          {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>}
        </div>
        {mostrarResultados && (
          <div className="mt-2 rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            {results.length === 0 && !searching
              ? <p className="text-xs px-4 py-3" style={{ color: MUTED }}>Sin resultados</p>
              : results.map((c, i) => renderCliente(c, i, false))
            }
          </div>
        )}
      </div>

      {/* Deudores urgentes */}
      {deudores.length > 0 && !mostrarResultados && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid #ef444440` }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: '#ef444415', borderBottom: `1px solid #ef444430` }}>
            <AlertCircle className="w-4 h-4" style={{ color: '#ef4444' }}/>
            <span className="text-sm font-bold" style={{ color: '#ef4444' }}>Deuda pendiente — {deudores.length} clientes</span>
          </div>
          {deudores.filter(c => !pagados.has(c.id)).map((c, i) => renderCliente(c, i))}
          {deudores.every(c => pagados.has(c.id)) && (
            <p className="text-xs px-4 py-3 text-center" style={{ color: '#6ee7b7' }}>Todos al día</p>
          )}
        </div>
      )}

      {/* Próximos a pagar */}
      {proximos.length > 0 && !mostrarResultados && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid #fb923c40` }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: '#fb923c15', borderBottom: `1px solid #fb923c30` }}>
            <Clock className="w-4 h-4" style={{ color: '#fb923c' }}/>
            <span className="text-sm font-bold" style={{ color: '#fb923c' }}>Próximos a pagar — {proximos.length} clientes</span>
          </div>
          {proximos.filter(c => !pagados.has(c.id)).map((c, i) => renderCliente(c, i))}
          {proximos.every(c => pagados.has(c.id)) && (
            <p className="text-xs px-4 py-3 text-center" style={{ color: '#6ee7b7' }}>Todos al día</p>
          )}
        </div>
      )}

      {/* Pagos recientes */}
      {recientes.length > 0 && !mostrarResultados && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: CARD, borderBottom: `1px solid ${BORDER}` }}>
            <DollarSign className="w-4 h-4" style={{ color: '#6ee7b7' }}/>
            <span className="text-sm font-bold" style={{ color: TEXT }}>Pagos recientes</span>
          </div>
          {recientes.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm"
              style={{ backgroundColor: i % 2 === 0 ? CARD : BG, borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}>
              <div>
                <span className="font-semibold" style={{ color: TEXT }}>{p.client_name}</span>
                <span className="text-xs ml-2" style={{ color: MUTED }}>{p.cellphone} · {p.method}</span>
              </div>
              <div className="text-right">
                <span className="font-bold" style={{ color: '#6ee7b7' }}>{fmt(p.amount)}</span>
                <span className="text-xs ml-2" style={{ color: MUTED }}>{p.period}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
