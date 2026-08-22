'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, MessageCircle, FileText,
  Phone, Wrench, Search, X, User, Calendar,
  CheckCircle, Clock, AlertCircle, RefreshCw,
  ChevronDown, Send
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Technician {
  id: number;
  name: string;
  cedula: string;
  phone: string;
  cellphone: string;
  email: string;
  photo_url: string;
  role: string;
  specialty: string;
  status: string;
  notes: string;
  created_at: string;
}

interface ClientResult {
  id: number;
  name: string;
  address: string;
  neighborhood: string;
  commune: string;
  cellphone: string;
  plan: string;
  status: string;
  cedula: string;
  punto_referencia: string;
}

interface WorkOrder {
  id: number;
  order_number: string;
  technician_id: number;
  client_id: number;
  task_type: string;
  task_description: string;
  priority: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  notes: string;
  created_by: string;
  whatsapp_tech_sent: number;
  whatsapp_client_sent: number;
  created_at: string;
  technician_name?: string;
  technician_phone?: string;
  technician_role?: string;
  client_name?: string;
  client_address?: string;
  client_phone?: string;
  client_plan?: string;
  client_status?: string;
  client_neighborhood?: string;
  client_punto_referencia?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TASK_TYPES = [
  { value: 'INSTALACION_SERVICIO',  label: 'Instalacion de Servicio',   icon: '📡', color: '#22c55e' },
  { value: 'ESTUDIO_ZONA',          label: 'Estudio de Zona',            icon: '🗺', color: '#3b82f6' },
  { value: 'RETIRO_EQUIPOS',        label: 'Retiro de Equipos',          icon: '📦', color: '#ef4444' },
  { value: 'ACTUALIZACION',         label: 'Actualizacion',              icon: '⬆', color: '#8b5cf6' },
  { value: 'REPARACION',            label: 'Reparacion',                 icon: '🔧', color: '#f97316' },
  { value: 'SOPORTE',               label: 'Soporte Tecnico',            icon: '🛠', color: '#06b6d4' },
  { value: 'INSTALACION_ELECTRICA', label: 'Instalacion Electrica',      icon: '⚡', color: '#eab308' },
  { value: 'OTRA',                  label: 'Otra Area',                  icon: '📋', color: '#6b7280' },
];

const PRIORITIES = [
  { value: 'low',    label: 'Baja',    color: '#6b7280' },
  { value: 'normal', label: 'Normal',  color: '#3b82f6' },
  { value: 'high',   label: 'Alta',    color: '#f97316' },
  { value: 'urgent', label: 'Urgente', color: '#ef4444' },
];

const ORDER_STATUSES = [
  { value: 'pending',     label: 'Pendiente',  color: '#eab308', icon: '⏳' },
  { value: 'in_progress', label: 'En proceso', color: '#3b82f6', icon: '🔄' },
  { value: 'completed',   label: 'Completada', color: '#22c55e', icon: '✅' },
  { value: 'cancelled',   label: 'Cancelada',  color: '#6b7280', icon: '❌' },
];

const TECH_ROLES = ['Tecnico Lider', 'Tecnico', 'Auxiliar Tecnico', 'Instalador', 'Supervisor'];

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG     = '#0b0f19';
const CARD   = '#131920';
const CARD2  = '#0f1520';
const BORDER = '#1e2a3a';
const TEXT   = '#e2e8f0';
const MUTED  = '#64748b';
const ACCENT = '#2563eb';

const iStyle: React.CSSProperties = {
  background: CARD2, border: `1px solid ${BORDER}`, color: TEXT,
  borderRadius: 8, padding: '9px 12px', width: '100%', outline: 'none',
  fontSize: 13, boxSizing: 'border-box',
};

const EMPTY_TECH = {
  name: '', cedula: '', phone: '', cellphone: '', email: '',
  photo_url: '', role: 'Tecnico', specialty: '', status: 'active', notes: '',
};

const EMPTY_ORDER = {
  technician_id: 0,
  client_id: 0,
  task_type: '',
  task_description: '',
  priority: 'normal',
  scheduled_date: '',
  scheduled_time: '',
  notes: '',
  created_by: 'Mariana',
};

// ─── Helper: find config ─────────────────────────────────────────────────────
const taskCfg  = (v: string) => TASK_TYPES.find(t => t.value === v);
const prioCfg  = (v: string) => PRIORITIES.find(p => p.value === v);
const statCfg  = (v: string) => ORDER_STATUSES.find(s => s.value === v);

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = statCfg(status);
  if (!s) return null;
  return (
    <span style={{ background: s.color + '22', color: s.color, border: `1px solid ${s.color}44`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {s.icon} {s.label}
    </span>
  );
}

function PrioBadge({ priority }: { priority: string }) {
  const p = prioCfg(priority);
  if (!p) return null;
  return (
    <span style={{ background: p.color + '22', color: p.color, border: `1px solid ${p.color}44`, borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
      {p.label}
    </span>
  );
}

function TaskBadge({ taskType }: { taskType: string }) {
  const t = taskCfg(taskType);
  if (!t) return <span style={{ color: MUTED, fontSize: 12 }}>—</span>;
  return (
    <span style={{ background: t.color + '18', color: t.color, border: `1px solid ${t.color}33`, borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {t.icon} {t.label}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TecnicosTab() {
  // Data
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [workOrders, setWorkOrders]   = useState<WorkOrder[]>([]);

  // Loading
  const [loadingTechs,  setLoadingTechs]  = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [saving, setSaving] = useState(false);

  // Tech modal
  const [showTechModal, setShowTechModal] = useState(false);
  const [editingTech, setEditingTech]     = useState<Technician | null>(null);
  const [techForm, setTechForm]           = useState({ ...EMPTY_TECH });

  // Order modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder]     = useState<WorkOrder | null>(null);
  const [orderForm, setOrderForm]           = useState({ ...EMPTY_ORDER });

  // Client search inside order modal
  const [clientSearch, setClientSearch]         = useState('');
  const [clientResults, setClientResults]       = useState<ClientResult[]>([]);
  const [selectedClient, setSelectedClient]     = useState<ClientResult | null>(null);
  const [searchingClients, setSearchingClients] = useState(false);
  const [showClientDrop, setShowClientDrop]     = useState(false);

  // Filter tabs for orders
  const [orderTab, setOrderTab] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled'>('all');

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchTechs = useCallback(async () => {
    setLoadingTechs(true);
    try {
      const r = await fetch('/api/technicians');
      const d = await r.json();
      setTechnicians(d.technicians ?? []);
    } catch (e) { console.error(e); }
    finally { setLoadingTechs(false); }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const r = await fetch('/api/work-orders?limit=200');
      const d = await r.json();
      setWorkOrders(d.workOrders ?? []);
    } catch (e) { console.error(e); }
    finally { setLoadingOrders(false); }
  }, []);

  useEffect(() => { fetchTechs(); fetchOrders(); }, [fetchTechs, fetchOrders]);

  // ── Client search ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!clientSearch.trim()) { setClientResults([]); return; }
    const t = setTimeout(async () => {
      setSearchingClients(true);
      try {
        const r = await fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&limit=10`);
        const d = await r.json();
        setClientResults(d.clients ?? []);
        setShowClientDrop(true);
      } catch (_e) { /* ignore */ }
      finally { setSearchingClients(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [clientSearch]);

  // ── Tech CRUD ────────────────────────────────────────────────────────────────

  function openNewTech() {
    setEditingTech(null);
    setTechForm({ ...EMPTY_TECH });
    setShowTechModal(true);
  }

  function openEditTech(t: Technician) {
    setEditingTech(t);
    setTechForm({
      name: t.name, cedula: t.cedula, phone: t.phone, cellphone: t.cellphone,
      email: t.email, photo_url: t.photo_url, role: t.role,
      specialty: t.specialty, status: t.status, notes: t.notes,
    });
    setShowTechModal(true);
  }

  async function saveTech() {
    if (!techForm.name.trim()) { alert('El nombre es requerido'); return; }
    setSaving(true);
    try {
      const url    = editingTech ? `/api/technicians/${editingTech.id}` : '/api/technicians';
      const method = editingTech ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(techForm) });
      if (!r.ok) { const e = await r.json(); alert(e.error ?? 'Error'); return; }
      setShowTechModal(false);
      fetchTechs();
    } finally { setSaving(false); }
  }

  async function deleteTech(id: number, name: string) {
    if (!confirm(`¿Eliminar a ${name}? Esta accion no se puede deshacer.`)) return;
    const r = await fetch(`/api/technicians/${id}`, { method: 'DELETE' });
    if (!r.ok) { const e = await r.json(); alert(e.error ?? 'Error al eliminar'); return; }
    fetchTechs();
  }

  // ── Order CRUD ───────────────────────────────────────────────────────────────

  function openNewOrder() {
    setEditingOrder(null);
    setOrderForm({ ...EMPTY_ORDER });
    setSelectedClient(null);
    setClientSearch('');
    setShowOrderModal(true);
  }

  function openEditOrder(o: WorkOrder) {
    setEditingOrder(o);
    setOrderForm({
      technician_id:   o.technician_id,
      client_id:       o.client_id,
      task_type:       o.task_type,
      task_description:o.task_description,
      priority:        o.priority,
      scheduled_date:  o.scheduled_date,
      scheduled_time:  o.scheduled_time,
      notes:           o.notes,
      created_by:      o.created_by,
    });
    // Reconstruct client from joined fields
    setSelectedClient({
      id: o.client_id,
      name: o.client_name ?? '',
      address: o.client_address ?? '',
      neighborhood: o.client_neighborhood ?? '',
      commune: '',
      cellphone: o.client_phone ?? '',
      plan: o.client_plan ?? '',
      status: o.client_status ?? '',
      cedula: '',
      punto_referencia: o.client_punto_referencia ?? '',
    });
    setClientSearch(o.client_name ?? '');
    setShowOrderModal(true);
  }

  async function saveOrder() {
    if (!orderForm.technician_id) { alert('Selecciona un tecnico'); return; }
    if (!orderForm.client_id)     { alert('Selecciona un cliente'); return; }
    if (!orderForm.task_type)     { alert('Selecciona el tipo de tarea'); return; }
    setSaving(true);
    try {
      const url    = editingOrder ? `/api/work-orders/${editingOrder.id}` : '/api/work-orders';
      const method = editingOrder ? 'PUT' : 'POST';
      const body   = editingOrder
        ? { ...orderForm, status: editingOrder.status, whatsapp_tech_sent: editingOrder.whatsapp_tech_sent, whatsapp_client_sent: editingOrder.whatsapp_client_sent }
        : orderForm;
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.json(); alert(e.error ?? 'Error'); return; }
      setShowOrderModal(false);
      fetchOrders();
    } finally { setSaving(false); }
  }

  async function deleteOrder(id: number, num: string) {
    if (!confirm(`¿Eliminar la orden ${num}?`)) return;
    const r = await fetch(`/api/work-orders/${id}`, { method: 'DELETE' });
    if (!r.ok) { alert('Error al eliminar'); return; }
    fetchOrders();
  }

  async function changeOrderStatus(id: number, status: string, o: WorkOrder) {
    await fetch(`/api/work-orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...o, status }),
    });
    fetchOrders();
  }

  // ── WhatsApp ─────────────────────────────────────────────────────────────────

  async function sendWhatsAppTech(o: WorkOrder) {
    const task    = taskCfg(o.task_type);
    const date    = o.scheduled_date || 'Por definir';
    const time    = o.scheduled_time ? `a las ${o.scheduled_time}` : '';
    const msg = [
      `ORDEN DE SERVICIO - MEDIFIBRA S.A.S`,
      `Orden: ${o.order_number}`,
      ``,
      `Tecnico: ${o.technician_name}`,
      `Tarea: ${task?.label ?? o.task_type}`,
      `Fecha: ${date} ${time}`.trim(),
      ``,
      `CLIENTE:`,
      `Nombre: ${o.client_name}`,
      `Direccion: ${o.client_address ?? ''}${o.client_neighborhood ? ', ' + o.client_neighborhood : ''}`,
      o.client_punto_referencia ? `Referencia: ${o.client_punto_referencia}` : '',
      `Telefono: ${o.client_phone}`,
      `Plan: ${o.client_plan}`,
      o.task_description ? `\nDescripcion: ${o.task_description}` : '',
      o.notes ? `\nNovedades: ${o.notes}` : '',
      ``,
      `Confirme recibido.`,
      `Mariana - Medifibra S.A.S · 333 728 8745`,
    ].filter(l => l !== null && l !== undefined).join('\n').trim();

    window.open(`https://wa.me/57${o.technician_phone}?text=${encodeURIComponent(msg)}`, '_blank');

    // Registrar envio
    await fetch('/api/notifications/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: o.client_id, channel: 'whatsapp', type: 'general', message: `OS ${o.order_number} enviada al tecnico ${o.technician_name}`, status: 'sent' }),
    }).catch(() => {});

    // Marcar como enviado
    await fetch(`/api/work-orders/${o.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...o, whatsapp_tech_sent: 1 }),
    });
    fetchOrders();
  }

  async function sendWhatsAppClient(o: WorkOrder) {
    const task = taskCfg(o.task_type);
    const date = o.scheduled_date || 'Por definir';
    const time = o.scheduled_time ? `a las ${o.scheduled_time} hrs` : '';
    const msg = [
      `MEDIFIBRA S.A.S - Agendamiento de Visita Tecnica`,
      `Orden: ${o.order_number}`,
      ``,
      `Estimado(a) ${o.client_name},`,
      ``,
      `Le informamos que hemos programado una visita tecnica:`,
      `Servicio: ${task?.label ?? o.task_type}`,
      `Fecha: ${date}${time ? ' ' + time : ''}`,
      `Tecnico asignado: ${o.technician_name}`,
      ``,
      `Direccion registrada: ${o.client_address ?? ''}`,
      ``,
      `Para dudas o reprogramacion comuniquese al 333 728 8745`,
      ``,
      `Medifibra S.A.S - "Conectate con velocidad real"`,
    ].join('\n');

    window.open(`https://wa.me/57${o.client_phone}?text=${encodeURIComponent(msg)}`, '_blank');

    await fetch(`/api/work-orders/${o.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...o, whatsapp_client_sent: 1 }),
    });
    fetchOrders();
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const filteredOrders = workOrders.filter(o =>
    orderTab === 'all' ? true : o.status === orderTab
  );

  const stats = {
    total:       workOrders.length,
    pending:     workOrders.filter(o => o.status === 'pending').length,
    in_progress: workOrders.filter(o => o.status === 'in_progress').length,
    completed:   workOrders.filter(o => o.status === 'completed').length,
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '0 0 40px' }}>

      {/* ── SECTION: TÉCNICOS ── */}
      <div style={{ marginBottom: 32 }}>

        {/* Section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 style={{ color: TEXT, fontWeight: 700, fontSize: 18, margin: 0 }}>Personal Tecnico</h2>
            <p style={{ color: MUTED, fontSize: 13, margin: '4px 0 0' }}>{technicians.length} tecnico{technicians.length !== 1 ? 's' : ''} registrado{technicians.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={openNewTech}
            style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} /> Nuevo Tecnico
          </button>
        </div>

        {/* Tech grid */}
        {loadingTechs ? (
          <div style={{ color: MUTED, textAlign: 'center', padding: 32 }}>Cargando tecnicos...</div>
        ) : technicians.length === 0 ? (
          <div style={{ background: CARD, borderRadius: 10, padding: 40, textAlign: 'center', border: `1px solid ${BORDER}` }}>
            <Wrench size={32} color={MUTED} style={{ marginBottom: 10 }} />
            <div style={{ color: MUTED, fontSize: 14 }}>No hay tecnicos registrados.</div>
            <div style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>Haz clic en "Nuevo Tecnico" para agregar el primero.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {technicians.map(t => (
              <div key={t.id} style={{ background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>

                {/* Status bar */}
                <div style={{ height: 3, background: t.status === 'active' ? '#22c55e' : '#6b7280' }} />

                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    {/* Photo */}
                    <div style={{ width: 52, height: 52, borderRadius: 10, background: '#1a2a3a', border: `2px solid ${ACCENT}`, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                      {t.photo_url
                        ? <img src={t.photo_url} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : '👷'}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                      <div style={{ background: ACCENT + '20', color: '#60a5fa', border: `1px solid ${ACCENT}33`, borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 600, display: 'inline-block', marginBottom: 6 }}>{t.role}</div>
                      {t.specialty && <div style={{ color: MUTED, fontSize: 11, marginBottom: 4 }}>{t.specialty}</div>}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {t.cedula    && <div style={{ fontSize: 11, color: MUTED }}>C.C. {t.cedula}</div>}
                        {t.cellphone && <div style={{ fontSize: 11, color: MUTED, display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={10} />{t.cellphone}</div>}
                        {t.email     && <div style={{ fontSize: 11, color: MUTED }}>{t.email}</div>}
                      </div>
                    </div>

                    {/* Status dot */}
                    <span style={{ background: t.status === 'active' ? '#052e16' : '#1a1f2e', color: t.status === 'active' ? '#4ade80' : '#9ca3af', border: `1px solid ${t.status === 'active' ? '#16653466' : '#37415166'}`, borderRadius: 20, padding: '2px 8px', fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {t.status === 'active' ? '● Activo' : '● Inactivo'}
                    </span>
                  </div>

                  {/* Orders count */}
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: MUTED, fontSize: 11 }}>
                      {workOrders.filter(o => o.technician_id === t.id && o.status !== 'completed' && o.status !== 'cancelled').length} orden(es) activa(s)
                    </span>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => openEditTech(t)}
                        title="Editar"
                        style={{ background: '#1e3a5f33', color: '#60a5fa', border: '1px solid #1e3a5f55', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteTech(t.id, t.name)}
                        title="Eliminar"
                        style={{ background: '#2d0a0a33', color: '#f87171', border: '1px solid #991b1b33', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION: ÓRDENES DE SERVICIO ── */}
      <div>

        {/* Section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ color: TEXT, fontWeight: 700, fontSize: 18, margin: 0 }}>Ordenes de Servicio</h2>
            <p style={{ color: MUTED, fontSize: 13, margin: '4px 0 0' }}>Asignacion y seguimiento de tareas</p>
          </div>
          <button
            onClick={openNewOrder}
            style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} /> Nueva Orden
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
          {[
            { label: 'Total',      value: stats.total,       color: '#94a3b8', bg: CARD },
            { label: 'Pendientes', value: stats.pending,     color: '#eab308', bg: '#1c1400' },
            { label: 'En proceso', value: stats.in_progress, color: '#3b82f6', bg: '#0f1e3a' },
            { label: 'Completadas',value: stats.completed,   color: '#22c55e', bg: '#052e16' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { key: 'all',         label: 'Todas' },
            { key: 'pending',     label: 'Pendientes' },
            { key: 'in_progress', label: 'En proceso' },
            { key: 'completed',   label: 'Completadas' },
            { key: 'cancelled',   label: 'Canceladas' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setOrderTab(tab.key as typeof orderTab)}
              style={{
                background: orderTab === tab.key ? ACCENT : CARD,
                color:      orderTab === tab.key ? '#fff' : MUTED,
                border:     `1px solid ${orderTab === tab.key ? ACCENT : BORDER}`,
                borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}
            >
              {tab.label}
            </button>
          ))}
          <button onClick={() => { fetchOrders(); }} style={{ marginLeft: 'auto', background: CARD, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <RefreshCw size={12} /> Actualizar
          </button>
        </div>

        {/* Orders table */}
        {loadingOrders ? (
          <div style={{ color: MUTED, textAlign: 'center', padding: 32 }}>Cargando ordenes...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ background: CARD, borderRadius: 10, padding: 40, textAlign: 'center', border: `1px solid ${BORDER}` }}>
            <Calendar size={32} color={MUTED} style={{ marginBottom: 10 }} />
            <div style={{ color: MUTED, fontSize: 14 }}>No hay ordenes en esta categoria.</div>
          </div>
        ) : (
          <div style={{ background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {['Orden', 'Tipo de Tarea', 'Tecnico', 'Cliente', 'Fecha / Hora', 'Estado', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: MUTED, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o, idx) => (
                    <tr key={o.id} style={{ borderBottom: idx < filteredOrders.length - 1 ? `1px solid ${BORDER}` : 'none', background: idx % 2 === 0 ? 'transparent' : '#0a0f1a' }}>

                      {/* Orden */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>{o.order_number}</div>
                        <PrioBadge priority={o.priority} />
                      </td>

                      {/* Tarea */}
                      <td style={{ padding: '12px 14px' }}>
                        <TaskBadge taskType={o.task_type} />
                      </td>

                      {/* Tecnico */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ color: TEXT, fontWeight: 600, fontSize: 13 }}>{o.technician_name ?? '—'}</div>
                        {o.technician_role && <div style={{ color: MUTED, fontSize: 11 }}>{o.technician_role}</div>}
                      </td>

                      {/* Cliente */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ color: TEXT, fontWeight: 600, fontSize: 13 }}>{o.client_name ?? '—'}</div>
                        <div style={{ color: MUTED, fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.client_address}</div>
                        {o.client_status && (
                          <span style={{ background: o.client_status === 'active' ? '#052e1622' : '#2d0a0a22', color: o.client_status === 'active' ? '#4ade80' : '#f87171', fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '1px 6px' }}>
                            {o.client_status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        )}
                      </td>

                      {/* Fecha */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ color: TEXT, fontSize: 13 }}>
                          {o.scheduled_date || <span style={{ color: MUTED }}>Sin fecha</span>}
                        </div>
                        {o.scheduled_time && <div style={{ color: MUTED, fontSize: 11 }}>{o.scheduled_time} hrs</div>}
                      </td>

                      {/* Estado con selector */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <StatusBadge status={o.status} />
                          <select
                            value={o.status}
                            onChange={e => changeOrderStatus(o.id, e.target.value, o)}
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                          >
                            {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>

                          {/* PDF */}
                          <button
                            onClick={() => window.open(`/orden/${o.id}`, '_blank')}
                            title="Ver / Descargar PDF"
                            style={{ background: '#1a0533', color: '#c084fc', border: '1px solid #6b21a833', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <FileText size={13} />
                          </button>

                          {/* WA Tecnico */}
                          <button
                            onClick={() => sendWhatsAppTech(o)}
                            title={`WhatsApp al tecnico${o.whatsapp_tech_sent ? ' (ya enviado)' : ''}`}
                            style={{ background: o.whatsapp_tech_sent ? '#052e16' : '#0a1a0a', color: '#4ade80', border: `1px solid ${o.whatsapp_tech_sent ? '#22c55e55' : '#16653422'}`, borderRadius: 6, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                          >
                            <Wrench size={12} />
                            {o.whatsapp_tech_sent ? <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, background: '#22c55e', borderRadius: '50%' }} /> : null}
                          </button>

                          {/* WA Cliente */}
                          <button
                            onClick={() => sendWhatsAppClient(o)}
                            title={`WhatsApp al cliente${o.whatsapp_client_sent ? ' (ya enviado)' : ''}`}
                            style={{ background: o.whatsapp_client_sent ? '#0f2a1f' : '#0a1a12', color: '#34d399', border: `1px solid ${o.whatsapp_client_sent ? '#22c55e44' : '#16653422'}`, borderRadius: 6, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                          >
                            <MessageCircle size={12} />
                            {o.whatsapp_client_sent ? <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, background: '#22c55e', borderRadius: '50%' }} /> : null}
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => openEditOrder(o)}
                            title="Editar orden"
                            style={{ background: '#1e3a5f22', color: '#60a5fa', border: '1px solid #1e3a5f44', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Pencil size={12} />
                          </button>

                          {/* Eliminar */}
                          <button
                            onClick={() => deleteOrder(o.id, o.order_number)}
                            title="Eliminar"
                            style={{ background: '#2d0a0a22', color: '#f87171', border: '1px solid #991b1b33', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════ MODAL TÉCNICO ══════════════ */}
      {showTechModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#0f1520', border: `1px solid ${BORDER}`, borderRadius: 14, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: `1px solid ${BORDER}` }}>
              <h3 style={{ color: TEXT, margin: 0, fontSize: 16, fontWeight: 700 }}>
                {editingTech ? 'Editar Tecnico' : 'Nuevo Tecnico'}
              </h3>
              <button onClick={() => setShowTechModal(false)} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Foto preview */}
              {techForm.photo_url && (
                <div style={{ textAlign: 'center' }}>
                  <img src={techForm.photo_url} alt="Preview" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', border: `2px solid ${ACCENT}` }} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Nombre */}
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>NOMBRE COMPLETO *</label>
                  <input value={techForm.name} onChange={e => setTechForm(f => ({ ...f, name: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '') }))} placeholder="Ej: Juan Carlos Perez" style={iStyle} />
                </div>

                {/* Cedula */}
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>CEDULA</label>
                  <input value={techForm.cedula} onChange={e => setTechForm(f => ({ ...f, cedula: e.target.value.replace(/\D/g, '').slice(0, 12) }))} placeholder="123456789" style={iStyle} />
                </div>

                {/* Rol */}
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>CARGO</label>
                  <select value={techForm.role} onChange={e => setTechForm(f => ({ ...f, role: e.target.value }))} style={iStyle}>
                    {TECH_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Celular */}
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>CELULAR</label>
                  <input value={techForm.cellphone} onChange={e => setTechForm(f => ({ ...f, cellphone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="3001234567" style={iStyle} />
                </div>

                {/* Telefono */}
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>TELEFONO FIJO</label>
                  <input value={techForm.phone} onChange={e => setTechForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="6041234567" style={iStyle} />
                </div>

                {/* Email */}
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>CORREO</label>
                  <input value={techForm.email} onChange={e => setTechForm(f => ({ ...f, email: e.target.value }))} placeholder="tecnico@email.com" style={iStyle} type="email" />
                </div>

                {/* Especialidad */}
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>ESPECIALIDAD</label>
                  <input value={techForm.specialty} onChange={e => setTechForm(f => ({ ...f, specialty: e.target.value }))} placeholder="Fibra optica, electricidad..." style={iStyle} />
                </div>

                {/* Foto URL */}
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>URL FOTO (Google Photos, Drive, etc.)</label>
                  <input value={techForm.photo_url} onChange={e => setTechForm(f => ({ ...f, photo_url: e.target.value }))} placeholder="https://..." style={iStyle} />
                </div>

                {/* Status */}
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>ESTADO</label>
                  <select value={techForm.status} onChange={e => setTechForm(f => ({ ...f, status: e.target.value }))} style={iStyle}>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>

                {/* Notas */}
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>NOTAS INTERNAS</label>
                  <textarea value={techForm.notes} onChange={e => setTechForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observaciones..." rows={2} style={{ ...iStyle, resize: 'vertical' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: `1px solid ${BORDER}`, marginTop: 4 }}>
                <button onClick={() => setShowTechModal(false)} style={{ background: CARD, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13 }}>
                  Cancelar
                </button>
                <button onClick={saveTech} disabled={saving} style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Guardando...' : editingTech ? 'Actualizar' : 'Crear Tecnico'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL ORDEN ══════════════ */}
      {showOrderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.80)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#0f1520', border: `1px solid ${BORDER}`, borderRadius: 14, width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: `1px solid ${BORDER}` }}>
              <h3 style={{ color: TEXT, margin: 0, fontSize: 16, fontWeight: 700 }}>
                {editingOrder ? `Editar Orden ${editingOrder.order_number}` : 'Nueva Orden de Servicio'}
              </h3>
              <button onClick={() => setShowOrderModal(false)} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Tipo de tarea */}
              <div>
                <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 8 }}>TIPO DE TAREA *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {TASK_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setOrderForm(f => ({ ...f, task_type: t.value }))}
                      style={{
                        background: orderForm.task_type === t.value ? t.color + '25' : CARD,
                        color:      orderForm.task_type === t.value ? t.color : MUTED,
                        border:     `1px solid ${orderForm.task_type === t.value ? t.color + '66' : BORDER}`,
                        borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                        fontSize: 12, fontWeight: orderForm.task_type === t.value ? 700 : 400,
                        textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

                {/* Tecnico */}
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>TECNICO ASIGNADO *</label>
                  <select
                    value={orderForm.technician_id || ''}
                    onChange={e => setOrderForm(f => ({ ...f, technician_id: Number(e.target.value) }))}
                    style={iStyle}
                  >
                    <option value="">-- Seleccionar tecnico --</option>
                    {technicians.filter(t => t.status === 'active').map(t => (
                      <option key={t.id} value={t.id}>{t.name} · {t.role}</option>
                    ))}
                  </select>
                </div>

                {/* Cliente search */}
                <div style={{ gridColumn: '1/-1', position: 'relative' }}>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>CLIENTE *</label>
                  {selectedClient ? (
                    <div style={{ background: '#052e1622', border: '1px solid #16653444', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: TEXT, fontWeight: 600, fontSize: 13 }}>{selectedClient.name}</div>
                        <div style={{ color: MUTED, fontSize: 11 }}>{selectedClient.address}{selectedClient.neighborhood ? `, ${selectedClient.neighborhood}` : ''}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <span style={{ background: selectedClient.status === 'active' ? '#052e1633' : '#2d0a0a33', color: selectedClient.status === 'active' ? '#4ade80' : '#f87171', fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '1px 6px' }}>
                            {selectedClient.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                          <span style={{ color: MUTED, fontSize: 11 }}>{selectedClient.plan}</span>
                          <span style={{ color: MUTED, fontSize: 11 }}>{selectedClient.cellphone}</span>
                        </div>
                      </div>
                      <button onClick={() => { setSelectedClient(null); setClientSearch(''); setOrderForm(f => ({ ...f, client_id: 0 })); }} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer' }}><X size={16} /></button>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <Search size={14} color={MUTED} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        value={clientSearch}
                        onChange={e => setClientSearch(e.target.value)}
                        placeholder="Buscar por nombre, celular o cedula..."
                        style={{ ...iStyle, paddingLeft: 32 }}
                        onFocus={() => clientResults.length > 0 && setShowClientDrop(true)}
                      />
                      {searchingClients && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: MUTED, fontSize: 11 }}>...</span>}
                    </div>
                  )}

                  {/* Dropdown */}
                  {showClientDrop && clientResults.length > 0 && !selectedClient && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0f1520', border: `1px solid ${BORDER}`, borderRadius: 8, zIndex: 50, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                      {clientResults.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedClient(c);
                            setOrderForm(f => ({ ...f, client_id: c.id }));
                            setShowClientDrop(false);
                            setClientSearch(c.name);
                          }}
                          style={{ width: '100%', background: 'none', border: 'none', borderBottom: `1px solid ${BORDER}`, padding: '10px 14px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <div>
                            <div style={{ color: TEXT, fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                            <div style={{ color: MUTED, fontSize: 11 }}>{c.address}{c.neighborhood ? `, ${c.neighborhood}` : ''}</div>
                          </div>
                          <span style={{ background: c.status === 'active' ? '#052e1633' : '#2d0a0a33', color: c.status === 'active' ? '#4ade80' : '#f87171', fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '2px 7px', flexShrink: 0 }}>
                            {c.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fecha */}
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>FECHA PROGRAMADA</label>
                  <input type="date" value={orderForm.scheduled_date} onChange={e => setOrderForm(f => ({ ...f, scheduled_date: e.target.value }))} style={{ ...iStyle, colorScheme: 'dark' }} />
                </div>

                {/* Hora */}
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>HORA</label>
                  <input type="time" value={orderForm.scheduled_time} onChange={e => setOrderForm(f => ({ ...f, scheduled_time: e.target.value }))} style={{ ...iStyle, colorScheme: 'dark' }} />
                </div>

                {/* Prioridad */}
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>PRIORIDAD</label>
                  <select value={orderForm.priority} onChange={e => setOrderForm(f => ({ ...f, priority: e.target.value }))} style={iStyle}>
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>

                {/* Creado por */}
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>CREADO POR</label>
                  <input value={orderForm.created_by} onChange={e => setOrderForm(f => ({ ...f, created_by: e.target.value }))} placeholder="Mariana" style={iStyle} />
                </div>

                {/* Descripcion */}
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>DESCRIPCION DEL TRABAJO</label>
                  <textarea value={orderForm.task_description} onChange={e => setOrderForm(f => ({ ...f, task_description: e.target.value }))} placeholder="Describe detalladamente el trabajo a realizar..." rows={3} style={{ ...iStyle, resize: 'vertical' }} />
                </div>

                {/* Novedades */}
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>NOVEDADES / OBSERVACIONES</label>
                  <textarea value={orderForm.notes} onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))} placeholder="Materiales necesarios, condiciones especiales, riesgos..." rows={2} style={{ ...iStyle, resize: 'vertical' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: `1px solid ${BORDER}`, marginTop: 4 }}>
                <button onClick={() => setShowOrderModal(false)} style={{ background: CARD, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13 }}>
                  Cancelar
                </button>
                <button onClick={saveOrder} disabled={saving} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Guardando...' : editingOrder ? 'Actualizar Orden' : 'Crear Orden'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
