'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface Order {
  id: number; order_number: string; task_type: string; task_description: string
  priority: string; status: string; scheduled_date: string; scheduled_time: string
  notes: string; completion_notes: string; completion_photos: string
  client_name: string; client_cellphone: string; client_address: string
  client_neighborhood: string; client_commune: string; client_plan: string
  client_id: number; technician_id: number; gps_lat: number; gps_lng: number
  gps_address: string; started_at: string; completed_at: string
  duration_minutes: number; tech_rating: number; rating_comment: string; rated_at: string
  followup_required: number; followup_notes: string; followup_date: string
}
interface Evidence { id: number; phase: string; photo_url: string; caption: string; uploaded_at: string }
interface Equipment { id: number; action: string; equipment_type: string; brand: string; model: string; serial: string; condition: string }

const PHASES = ['antes', 'durante', 'despues']
const PHASE_LABEL: Record<string, string> = { antes: 'Antes', durante: 'Durante', despues: 'Después' }
const EQUIPMENT_TYPES = ['Router', 'ONT', 'Cable coaxial', 'Splitter', 'Roseta', 'Switch', 'Patch cord', 'Otro']
const TASK_TYPES = ['Instalación', 'Mantenimiento', 'Soporte técnico', 'Retiro de equipo', 'Cambio de equipo', 'Revisión señal', 'Traslado', 'Otro']

export default function OrdenDetalle() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'info' | 'fotos' | 'equipos' | 'completar'>('info')

  // Foto nueva
  const [newPhoto, setNewPhoto] = useState({ phase: 'antes', photo_url: '', caption: '' })
  // Equipo nuevo
  const [newEquip, setNewEquip] = useState({ action: 'instalado', equipment_type: 'Router', brand: '', model: '', serial: '', condition: 'bueno', notes: '' })
  // Completar
  const [completionNotes, setCompletionNotes] = useState('')
  const [followupRequired, setFollowupRequired] = useState(false)
  const [followupNotes, setFollowupNotes] = useState('')
  const [followupDate, setFollowupDate] = useState('')
  // Rating
  const [stars, setStars] = useState(0)
  const [ratingComment, setRatingComment] = useState('')

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('tech_token') : null

  const fetchAll = useCallback(async () => {
    const token = getToken()
    if (!token) { router.push('/tecnico'); return }
    try {
      const [orderRes, evidenceRes, equipRes] = await Promise.all([
        fetch(`/api/tecnico/ordenes/${orderId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/tecnico/evidence?work_order_id=${orderId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/tecnico/equipment?work_order_id=${orderId}`, { headers: { Authorization: `Bearer ${token}` } })
      ])
      if (orderRes.status === 401) { router.push('/tecnico'); return }
      const od = await orderRes.json(); setOrder(od.order ?? null)
      const ev = await evidenceRes.json(); setEvidence(ev.evidence ?? [])
      const eq = await equipRes.json(); setEquipment(eq.equipment ?? [])
      if (od.order?.completion_notes) setCompletionNotes(od.order.completion_notes)
      if (od.order?.followup_required) setFollowupRequired(!!od.order.followup_required)
      if (od.order?.followup_notes) setFollowupNotes(od.order.followup_notes)
      if (od.order?.followup_date) setFollowupDate(od.order.followup_date)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [orderId, router])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const token = localStorage.getItem('tech_token')
    if (!token) { router.push('/tecnico'); return }
    fetchAll()
  }, [mounted, fetchAll, router])

  async function updateStatus(newStatus: string) {
    const token = getToken(); if (!token) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'en_progreso' && navigator.geolocation) {
        await new Promise<void>(resolve => {
          navigator.geolocation.getCurrentPosition(pos => {
            body.gps_lat = pos.coords.latitude
            body.gps_lng = pos.coords.longitude
            resolve()
          }, () => resolve(), { timeout: 5000 })
        })
      }
      const res = await fetch(`/api/tecnico/ordenes/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      })
      if (res.ok) { await fetchAll() }
    } finally { setSaving(false) }
  }

  async function addPhoto() {
    if (!newPhoto.photo_url.trim()) { alert('Pega la URL de la foto'); return }
    const token = getToken(); if (!token) return
    setSaving(true)
    try {
      const res = await fetch('/api/tecnico/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ work_order_id: orderId, ...newPhoto })
      })
      if (res.ok) {
        setNewPhoto({ phase: 'antes', photo_url: '', caption: '' })
        await fetchAll()
      }
    } finally { setSaving(false) }
  }

  async function addEquipment() {
    if (!newEquip.equipment_type) return
    const token = getToken(); if (!token) return
    setSaving(true)
    try {
      const res = await fetch('/api/tecnico/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ work_order_id: orderId, client_id: order?.client_id, ...newEquip })
      })
      if (res.ok) {
        setNewEquip({ action: 'instalado', equipment_type: 'Router', brand: '', model: '', serial: '', condition: 'bueno', notes: '' })
        await fetchAll()
      }
    } finally { setSaving(false) }
  }

  async function completeOrder() {
    const token = getToken(); if (!token) return
    if (!completionNotes.trim()) { alert('Escribe las observaciones de cierre'); return }
    setSaving(true)
    try {
      await fetch(`/api/tecnico/ordenes/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: 'completado', completion_notes: completionNotes,
          followup_required: followupRequired ? 1 : 0,
          followup_notes: followupRequired ? followupNotes : '',
          followup_date: followupRequired ? followupDate : ''
        })
      })
      if (followupRequired && followupNotes) {
        await fetch('/api/tecnico/followup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ work_order_id: orderId, client_id: order?.client_id, reason: followupNotes, scheduled_date: followupDate })
        })
      }
      await fetchAll()
      setTab('info')
    } finally { setSaving(false) }
  }

  async function submitRating() {
    if (stars === 0) { alert('Selecciona una calificación'); return }
    const token = getToken(); if (!token) return
    setSaving(true)
    try {
      const res = await fetch('/api/tecnico/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ work_order_id: orderId, client_id: order?.client_id, stars, comment: ratingComment })
      })
      if (res.ok) await fetchAll()
      else { const d = await res.json(); alert(d.error) }
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0d1b3e] flex items-center justify-center">
      <div className="text-blue-300">Cargando orden...</div>
    </div>
  )
  if (!order) return (
    <div className="min-h-screen bg-[#0d1b3e] flex items-center justify-center">
      <div className="text-red-400">Orden no encontrada</div>
    </div>
  )

  const statusColors: Record<string, string> = {
    pending: 'text-yellow-400', en_progreso: 'text-green-400',
    completado: 'text-gray-400', cancelado: 'text-red-400'
  }
  const statusLabel: Record<string, string> = {
    pending: 'Pendiente', en_progreso: 'En progreso', completado: 'Completado', cancelado: 'Cancelado'
  }

  return (
    <div className="min-h-screen bg-[#0d1b3e] text-white pb-6">
      {/* Header */}
      <div className="bg-[#1a2d5a] border-b border-blue-800 px-4 py-3">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => router.push('/tecnico/dashboard')} className="text-blue-400 hover:text-white text-xl">←</button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white truncate">{order.client_name}</h1>
            <p className="text-blue-400 text-xs">{order.order_number} · {order.task_type}</p>
          </div>
          <span className={`text-sm font-semibold ${statusColors[order.status] ?? 'text-white'}`}>
            {statusLabel[order.status] ?? order.status}
          </span>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="px-4 pt-4 pb-2 flex gap-2">
        {order.status === 'pending' && (
          <button
            onClick={() => updateStatus('en_progreso')}
            disabled={saving}
            className="flex-1 bg-green-700 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            ▶ Iniciar orden
          </button>
        )}
        {order.status === 'en_progreso' && (
          <button
            onClick={() => setTab('completar')}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            ✓ Completar
          </button>
        )}
        {order.client_cellphone && (
          <a
            href={'https://wa.me/57' + order.client_cellphone}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#1a2d5a] border border-blue-700 text-green-400 font-semibold py-3 px-4 rounded-xl"
          >
            WA
          </a>
        )}
        {order.gps_lat !== 0 && order.gps_lng !== 0 && (
          <a
            href={'https://maps.google.com/?q=' + order.gps_lat + ',' + order.gps_lng}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#1a2d5a] border border-blue-700 text-blue-400 font-semibold py-3 px-4 rounded-xl"
          >
            GPS
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-blue-800 px-4">
        {(['info', 'fotos', 'equipos', 'completar'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 ${
              tab === t ? 'border-blue-400 text-white' : 'border-transparent text-blue-500 hover:text-blue-300'
            }`}
          >
            {t === 'completar' ? 'Cerrar' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4">

        {/* TAB INFO */}
        {tab === 'info' && (
          <div className="space-y-3">
            <Section title="Cliente">
              <Row label="Nombre" value={order.client_name} />
              <Row label="Celular" value={order.client_cellphone} />
              <Row label="Dirección" value={order.client_address} />
              <Row label="Barrio" value={order.client_neighborhood} />
              <Row label="Plan" value={order.client_plan} />
            </Section>
            <Section title="Orden">
              <Row label="Tipo" value={order.task_type} />
              <Row label="Prioridad" value={order.priority} />
              <Row label="Fecha" value={`${order.scheduled_date} ${order.scheduled_time}`} />
              {order.task_description && <Row label="Descripción" value={order.task_description} />}
              {order.notes && <Row label="Notas admin" value={order.notes} />}
            </Section>
            {order.status === 'completado' && order.completion_notes && (
              <Section title="Cierre">
                <Row label="Observaciones" value={order.completion_notes} />
                {order.duration_minutes > 0 && <Row label="Duración" value={`${order.duration_minutes} min`} />}
                {order.followup_required === 1 && <Row label="Seguimiento" value={order.followup_notes} />}
              </Section>
            )}
            {order.status === 'completado' && (
              <Section title="Calificación del cliente">
                {order.rated_at ? (
                  <div>
                    <div className="text-amber-400 text-2xl">{'★'.repeat(order.tech_rating)}{'☆'.repeat(5 - order.tech_rating)}</div>
                    {order.rating_comment && <p className="text-blue-300 text-sm mt-1">{order.rating_comment}</p>}
                  </div>
                ) : (
                  <div>
                    <p className="text-blue-400 text-sm mb-3">¿Cómo quedó el cliente?</p>
                    <div className="flex gap-2 mb-3">
                      {[1,2,3,4,5].map(s => (
                        <button key={s} onClick={() => setStars(s)} className={`text-3xl ${s <= stars ? 'text-amber-400' : 'text-blue-800'}`}>★</button>
                      ))}
                    </div>
                    <textarea
                      value={ratingComment}
                      onChange={e => setRatingComment(e.target.value)}
                      placeholder="Comentario opcional..."
                      rows={2}
                      className="w-full bg-[#0d1b3e] border border-blue-700 rounded-xl px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-blue-400 mb-2"
                    />
                    <button
                      onClick={submitRating}
                      disabled={saving || stars === 0}
                      className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-xl text-sm"
                    >
                      Guardar calificación
                    </button>
                  </div>
                )}
              </Section>
            )}
          </div>
        )}

        {/* TAB FOTOS */}
        {tab === 'fotos' && (
          <div className="space-y-4">
            {PHASES.map(phase => {
              const phaseEvidence = evidence.filter(e => e.phase === phase)
              return (
                <Section key={phase} title={PHASE_LABEL[phase]}>
                  {phaseEvidence.length === 0 && <p className="text-blue-600 text-sm">Sin fotos</p>}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {phaseEvidence.map(e => (
                      <div key={e.id} className="rounded-xl overflow-hidden border border-blue-800">
                        <img src={e.photo_url} alt={e.caption || phase} className="w-full h-28 object-cover" onError={ev => (ev.currentTarget.src = '')} />
                        {e.caption && <p className="text-blue-400 text-xs p-1 truncate">{e.caption}</p>}
                      </div>
                    ))}
                  </div>
                </Section>
              )
            })}

            {order.status !== 'completado' && (
              <Section title="Agregar foto">
                <select
                  value={newPhoto.phase}
                  onChange={e => setNewPhoto(p => ({ ...p, phase: e.target.value }))}
                  className="w-full bg-[#0d1b3e] border border-blue-700 rounded-xl px-3 py-2 text-white text-sm mb-2 focus:outline-none"
                >
                  {PHASES.map(p => <option key={p} value={p}>{PHASE_LABEL[p]}</option>)}
                </select>
                <input
                  type="url"
                  value={newPhoto.photo_url}
                  onChange={e => setNewPhoto(p => ({ ...p, photo_url: e.target.value }))}
                  placeholder="URL de la foto (Google Photos, Drive...)"
                  className="w-full bg-[#0d1b3e] border border-blue-700 rounded-xl px-3 py-2 text-white text-sm mb-2 focus:outline-none focus:border-blue-400"
                />
                <input
                  type="text"
                  value={newPhoto.caption}
                  onChange={e => setNewPhoto(p => ({ ...p, caption: e.target.value }))}
                  placeholder="Descripción (opcional)"
                  className="w-full bg-[#0d1b3e] border border-blue-700 rounded-xl px-3 py-2 text-white text-sm mb-3 focus:outline-none focus:border-blue-400"
                />
                <button
                  onClick={addPhoto}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
                >
                  {saving ? 'Guardando...' : 'Agregar foto'}
                </button>
              </Section>
            )}
          </div>
        )}

        {/* TAB EQUIPOS */}
        {tab === 'equipos' && (
          <div className="space-y-4">
            <Section title="Equipos registrados">
              {equipment.length === 0 && <p className="text-blue-600 text-sm">Sin equipos registrados</p>}
              {equipment.map(eq => (
                <div key={eq.id} className="bg-[#0d1b3e] rounded-xl p-3 border border-blue-900 mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${eq.action === 'instalado' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                      {eq.action}
                    </span>
                    <span className="text-white text-sm font-medium">{eq.equipment_type}</span>
                  </div>
                  {eq.brand && <p className="text-blue-400 text-xs">{eq.brand} {eq.model}</p>}
                  {eq.serial && <p className="text-blue-500 text-xs font-mono">S/N: {eq.serial}</p>}
                </div>
              ))}
            </Section>

            {order.status !== 'completado' && (
              <Section title="Registrar equipo">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select value={newEquip.action} onChange={e => setNewEquip(p => ({ ...p, action: e.target.value }))}
                    className="bg-[#0d1b3e] border border-blue-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                    <option value="instalado">Instalado</option>
                    <option value="retirado">Retirado</option>
                    <option value="revisado">Revisado</option>
                  </select>
                  <select value={newEquip.equipment_type} onChange={e => setNewEquip(p => ({ ...p, equipment_type: e.target.value }))}
                    className="bg-[#0d1b3e] border border-blue-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                    {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input type="text" value={newEquip.brand} onChange={e => setNewEquip(p => ({ ...p, brand: e.target.value }))}
                    placeholder="Marca" className="bg-[#0d1b3e] border border-blue-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400" />
                  <input type="text" value={newEquip.model} onChange={e => setNewEquip(p => ({ ...p, model: e.target.value }))}
                    placeholder="Modelo" className="bg-[#0d1b3e] border border-blue-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <input type="text" value={newEquip.serial} onChange={e => setNewEquip(p => ({ ...p, serial: e.target.value }))}
                  placeholder="Número de serie (S/N)"
                  className="w-full bg-[#0d1b3e] border border-blue-700 rounded-xl px-3 py-2 text-white text-sm font-mono mb-2 focus:outline-none focus:border-blue-400" />
                <button onClick={addEquipment} disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm">
                  {saving ? 'Guardando...' : 'Registrar equipo'}
                </button>
              </Section>
            )}
          </div>
        )}

        {/* TAB COMPLETAR */}
        {tab === 'completar' && (
          <div className="space-y-4">
            {order.status === 'completado' ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-white font-semibold">Orden completada</p>
                <p className="text-blue-400 text-sm mt-1">
                  {order.completed_at ? new Date(order.completed_at).toLocaleString('es-CO') : ''}
                </p>
                {order.duration_minutes > 0 && (
                  <p className="text-blue-500 text-sm">Duración: {order.duration_minutes} min</p>
                )}
              </div>
            ) : (
              <>
                <Section title="Observaciones de cierre">
                  <textarea
                    value={completionNotes}
                    onChange={e => setCompletionNotes(e.target.value)}
                    placeholder="Describe lo que se realizó, cómo quedó el servicio..."
                    rows={4}
                    className="w-full bg-[#0d1b3e] border border-blue-700 rounded-xl px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-blue-400"
                  />
                </Section>

                <Section title="¿Requiere segunda visita?">
                  <div className="flex gap-3 mb-3">
                    {[false, true].map(v => (
                      <button key={String(v)} onClick={() => setFollowupRequired(v)}
                        className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                          followupRequired === v ? 'bg-blue-700 border-blue-500 text-white' : 'bg-[#0d1b3e] border-blue-800 text-blue-400'
                        }`}>
                        {v ? 'Sí' : 'No'}
                      </button>
                    ))}
                  </div>
                  {followupRequired && (
                    <>
                      <textarea
                        value={followupNotes}
                        onChange={e => setFollowupNotes(e.target.value)}
                        placeholder="¿Qué quedó pendiente?"
                        rows={2}
                        className="w-full bg-[#0d1b3e] border border-blue-700 rounded-xl px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-blue-400 mb-2"
                      />
                      <input type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)}
                        className="w-full bg-[#0d1b3e] border border-blue-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400" />
                    </>
                  )}
                </Section>

                <button onClick={completeOrder} disabled={saving}
                  className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition-colors">
                  {saving ? 'Guardando...' : '✓ Marcar como completado'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1a2d5a] rounded-2xl p-4 border border-blue-800">
      <h3 className="text-blue-300 text-xs font-semibold uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null
  return (
    <div className="flex justify-between gap-2 py-1 border-b border-blue-900 last:border-0">
      <span className="text-blue-400 text-sm shrink-0">{label}</span>
      <span className="text-white text-sm text-right">{value}</span>
    </div>
  )
}
