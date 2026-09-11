'use client'
import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, Clock, FileText, Search, Zap, ExternalLink, Trash2, ChevronDown } from 'lucide-react'

type Invoice = {
  id: number; client_id: number; client_name: string; cellphone: string
  invoice_number: string; period: string; amount: number; plan: string
  plan_value: number; status: string; due_date: string; paid_at: string
  method: string; notes: string; created_at: string; incluye_tv: number
}
type Stats = { total: number; paid: number; pending: number; totalAmount: number; paidAmount: number }

function fmt(v: number) { return '$' + v.toLocaleString('es-CO') }
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('es-CO') : '—' }

const METHODS = ['efectivo','bancolombia','nequi','bre-b','transferencia']
const now = new Date()
const CURRENT_PERIOD = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
const PREV_PERIOD = (() => { const d = new Date(now.getFullYear(), now.getMonth()-1, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` })()

export default function FacturasTab({
  BG, CARD, CARD2, BORDER, TEXT, MUTED
}: {
  BG: string; CARD: string; CARD2: string; BORDER: string; TEXT: string; MUTED: string
}) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats,    setStats]    = useState<Stats>({ total:0, paid:0, pending:0, totalAmount:0, paidAmount:0 })
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState<number|null>(null)
  const [search,   setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [period,   setPeriod]   = useState(CURRENT_PERIOD)
  const [generating, setGenerating] = useState(false)
  const [genResult,  setGenResult]  = useState<{created:number;skipped:number}|null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (filterStatus) params.set('status', filterStatus)
      const r = await fetch(`/api/invoices?${params}`)
      const data = await r.json()
      setInvoices(data.invoices || [])
      setStats(data.stats || { total:0, paid:0, pending:0, totalAmount:0, paidAmount:0 })
    } catch {}
    finally { setLoading(false) }
  }, [period, filterStatus])

  useEffect(() => { load() }, [load])

  const markPaid = async (inv: Invoice, method: string) => {
    setSaving(inv.id)
    try {
      await fetch(`/api/invoices/${inv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', method })
      })
      await load()
    } catch {}
    finally { setSaving(null) }
  }

  const markPending = async (inv: Invoice) => {
    setSaving(inv.id)
    try {
      await fetch(`/api/invoices/${inv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' })
      })
      await load()
    } catch {}
    finally { setSaving(null) }
  }

  const deleteInv = async (id: number) => {
    if (!confirm('¿Eliminar esta factura?')) return
    try {
      await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
      await load()
    } catch {}
  }

  const generate = async () => {
    setGenerating(true)
    setGenResult(null)
    try {
      const r = await fetch('/api/invoices/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period })
      })
      const data = await r.json()
      setGenResult({ created: data.created, skipped: data.skipped })
      await load()
    } catch {}
    finally { setGenerating(false) }
  }

  const filtered = invoices.filter(inv =>
    inv.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.cellphone?.includes(search)
  )

  const pctPaid = stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0

  return (
    <div className="space-y-4 max-w-5xl mx-auto">

      {/* Header métricas */}
      <div className="rounded-xl p-5" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold" style={{ color: TEXT }}>Facturación</h2>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>Gestión de facturas y cobros por período</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="text-sm rounded-lg px-3 py-1.5 outline-none"
              style={{ backgroundColor: CARD2, border: `1px solid ${BORDER}`, color: TEXT }}>
              <option value={CURRENT_PERIOD}>Mes actual ({CURRENT_PERIOD})</option>
              <option value={PREV_PERIOD}>Mes anterior ({PREV_PERIOD})</option>
            </select>
            <button onClick={generate} disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              style={{ backgroundColor: '#4f6ef720', border: '1px solid #4f6ef7', color: '#4f6ef7' }}>
              <Zap className="w-3.5 h-3.5"/>
              {generating ? 'Generando...' : 'Generar ciclo'}
            </button>
          </div>
        </div>

        {genResult && (
          <div className="mb-3 px-3 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: '#6ee7b715', border: '1px solid #6ee7b7', color: '#6ee7b7' }}>
            Ciclo generado: {genResult.created} facturas nuevas · {genResult.skipped} ya existían
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total',     value: stats.total,                    color: TEXT },
            { label: 'Pagadas',   value: stats.paid,                     color: '#6ee7b7' },
            { label: 'Pendientes',value: stats.pending,                  color: '#fb923c' },
            { label: 'Recaudado', value: fmt(stats.paidAmount),          color: '#4f6ef7' },
          ].map(m => (
            <div key={m.label} className="rounded-lg p-3" style={{ backgroundColor: CARD2 }}>
              <p className="text-xs" style={{ color: MUTED }}>{m.label}</p>
              <p className="text-xl font-black mt-0.5" style={{ color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <div className="w-full rounded-full h-2" style={{ backgroundColor: CARD2 }}>
            <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pctPaid}%`, backgroundColor: '#6ee7b7' }}/>
          </div>
          <p className="text-xs mt-1 text-right" style={{ color: MUTED }}>{pctPaid}% cobrado · {fmt(stats.totalAmount - stats.paidAmount)} pendiente</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente, factura o celular..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, color: TEXT }}/>
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-sm rounded-xl px-3 py-2 outline-none"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="">Todos</option>
          <option value="pending">Pendientes</option>
          <option value="paid">Pagadas</option>
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: MUTED }}/>
          <p className="font-semibold" style={{ color: TEXT }}>
            {stats.total === 0 ? 'Sin facturas para este período' : 'No hay resultados'}
          </p>
          {stats.total === 0 && (
            <p className="text-xs mt-1" style={{ color: MUTED }}>Presiona "Generar ciclo" para crear las facturas del mes</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          {filtered.map((inv, i) => {
            const isPaid = inv.status === 'paid'
            const isSaving = saving === inv.id
            return (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3.5 text-sm"
                style={{ backgroundColor: i % 2 === 0 ? CARD : BG, borderTop: i > 0 ? `1px solid ${BORDER}` : undefined, opacity: isSaving ? 0.6 : 1 }}>

                {/* Estado indicator */}
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: isPaid ? '#6ee7b7' : '#fb923c' }}/>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate" style={{ color: TEXT }}>{inv.client_name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: CARD2, color: MUTED }}>{inv.invoice_number}</span>
                    {isPaid && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#6ee7b720', color: '#6ee7b7' }}>Pagada</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                    <span className="text-xs" style={{ color: MUTED }}>{inv.cellphone || '—'}</span>
                    <span className="text-xs font-medium" style={{ color: '#4f6ef7' }}>{inv.plan}</span>
                    <span className="text-xs font-bold" style={{ color: TEXT }}>{fmt(inv.amount)}</span>
                    <span className="text-xs" style={{ color: MUTED }}>Vence: {fmtDate(inv.due_date)}</span>
                    {isPaid && <span className="text-xs" style={{ color: '#6ee7b7' }}>Pagó: {fmtDate(inv.paid_at)} · {inv.method}</span>}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!isPaid ? (
                    <select onChange={e => { if (e.target.value) markPaid(inv, e.target.value) }}
                      defaultValue=""
                      className="text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                      style={{ backgroundColor: '#6ee7b720', border: '1px solid #6ee7b7', color: '#6ee7b7' }}>
                      <option value="" disabled>Marcar pagada</option>
                      {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : (
                    <button onClick={() => markPending(inv)} title="Revertir a pendiente"
                      className="p-1.5 rounded-lg text-xs transition-all"
                      style={{ backgroundColor: CARD2, border: `1px solid ${BORDER}`, color: MUTED }}>
                      <Clock className="w-3.5 h-3.5"/>
                    </button>
                  )}
                  <a href={`/factura/${inv.client_id}`} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg transition-all"
                    style={{ backgroundColor: CARD2, border: `1px solid ${BORDER}`, color: MUTED }}>
                    <ExternalLink className="w-3.5 h-3.5"/>
                  </a>
                  <button onClick={() => deleteInv(inv.id)}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ backgroundColor: CARD2, border: `1px solid ${BORDER}`, color: '#f87171' }}>
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
