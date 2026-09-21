'use client'
import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, Search, Phone, MapPin, Calendar } from 'lucide-react'

type PClient = {
  id: number
  name: string
  cellphone: string
  plan: string
  plan_value: number
  classification: string
  dia_pago: string
  address: string
  incluye_tv: number
}

const DIAS = ['5','10','12','15','20','25','30']
function fmt(v: number) { return '$' + v.toLocaleString('es-CO') }

export default function PorConfirmarTab({
  BG, CARD, CARD2, BORDER, TEXT, MUTED
}: {
  BG: string; CARD: string; CARD2: string; BORDER: string; TEXT: string; MUTED: string
}) {
  const [clients, setClients]   = useState<PClient[]>([])
  const [loading, setLoading]   = useState(true)
  const [search,  setSearch]    = useState('')
  const [saving,  setSaving]    = useState<number | null>(null)
  const [selected, setSelected] = useState<Record<number, string>>({})
  const [done,    setDone]      = useState<Set<number>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/por-confirmar')
      const data = await r.json()
      const list: PClient[] = data.clients || []
      setClients(list)
      const init: Record<number,string> = {}
      list.forEach(c => { init[c.id] = c.dia_pago || '' })
      setSelected(init)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const confirm = async (clientId: number) => {
    const dia = selected[clientId]
    if (!dia) return
    setSaving(clientId)
    try {
      const r = await fetch('/api/por-confirmar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, dia_pago: dia })
      })
      if (r.ok) {
        setDone(prev => new Set([...prev, clientId]))
      }
    } catch {}
    finally { setSaving(null) }
  }

  const filtered = clients.filter(c =>
    !done.has(c.id) &&
    c.name.toLowerCase().includes(search.toLowerCase())
  )
  const confirmedCount = done.size

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-sm" style={{ color: MUTED }}>Cargando...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 max-w-4xl mx-auto">

      {/* Header */}
      <div className="rounded-xl p-5" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold" style={{ color: TEXT }}>Clientes Por Confirmar</h2>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>
              Asigna el día de pago oficial a cada cliente nuevo
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black" style={{ color: '#f59e0b' }}>{filtered.length}</span>
              <span className="text-sm" style={{ color: MUTED }}>pendientes</span>
              {confirmedCount > 0 && (
                <span className="ml-2 text-sm font-bold" style={{ color: '#6ee7b7' }}>
                  · {confirmedCount} confirmados
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Barra progreso */}
        {(filtered.length + confirmedCount) > 0 && (
          <>
            <div className="w-full rounded-full h-2 mt-3" style={{ backgroundColor: CARD2 }}>
              <div className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((confirmedCount / (filtered.length + confirmedCount)) * 100)}%`, backgroundColor: '#6ee7b7' }}/>
            </div>
            <p className="text-xs mt-1 text-right" style={{ color: MUTED }}>
              {Math.round((confirmedCount / (filtered.length + confirmedCount)) * 100)}% completado
            </p>
          </>
        )}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }}/>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, color: TEXT }}
        />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#6ee7b7' }}/>
          <p className="font-semibold" style={{ color: TEXT }}>
            {search ? 'No se encontraron resultados' : 'Todos los clientes confirmados'}
          </p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            {search ? 'Intenta con otro nombre' : 'No hay clientes pendientes por confirmar'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          {filtered.map((c, i) => {
            const isSaving = saving === c.id
            const dia = selected[c.id] || ''
            const canConfirm = dia !== ''
            return (
              <div key={c.id}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{
                  backgroundColor: i % 2 === 0 ? CARD : BG,
                  borderTop: i > 0 ? `1px solid ${BORDER}` : undefined,
                  opacity: isSaving ? 0.6 : 1
                }}>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: TEXT }}>{c.name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                    {c.cellphone && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: MUTED }}>
                        <Phone className="w-3 h-3"/>{c.cellphone}
                      </span>
                    )}
                    {c.address && (
                      <span className="flex items-center gap-1 text-xs truncate max-w-[200px]" style={{ color: MUTED }}>
                        <MapPin className="w-3 h-3"/>{c.address}
                      </span>
                    )}
                    <span className="text-xs font-medium" style={{ color: '#4f6ef7' }}>{c.plan}</span>
                    <span className="text-xs font-bold" style={{ color: TEXT }}>{fmt(c.plan_value)}</span>
                    {c.incluye_tv > 0 && <span className="text-xs" style={{ color: MUTED }}>+ TV</span>}
                  </div>
                </div>

                {/* Selector día + botón */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" style={{ color: MUTED }}/>
                    <select
                      value={dia}
                      onChange={e => setSelected(prev => ({ ...prev, [c.id]: e.target.value }))}
                      className="text-sm font-semibold rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                      style={{ backgroundColor: CARD2, border: `1px solid ${canConfirm ? '#4f6ef7' : BORDER}`, color: canConfirm ? '#4f6ef7' : MUTED, minWidth: 90 }}
                    >
                      <option value="">Día...</option>
                      {DIAS.map(d => <option key={d} value={d}>Día {d}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={() => confirm(c.id)}
                    disabled={!canConfirm || isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
                    style={{
                      backgroundColor: canConfirm ? '#6ee7b720' : CARD2,
                      border: `1px solid ${canConfirm ? '#6ee7b7' : BORDER}`,
                      color: canConfirm ? '#6ee7b7' : MUTED,
                      cursor: canConfirm ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <CheckCircle className="w-3.5 h-3.5"/>
                    Confirmar
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
