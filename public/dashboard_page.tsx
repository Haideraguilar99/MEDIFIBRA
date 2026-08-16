'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { PLANS, TV_PLAN, formatCurrency } from '@/lib/plans'
import {
  Wifi, Users, UserCheck, UserX, DollarSign, Plus, Trash2, Pencil, X,
  Tv, CreditCard, CheckCircle, Clock, BarChart2, AlertCircle, FileText,
  LogOut, Phone, MapPin, Calendar, User, ChevronRight, Upload, Eye,
  Home, Zap, Gift, Info, RefreshCw
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

// ─── Tipos ───────────────────────────────────────────────────────────────────
type Client = {
  id: number; name: string; email: string; phone: string; cellphone: string
  address: string; city: string; neighborhood: string; commune: string
  consumption_date: string; payment_date: string; plan: string; plan_value: number
  reference: string; status: string; classification: string; notes: string
  created_at: string
  // campos nuevos
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

// ─── Paleta ──────────────────────────────────────────────────────────────────
const BG    = '#080c14'
const BG2   = '#0d1117'
const CARD  = '#111827'
const CARD2 = '#1a2233'
const BORDER= '#1f2937'
const BLUE  = '#3b82f6'
const MUTED = '#6b7280'
const LIGHT = '#9ca3af'

// ─── Clasificaciones ─────────────────────────────────────────────────────────
const CLASSIFICATIONS = [
  'AL DÍA',
  'PRÓXIMO A PAGAR',
  'RECORDAR ENVIAR RECIBO',
  'DEBE MUCHO – RECOGER EQUIPO',
  'DEUDA PENDIENTE',
  'NOVEDAD DE PAGO',
  'NO PAGA – AUTORIZADO',
  'SUSPENDIDO',
  'USUARIO PERDIDO',
] as const
type Classification = typeof CLASSIFICATIONS[number]

const CLASS_CONFIG: Record<Classification, { bg: string; text: string; border: string; label: string }> = {
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
function getClassConfig(cls: string) {
  return CLASS_CONFIG[cls as Classification] ?? { bg:'#1a1f2e', text:'#9ca3af', border:'#374151', label: cls }
}

// ─── Defaults ────────────────────────────────────────────────────────────────
const EMPTY_CLIENT = {
  name:'', email:'', phone:'', cellphone:'', address:'', city:'', neighborhood:'',
  commune:'', consumption_date:'', payment_date:'', plan:'', plan_value:0,
  reference:'', status:'active', classification:'AL DÍA', notes:'',
  cedula:'', punto_referencia:'', foto_fachada:'', telefono_alternativo:'',
  fecha_instalacion:'', incluye_tv:0, dia_pago:'30',
  referido_nombre:'', referido_telefono:''
}
const EMPTY_PAYMENT = { client_id:0, amount:0, period:'', method:'efectivo', status:'paid', notes:'' }
const METHODS = ['efectivo','transferencia','nequi','daviplata','bancolombia']

// ─── Componentes pequeños ────────────────────────────────────────────────────
const ClassBadge = ({ cls, size='sm' }: { cls: string; size?: 'xs'|'sm' }) => {
  const cfg = getClassConfig(cls)
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full whitespace-nowrap
        ${size==='xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
      style={{ backgroundColor:cfg.bg, color:cfg.text, border:`1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  )
}

const StatusDot = ({ status, label }: { status:string; label:string }) => {
  const ok  = status==='ok'||status==='connected'
  const err = status==='error'
  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        {ok && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>}
        <span className={`relative inline-flex rounded-full h-2 w-2
          ${ok?'bg-green-400':err?'bg-red-500':'bg-yellow-400'}`}/>
      </span>
      <span className={`text-xs ${ok?'text-green-400':err?'text-red-400':'text-yellow-400'}`}>{label}</span>
    </div>
  )
}

// ─── Panel de detalle de cliente ─────────────────────────────────────────────
function ClientDetailPanel({
  client,
  onClose,
  onEdit,
  onDelete,
  onRegisterPayment,
}: {
  client: Client
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onRegisterPayment: () => void
}) {
  const cfg      = getClassConfig(client.classification)
  const planColor= PLANS.find(p=>p.name===client.plan)?.color ?? '#64748b'

  const Field = ({ label, value, icon }: { label:string; value:string|number|null|undefined; icon?:React.ReactNode }) => {
    if (!value && value !== 0) return null
    return (
      <div className="flex items-start gap-3">
        {icon && <span className="mt-0.5 flex-shrink-0" style={{color:MUTED}}>{icon}</span>}
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{color:MUTED}}>{label}</p>
          <p className="text-sm text-white break-words">{String(value)}</p>
        </div>
      </div>
    )
  }

  const Section = ({ title, children }: { title:string; children:React.ReactNode }) => (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest mb-3 pb-2"
         style={{color:BLUE, borderBottom:`1px solid ${BORDER}`}}>{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex" style={{backgroundColor:'rgba(0,0,0,0.7)'}}>
      {/* Overlay click to close */}
      <div className="flex-1" onClick={onClose}/>

      {/* Panel lateral */}
      <div className="w-full max-w-md flex flex-col overflow-hidden"
           style={{backgroundColor:BG2, borderLeft:`1px solid ${BORDER}`}}>

        {/* Header del panel */}
        <div className="flex items-start justify-between p-5 flex-shrink-0"
             style={{borderBottom:`1px solid ${BORDER}`}}>
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar con foto o inicial */}
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
                 style={{backgroundColor:CARD2, border:`2px solid ${cfg.border}`}}>
              {client.foto_fachada ? (
                <img src={client.foto_fachada} alt="Fachada"
                     className="w-full h-full object-cover"/>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold"
                     style={{color:cfg.text}}>
                  {client.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-white text-base leading-tight truncate">{client.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="px-2 py-0.5 rounded text-xs text-white font-medium"
                      style={{backgroundColor:planColor}}>{client.plan}</span>
                <ClassBadge cls={client.classification} size="xs"/>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0 ml-2"
                  style={{color:MUTED}}>
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Foto de fachada grande si existe */}
        {client.foto_fachada && (
          <div className="px-5 pt-4 flex-shrink-0">
            <div className="rounded-xl overflow-hidden h-40 w-full"
                 style={{border:`1px solid ${BORDER}`}}>
              <img src={client.foto_fachada} alt="Fachada del cliente"
                   className="w-full h-full object-cover"/>
            </div>
          </div>
        )}

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Valor del plan */}
          <div className="rounded-xl p-4 flex items-center justify-between"
               style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
            <div>
              <p className="text-xs" style={{color:MUTED}}>Plan mensual</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(client.plan_value)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{color:MUTED}}>Día de pago</p>
              <p className="text-lg font-bold text-white">Día {client.dia_pago || client.payment_date || '—'}</p>
            </div>
          </div>

          <Section title="Identificación">
            <Field label="Cédula / NIT"       value={client.cedula}    icon={<User className="w-4 h-4"/>}/>
            <Field label="Referencia interna" value={client.reference} icon={<Info className="w-4 h-4"/>}/>
          </Section>

          <Section title="Contacto">
            <Field label="Celular principal"   value={client.cellphone}           icon={<Phone className="w-4 h-4"/>}/>
            <Field label="Celular alternativo" value={client.telefono_alternativo} icon={<Phone className="w-4 h-4"/>}/>
            <Field label="Teléfono fijo"       value={client.phone}               icon={<Phone className="w-4 h-4"/>}/>
            <Field label="Correo electrónico"  value={client.email}               icon={<Info className="w-4 h-4"/>}/>
          </Section>

          <Section title="Ubicación">
            <Field label="Dirección"          value={client.address}          icon={<Home className="w-4 h-4"/>}/>
            <Field label="Punto de referencia" value={client.punto_referencia}  icon={<MapPin className="w-4 h-4"/>}/>
            <Field label="Barrio"             value={client.neighborhood}     icon={<MapPin className="w-4 h-4"/>}/>
            <Field label="Comuna"             value={client.commune}          icon={<MapPin className="w-4 h-4"/>}/>
            <Field label="Ciudad"             value={client.city}             icon={<MapPin className="w-4 h-4"/>}/>
          </Section>

          <Section title="Servicio">
            <Field label="Plan contratado"    value={client.plan}                   icon={<Wifi className="w-4 h-4"/>}/>
            <Field label="Valor mensual"      value={formatCurrency(client.plan_value)} icon={<DollarSign className="w-4 h-4"/>}/>
            <Field label="Fecha instalación"  value={client.fecha_instalacion}      icon={<Calendar className="w-4 h-4"/>}/>
            <Field label="Fecha consumo"      value={client.consumption_date}       icon={<Calendar className="w-4 h-4"/>}/>
            <Field label="Día de pago"        value={client.dia_pago ? `Día ${client.dia_pago}` : ''} icon={<Calendar className="w-4 h-4"/>}/>
            {client.incluye_tv === 1 && (
              <div className="flex items-center gap-3">
                <Tv className="w-4 h-4 flex-shrink-0" style={{color:MUTED}}/>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{color:MUTED}}>TV Satelital</p>
                  <p className="text-sm" style={{color:'#f59e0b'}}>✓ Incluye televisión satelital</p>
                </div>
              </div>
            )}
          </Section>

          {(client.referido_nombre || client.referido_telefono) && (
            <Section title="Referido por">
              <Field label="Nombre del referido"   value={client.referido_nombre}   icon={<Gift className="w-4 h-4"/>}/>
              <Field label="Teléfono del referido" value={client.referido_telefono} icon={<Phone className="w-4 h-4"/>}/>
            </Section>
          )}

          {client.notes && (
            <Section title="Novedades / Notas">
              <div className="rounded-lg p-3 text-sm text-white leading-relaxed whitespace-pre-wrap"
                   style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
                {client.notes}
              </div>
            </Section>
          )}

          <Section title="Registro">
            <Field label="Cliente desde" value={client.created_at?.slice(0,10)} icon={<Calendar className="w-4 h-4"/>}/>
          </Section>
        </div>

        {/* Acciones fijas al fondo */}
        <div className="p-4 flex-shrink-0 space-y-2" style={{borderTop:`1px solid ${BORDER}`}}>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onRegisterPayment}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                    style={{backgroundColor:'#16a34a', color:'white'}}>
              <CreditCard className="w-4 h-4"/> Registrar Pago
            </button>
            <Link href={`/factura/${client.id}`} target="_blank"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                  style={{backgroundColor:CARD2, border:`1px solid ${BORDER}`, color:LIGHT}}>
              <FileText className="w-4 h-4"/> Ver Factura
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onEdit}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-blue-600"
                    style={{backgroundColor:BLUE, color:'white'}}>
              <Pencil className="w-4 h-4"/> Editar
            </button>
            <button onClick={onDelete}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-red-600"
                    style={{backgroundColor:'#7f1d1d', color:'#fca5a5', border:`1px solid #991b1b`}}>
              <Trash2 className="w-4 h-4"/> Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal de cliente (crear / editar) ───────────────────────────────────────
function ClientModal({
  editClient,
  form,
  setForm,
  onSave,
  onClose,
}: {
  editClient: Client | null
  form: typeof EMPTY_CLIENT
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_CLIENT>>
  onSave: () => void
  onClose: () => void
}) {
  const iStyle = { backgroundColor: BG, border:`1px solid ${BORDER}`, color:'white' }
  const iCls   = "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('La foto no puede superar 2 MB'); return }
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      // Comprimir via canvas
      const img = document.createElement('img')
      img.onload = () => {
        const canvas  = document.createElement('canvas')
        const MAX     = 800
        const ratio   = Math.min(MAX / img.width, MAX / img.height, 1)
        canvas.width  = img.width  * ratio
        canvas.height = img.height * ratio
        const ctx     = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const compressed = canvas.toDataURL('image/jpeg', 0.65)
        setForm(p => ({ ...p, foto_fachada: compressed }))
        toast.success('Foto cargada ✓')
      }
      img.src = result
    }
    reader.readAsDataURL(file)
  }

  const SectionTitle = ({ title, subtitle }: { title:string; subtitle?:string }) => (
    <div className="col-span-2 pt-2">
      <div className="flex items-center gap-2 pb-2" style={{borderBottom:`1px solid ${BORDER}`}}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{color:BLUE}}>{title}</p>
        {subtitle && <p className="text-xs" style={{color:MUTED}}>— {subtitle}</p>}
      </div>
    </div>
  )

  const Field = ({ label, children, wide }: { label:string; children:React.ReactNode; wide?:boolean }) => (
    <div className={wide ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium mb-1" style={{color:MUTED}}>{label}</label>
      {children}
    </div>
  )

  const cfg = getClassConfig(form.classification)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{backgroundColor:'rgba(0,0,0,0.85)'}}>
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl flex flex-col"
           style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 flex-shrink-0"
             style={{borderBottom:`1px solid ${BORDER}`}}>
          <div>
            <h3 className="font-bold text-white text-lg">
              {editClient ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h3>
            <p className="text-xs mt-0.5" style={{color:MUTED}}>
              Los campos marcados con * son obligatorios
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors" style={{color:MUTED}}>
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Formulario */}
        <div className="p-5 grid grid-cols-2 gap-4 flex-1">

          {/* ── IDENTIFICACIÓN ── */}
          <SectionTitle title="Identificación"/>
          <Field label="Nombre completo *">
            <input type="text" value={form.name}
                   onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                   placeholder="Ej: Juan Carlos Pérez"
                   style={iStyle} className={iCls}/>
          </Field>
          <Field label="Cédula / NIT">
            <input type="text" value={form.cedula}
                   onChange={e=>setForm(p=>({...p,cedula:e.target.value}))}
                   placeholder="Ej: 1234567890"
                   style={iStyle} className={iCls}/>
          </Field>
          <Field label="Referencia interna">
            <input type="text" value={form.reference}
                   onChange={e=>setForm(p=>({...p,reference:e.target.value}))}
                   placeholder="Código interno"
                   style={iStyle} className={iCls}/>
          </Field>

          {/* ── CONTACTO ── */}
          <SectionTitle title="Contacto"/>
          <Field label="Celular principal *">
            <input type="tel" value={form.cellphone}
                   onChange={e=>setForm(p=>({...p,cellphone:e.target.value}))}
                   placeholder="Ej: 3001234567"
                   style={iStyle} className={iCls}/>
          </Field>
          <Field label="Celular alternativo">
            <input type="tel" value={form.telefono_alternativo}
                   onChange={e=>setForm(p=>({...p,telefono_alternativo:e.target.value}))}
                   placeholder="Ej: 3009876543"
                   style={iStyle} className={iCls}/>
          </Field>
          <Field label="Teléfono fijo">
            <input type="tel" value={form.phone}
                   onChange={e=>setForm(p=>({...p,phone:e.target.value}))}
                   placeholder="Ej: 6041234567"
                   style={iStyle} className={iCls}/>
          </Field>
          <Field label="Correo electrónico">
            <input type="email" value={form.email}
                   onChange={e=>setForm(p=>({...p,email:e.target.value}))}
                   placeholder="correo@ejemplo.com"
                   style={iStyle} className={iCls}/>
          </Field>

          {/* ── UBICACIÓN ── */}
          <SectionTitle title="Ubicación"/>
          <Field label="Dirección de instalación" wide>
            <input type="text" value={form.address}
                   onChange={e=>setForm(p=>({...p,address:e.target.value}))}
                   placeholder="Ej: Cra 80 #23-45, Apto 102"
                   style={iStyle} className={iCls}/>
          </Field>
          <Field label="Punto de referencia" wide>
            <input type="text" value={form.punto_referencia}
                   onChange={e=>setForm(p=>({...p,punto_referencia:e.target.value}))}
                   placeholder="Ej: Casa azul frente a la tienda Don Jorge"
                   style={iStyle} className={iCls}/>
          </Field>
          <Field label="Barrio">
            <input type="text" value={form.neighborhood}
                   onChange={e=>setForm(p=>({...p,neighborhood:e.target.value}))}
                   placeholder="Ej: Blanquizal"
                   style={iStyle} className={iCls}/>
          </Field>
          <Field label="Comuna">
            <input type="text" value={form.commune}
                   onChange={e=>setForm(p=>({...p,commune:e.target.value}))}
                   placeholder="Ej: 13"
                   style={iStyle} className={iCls}/>
          </Field>
          <Field label="Ciudad">
            <input type="text" value={form.city}
                   onChange={e=>setForm(p=>({...p,city:e.target.value}))}
                   placeholder="Ej: Medellín"
                   style={iStyle} className={iCls}/>
          </Field>

          {/* ── FOTO FACHADA ── */}
          <Field label="Foto de la fachada" wide>
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto}/>
                <button type="button"
                        onClick={()=>fileRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                        style={{backgroundColor:CARD2, border:`2px dashed ${BORDER}`, color:LIGHT}}>
                  <Upload className="w-4 h-4"/>
                  {form.foto_fachada ? 'Cambiar foto' : 'Subir foto (máx. 2 MB)'}
                </button>
                <p className="text-xs mt-1" style={{color:MUTED}}>
                  JPG/PNG · Se comprime automáticamente para ahorrar espacio
                </p>
              </div>
              {form.foto_fachada && (
                <div className="relative flex-shrink-0">
                  <img src={form.foto_fachada} alt="Preview"
                       className="w-20 h-20 object-cover rounded-lg"
                       style={{border:`1px solid ${BORDER}`}}/>
                  <button type="button"
                          onClick={()=>setForm(p=>({...p,foto_fachada:''}))}
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                          style={{backgroundColor:'#991b1b', color:'white'}}>
                    ×
                  </button>
                </div>
              )}
            </div>
          </Field>

          {/* ── SERVICIO ── */}
          <SectionTitle title="Servicio"/>
          <Field label="Plan *">
            <select value={form.plan}
                    onChange={e=>{
                      const p = PLANS.find(x=>x.name===e.target.value)
                      setForm(prev=>({...prev, plan:e.target.value, plan_value:p?.value??0}))
                    }}
                    style={iStyle} className={iCls}>
              <option value="">Seleccionar plan...</option>
              {PLANS.map(p=>(
                <option key={p.id} value={p.name}>{p.name} — {formatCurrency(p.value)}/mes</option>
              ))}
            </select>
          </Field>
          <Field label="Valor mensual ($)">
            <input type="number" value={form.plan_value}
                   onChange={e=>setForm(p=>({...p,plan_value:Number(e.target.value)}))}
                   style={iStyle} className={iCls}/>
          </Field>
          <Field label="Fecha de instalación">
            <input type="date" value={form.fecha_instalacion}
                   onChange={e=>setForm(p=>({...p,fecha_instalacion:e.target.value}))}
                   style={iStyle} className={iCls}/>
          </Field>
          <Field label="Fecha de consumo">
            <input type="date" value={form.consumption_date}
                   onChange={e=>setForm(p=>({...p,consumption_date:e.target.value}))}
                   style={iStyle} className={iCls}/>
          </Field>
          <Field label="Día de pago">
            <select value={form.dia_pago}
                    onChange={e=>setForm(p=>({...p,dia_pago:e.target.value}))}
                    style={iStyle} className={iCls}>
              <option value="15">Día 15 de cada mes</option>
              <option value="30">Día 30 de cada mes</option>
            </select>
          </Field>
          <Field label="Fecha de pago (específica)">
            <input type="date" value={form.payment_date}
                   onChange={e=>setForm(p=>({...p,payment_date:e.target.value}))}
                   style={iStyle} className={iCls}/>
          </Field>

          {/* TV Satelital */}
          <div className="col-span-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1
                ${form.incluye_tv ? 'bg-blue-600' : 'bg-gray-700'}`}
                   onClick={()=>setForm(p=>({...p,incluye_tv:p.incluye_tv?0:1}))}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform
                  ${form.incluye_tv ? 'translate-x-4' : 'translate-x-0'}`}/>
              </div>
              <span className="text-sm" style={{color:LIGHT}}>
                Incluye TV Satelital
                <span className="ml-1 text-xs" style={{color:MUTED}}>
                  (+{formatCurrency(TV_PLAN.value)}/punto)
                </span>
              </span>
            </label>
          </div>

          {/* ── ESTADO Y CLASIFICACIÓN ── */}
          <SectionTitle title="Estado y clasificación"/>
          <Field label="Estado del servicio">
            <select value={form.status}
                    onChange={e=>setForm(p=>({...p,status:e.target.value}))}
                    style={iStyle} className={iCls}>
              <option value="active">Activo</option>
              <option value="suspended">Suspendido</option>
            </select>
          </Field>
          <Field label="Clasificación de cobro">
            <select value={form.classification}
                    onChange={e=>setForm(p=>({...p,classification:e.target.value}))}
                    style={iStyle} className={iCls}>
              {CLASSIFICATIONS.map(c=>(
                <option key={c} value={c}>{getClassConfig(c).label}</option>
              ))}
            </select>
          </Field>
          {/* Preview badge */}
          <div className="col-span-2 flex items-center gap-2">
            <p className="text-xs" style={{color:MUTED}}>Vista previa:</p>
            <span className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{backgroundColor:cfg.bg, color:cfg.text, border:`1px solid ${cfg.border}`}}>
              {cfg.label}
            </span>
          </div>

          {/* ── REFERIDO ── */}
          <SectionTitle title="Referido" subtitle="opcional"/>
          <Field label="Nombre del referido">
            <input type="text" value={form.referido_nombre}
                   onChange={e=>setForm(p=>({...p,referido_nombre:e.target.value}))}
                   placeholder="Quién refirió a este cliente"
                   style={iStyle} className={iCls}/>
          </Field>
          <Field label="Teléfono del referido">
            <input type="tel" value={form.referido_telefono}
                   onChange={e=>setForm(p=>({...p,referido_telefono:e.target.value}))}
                   placeholder="Ej: 3001234567"
                   style={iStyle} className={iCls}/>
          </Field>

          {/* ── NOTAS ── */}
          <SectionTitle title="Novedades y notas" subtitle="opcional"/>
          <Field label="Notas internas" wide>
            <textarea value={form.notes}
                      onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
                      rows={3}
                      placeholder="Observaciones, novedades o información adicional..."
                      style={iStyle}
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-colors"/>
          </Field>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 flex-shrink-0"
             style={{borderTop:`1px solid ${BORDER}`}}>
          <button onClick={onClose}
                  style={{border:`1px solid ${BORDER}`, color:LIGHT}}
                  className="px-5 py-2.5 text-sm rounded-lg hover:text-white transition-colors font-medium">
            Cancelar
          </button>
          <button onClick={onSave}
                  style={{backgroundColor:BLUE}}
                  className="px-7 py-2.5 text-sm rounded-lg font-medium hover:opacity-90 transition-opacity text-white">
            {editClient ? 'Actualizar Cliente' : 'Guardar Cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter()
  const [clients,       setClients]       = useState<Client[]>([])
  const [payments,      setPayments]      = useState<Payment[]>([])
  const [stats,         setStats]         = useState<Stats>({ total:0, active:0, suspended:0, monthly_income:0 })
  const [payStats,      setPayStats]      = useState<PaymentStats>({ total:0, total_amount:0, paid_amount:0, pending_amount:0 })
  const [classStats,    setClassStats]    = useState<ClassStat[]>([])
  const [reports,       setReports]       = useState<ReportData|null>(null)
  const [showModal,     setShowModal]     = useState(false)
  const [showPayModal,  setShowPayModal]  = useState(false)
  const [editClient,    setEditClient]    = useState<Client|null>(null)
  const [editPayment,   setEditPayment]   = useState<Payment|null>(null)
  const [detailClient,  setDetailClient]  = useState<Client|null>(null)
  const [form,          setForm]          = useState<typeof EMPTY_CLIENT>(EMPTY_CLIENT)
  const [payForm,       setPayForm]       = useState(EMPTY_PAYMENT)
  const [sseStatus,     setSseStatus]     = useState<'connecting'|'connected'|'error'>('connecting')
  const [dbStatus,      setDbStatus]      = useState<'checking'|'ok'|'error'>('checking')
  const [tab,           setTab]           = useState<'dashboard'|'plans'|'clients'|'payments'|'reports'>('dashboard')
  const [search,        setSearch]        = useState('')
  const [filterPlan,    setFilterPlan]    = useState('')
  const [filterStatus,  setFilterStatus]  = useState('')
  const [filterClass,   setFilterClass]   = useState('')
  const [loading,       setLoading]       = useState(true)

  // ── Fetch ──
  const fetchClients = useCallback(async () => {
    try {
      const res  = await fetch('/api/clients')
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
      const res  = await fetch('/api/payments')
      if (!res.ok) return
      const data = await res.json()
      setPayments(data.payments ?? [])
      setPayStats(data.stats ?? { total:0, total_amount:0, paid_amount:0, pending_amount:0 })
    } catch {}
  }, [])

  const fetchReports = useCallback(async () => {
    try {
      const res  = await fetch('/api/reports')
      if (!res.ok) return
      const data = await res.json()
      setReports(data)
    } catch {}
  }, [])

  useEffect(() => {
    fetch('/api/init')
      .then(r => { if (r.ok) setDbStatus('ok'); else setDbStatus('error') })
      .catch(() => setDbStatus('error'))
      .finally(async () => {
        await Promise.all([fetchClients(), fetchPayments(), fetchReports()])
        setLoading(false)
      })
  }, [fetchClients, fetchPayments, fetchReports])

  // ── SSE ──
  useEffect(() => {
    setSseStatus('connecting')
    const es = new EventSource('/api/sse')
    es.addEventListener('connected',      ()  => setSseStatus('connected'))
    es.addEventListener('new-client',     e   => { const c=JSON.parse(e.data); setClients(p=>[c,...p]); toast.success('Nuevo cliente: '+c.name); fetchClients() })
    es.addEventListener('update-client',  e   => { const u=JSON.parse(e.data); setClients(p=>p.map(c=>c.id===u.id?u:c)); toast.success('Actualizado: '+u.name) })
    es.addEventListener('delete-client',  ()  => { fetchClients(); toast.success('Cliente eliminado') })
    es.addEventListener('new-payment',    e   => { const p=JSON.parse(e.data); setPayments(prev=>[p,...prev]); toast.success('Pago registrado: '+p.client_name); fetchPayments(); fetchReports() })
    es.addEventListener('update-payment', e   => { const u=JSON.parse(e.data); setPayments(p=>p.map(x=>x.id===u.id?u:x)); fetchReports() })
    es.addEventListener('delete-payment', ()  => { fetchPayments(); fetchReports(); toast.success('Pago eliminado') })
    es.onerror = () => setSseStatus('error')
    return () => es.close()
  }, [fetchClients, fetchPayments, fetchReports])

  // ── Handlers clientes ──
  const handleSaveClient = async () => {
    if (!form.name.trim())     { toast.error('El nombre es obligatorio');   return }
    if (!form.cellphone.trim()){ toast.error('El celular es obligatorio');  return }
    if (!form.plan.trim())     { toast.error('Selecciona un plan');         return }
    const url = editClient ? `/api/clients/${editClient.id}` : '/api/clients'
    const res = await fetch(url, {
      method: editClient ? 'PUT' : 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowModal(false); setEditClient(null); setForm(EMPTY_CLIENT); fetchClients()
      toast.success(editClient ? 'Cliente actualizado' : 'Cliente creado')
    } else {
      const err = await res.json().catch(()=>({error:'Error desconocido'}))
      toast.error(err.error ?? 'Error al guardar')
    }
  }

  const handleSavePayment = async () => {
    if (!payForm.client_id)  { toast.error('Selecciona un cliente'); return }
    if (!payForm.amount)     { toast.error('El monto es obligatorio'); return }
    if (!payForm.period)     { toast.error('El período es obligatorio'); return }
    const url = editPayment ? `/api/payments/${editPayment.id}` : '/api/payments'
    const res = await fetch(url, {
      method: editPayment ? 'PUT' : 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payForm),
    })
    if (res.ok) {
      setShowPayModal(false); setEditPayment(null); setPayForm(EMPTY_PAYMENT)
      fetchPayments(); fetchReports()
      toast.success('Pago registrado')
    } else {
      toast.error('Error al guardar pago')
    }
  }

  const handleDeleteClient = async (id: number) => {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return
    await fetch(`/api/clients/${id}`, { method:'DELETE' })
    setDetailClient(null)
    fetchClients()
  }

  const handleDeletePayment = async (id: number) => {
    if (!confirm('¿Eliminar este pago?')) return
    await fetch(`/api/payments/${id}`, { method:'DELETE' })
    fetchPayments(); fetchReports()
  }

  const openEditClient = (c: Client) => {
    setEditClient(c)
    setForm({
      name: c.name, email: c.email, phone: c.phone, cellphone: c.cellphone,
      address: c.address, city: c.city, neighborhood: c.neighborhood, commune: c.commune,
      consumption_date: c.consumption_date, payment_date: c.payment_date,
      plan: c.plan, plan_value: c.plan_value, reference: c.reference,
      status: c.status, classification: c.classification, notes: c.notes,
      cedula: c.cedula??'', punto_referencia: c.punto_referencia??'',
      foto_fachada: c.foto_fachada??'', telefono_alternativo: c.telefono_alternativo??'',
      fecha_instalacion: c.fecha_instalacion??'', incluye_tv: c.incluye_tv??0,
      dia_pago: c.dia_pago??'30', referido_nombre: c.referido_nombre??'',
      referido_telefono: c.referido_telefono??'',
    })
    setDetailClient(null)
    setShowModal(true)
  }

  const openNewPayment = (clientId?: number) => {
    setEditPayment(null)
    const client = clientId ? clients.find(c=>c.id===clientId) : null
    setPayForm({
      ...EMPTY_PAYMENT,
      client_id: clientId ?? 0,
      amount: client?.plan_value ?? 0,
      period: new Date().toISOString().slice(0,7),
    })
    setDetailClient(null)
    setShowPayModal(true)
  }

  const openEditPayment = (p: Payment) => {
    setEditPayment(p)
    setPayForm({ client_id:p.client_id, amount:p.amount, period:p.period, method:p.method, status:p.status, notes:p.notes })
    setShowPayModal(true)
  }

  const getPlanColor = (n: string) => PLANS.find(p=>p.name===n)?.color ?? '#64748b'

  const filteredClients = clients.filter(c => {
    const q = search.toLowerCase()
    const ms = !q || c.name.toLowerCase().includes(q) || c.cellphone.includes(q)
                  || c.reference?.toLowerCase().includes(q)
                  || c.neighborhood?.toLowerCase().includes(q)
                  || c.cedula?.includes(q)
    const mp = !filterPlan   || c.plan           === filterPlan
    const mt = !filterStatus || c.status         === filterStatus
    const mc = !filterClass  || c.classification === filterClass
    return ms && mp && mt && mc
  })

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method:'POST' })
    router.push('/login'); router.refresh()
  }

  // ── UI helpers ──
  const iStyle = { backgroundColor: BG, border:`1px solid ${BORDER}`, color:'white' }
  const iCls   = "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) return (
      <div className="px-3 py-2 rounded-lg text-sm" style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
        <p style={{color:MUTED}}>{label}</p>
        <p className="text-blue-400 font-bold">{formatCurrency(Number(payload[0]?.value??0))}</p>
      </div>
    )
    return null
  }

  const MetricCard = ({ label, value, icon, sub }: { label:string; value:string|number; icon:React.ReactNode; sub?:string }) => (
    <div className="rounded-xl p-5 flex items-center gap-4" style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
      <div className="p-3 rounded-lg flex-shrink-0" style={{backgroundColor:CARD2, color:LIGHT}}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs mt-0.5" style={{color:MUTED}}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{color:BLUE}}>{sub}</p>}
      </div>
    </div>
  )

  const TABS = [
    { key:'dashboard', label:'Dashboard' },
    { key:'plans',     label:'Planes'    },
    { key:'clients',   label:'Clientes'  },
    { key:'payments',  label:'Pagos'     },
    { key:'reports',   label:'Reportes'  },
  ] as const

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen text-white" style={{backgroundColor:BG}}>
      <Toaster position="top-right"
               toastOptions={{ style:{ background:CARD, color:'white', border:`1px solid ${BORDER}` } }}/>

      {/* ── Header ── */}
      <header className="px-4 md:px-6 py-3 flex items-center justify-between"
              style={{backgroundColor:BG2, borderBottom:`1px solid ${BORDER}`}}>
        <div>
          <h1 className="text-xl font-bold tracking-widest text-white">MEDIFIBRA</h1>
          <p className="text-xs" style={{color:MUTED}}>Sistema de Gestión ISP</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/import"
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:text-white"
                style={{backgroundColor:CARD, border:`1px solid ${BORDER}`, color:LIGHT}}>
            📥 Importar
          </Link>
          <div className="hidden sm:flex items-center gap-4 px-4 py-2 rounded-lg"
               style={{backgroundColor:BG, border:`1px solid ${BORDER}`}}>
            <StatusDot status={dbStatus}  label="Turso DB"/>
            <div style={{width:1, height:14, backgroundColor:BORDER}}/>
            <StatusDot status={sseStatus} label="SSE Live"/>
          </div>
          <button onClick={()=>{ fetchClients(); fetchPayments(); fetchReports(); toast.success('Actualizado') }}
                  className="p-2 rounded-lg transition-colors hover:text-white"
                  style={{backgroundColor:CARD, border:`1px solid ${BORDER}`, color:LIGHT}}
                  title="Actualizar datos">
            <RefreshCw className="w-4 h-4"/>
          </button>
          <button onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:text-red-400"
                  style={{backgroundColor:CARD, border:`1px solid ${BORDER}`, color:LIGHT}}>
            <LogOut className="w-4 h-4"/> <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* ── Nav ── */}
      <nav className="px-4 md:px-6 flex gap-1 overflow-x-auto"
           style={{backgroundColor:BG2, borderBottom:`1px solid ${BORDER}`}}>
        {TABS.map(t => (
          <button key={t.key} onClick={()=>setTab(t.key)}
                  className={`px-4 md:px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                    ${tab===t.key ? 'border-blue-500 text-white' : 'border-transparent hover:text-white'}`}
                  style={{color: tab===t.key ? 'white' : MUTED}}>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
            <p className="text-sm" style={{color:MUTED}}>Cargando datos...</p>
          </div>
        </div>
      )}

      {!loading && (
      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">

        {/* ══ DASHBOARD ══ */}
        {tab==='dashboard' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <MetricCard label="Total Clientes" value={stats.total}                              icon={<Users className="w-5 h-5"/>}/>
              <MetricCard label="Activos"         value={stats.active}                             icon={<UserCheck className="w-5 h-5"/>}/>
              <MetricCard label="Suspendidos"     value={stats.suspended}                          icon={<UserX className="w-5 h-5"/>}/>
              <MetricCard label="Ingresos / Mes"  value={formatCurrency(stats.monthly_income??0)}  icon={<DollarSign className="w-5 h-5"/>}/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <MetricCard label="Total Cobrado"    value={formatCurrency(payStats.paid_amount??0)}    icon={<CheckCircle className="w-5 h-5"/>}/>
              <MetricCard label="Pendiente"         value={formatCurrency(payStats.pending_amount??0)} icon={<Clock className="w-5 h-5"/>}/>
              <MetricCard label="Pagos Registrados" value={payStats.total??0}                          icon={<CreditCard className="w-5 h-5"/>}/>
            </div>

            {/* Panel clasificaciones */}
            {classStats.length > 0 && (
              <div className="rounded-xl p-5" style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
                <h2 className="text-sm font-semibold mb-4" style={{color:LIGHT}}>
                  Estado de la Cartera — {stats.total} clientes
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {classStats.map(cs => {
                    const cfg = getClassConfig(cs.classification)
                    const pct = stats.total ? Math.round((Number(cs.n)/stats.total)*100) : 0
                    return (
                      <button key={cs.classification}
                              onClick={()=>{ setTab('clients'); setFilterClass(cs.classification) }}
                              className="rounded-xl p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                              style={{backgroundColor:cfg.bg, border:`1px solid ${cfg.border}`}}>
                        <p className="text-xl font-bold" style={{color:cfg.text}}>{cs.n}</p>
                        <p className="text-xs font-medium mt-0.5 leading-tight" style={{color:cfg.text, opacity:0.9}}>{cfg.label}</p>
                        <div className="mt-2 h-1 rounded-full" style={{backgroundColor:cfg.border}}>
                          <div className="h-full rounded-full" style={{width:`${pct}%`, backgroundColor:cfg.text}}/>
                        </div>
                        <p className="text-xs mt-1" style={{color:cfg.text, opacity:0.6}}>{pct}% del total</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Clientes recientes */}
              <div className="rounded-xl overflow-hidden" style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
                <div className="px-5 py-4" style={{borderBottom:`1px solid ${BORDER}`}}>
                  <h2 className="text-sm font-semibold" style={{color:LIGHT}}>Clientes Recientes</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{borderBottom:`1px solid ${BORDER}`}}>
                        {['Cliente','Plan','Estado'].map(h=>(
                          <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{color:MUTED}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {clients.slice(0,6).map(c=>(
                        <tr key={c.id} className="hover:bg-white/5 cursor-pointer transition-colors"
                            style={{borderBottom:`1px solid ${BORDER}`}}
                            onClick={()=>setDetailClient(c)}>
                          <td className="px-5 py-2.5">
                            <p className="font-medium text-white truncate max-w-[160px]">{c.name}</p>
                            <p className="text-xs mt-0.5" style={{color:MUTED}}>{c.cellphone}</p>
                          </td>
                          <td className="px-5 py-2.5">
                            <span className="px-2 py-0.5 rounded text-xs text-white font-medium"
                                  style={{backgroundColor:getPlanColor(c.plan)}}>{c.plan}</span>
                          </td>
                          <td className="px-5 py-2.5"><ClassBadge cls={c.classification} size="xs"/></td>
                        </tr>
                      ))}
                      {!clients.length && (
                        <tr><td colSpan={3} className="py-8 text-center text-sm" style={{color:MUTED}}>Sin clientes aún</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Últimos pagos */}
              <div className="rounded-xl overflow-hidden" style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
                <div className="px-5 py-4" style={{borderBottom:`1px solid ${BORDER}`}}>
                  <h2 className="text-sm font-semibold" style={{color:LIGHT}}>Últimos Pagos</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{borderBottom:`1px solid ${BORDER}`}}>
                        {['Cliente','Monto','Estado'].map(h=>(
                          <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{color:MUTED}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.slice(0,6).map(p=>(
                        <tr key={p.id} className="hover:bg-white/5 transition-colors" style={{borderBottom:`1px solid ${BORDER}`}}>
                          <td className="px-5 py-2.5 font-medium text-white">{p.client_name}</td>
                          <td className="px-5 py-2.5 text-green-400 font-semibold">{formatCurrency(p.amount)}</td>
                          <td className="px-5 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                              ${p.status==='paid'?'bg-green-900/40 text-green-400':'bg-yellow-900/40 text-yellow-400'}`}>
                              {p.status==='paid'?'Pagado':'Pendiente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {!payments.length && (
                        <tr><td colSpan={3} className="py-8 text-center text-sm" style={{color:MUTED}}>Sin pagos aún</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══ PLANES ══ */}
        {tab==='plans' && (
          <div className="space-y-5">
            <div className="text-center pt-2">
              <h2 className="text-2xl font-bold text-white mb-1">Planes Disponibles</h2>
              <p className="text-sm" style={{color:MUTED}}>Conéctate con velocidad real</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {PLANS.map(plan=>(
                <div key={plan.id}
                     className="rounded-xl p-4 text-center hover:border-blue-500/50 transition-all"
                     style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                       style={{backgroundColor:plan.color}}>
                    <span className="text-white font-bold text-lg">{plan.label}</span>
                  </div>
                  <p className="text-xs mb-1" style={{color:MUTED}}>Mbps</p>
                  <p className="text-base font-bold text-white mb-1">{formatCurrency(plan.value)}</p>
                  <p className="text-xs" style={{color:MUTED}}>mensuales</p>
                  <div className="mt-3 flex justify-center"><Wifi className="w-5 h-5" style={{color:plan.color}}/></div>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-5 flex items-center gap-4"
                 style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
              <div className="p-3 rounded-xl" style={{backgroundColor:CARD2}}>
                <Tv className="w-6 h-6" style={{color:LIGHT}}/>
              </div>
              <div>
                <h3 className="font-semibold text-white">Televisión Satelital</h3>
                <p className="text-sm" style={{color:MUTED}}>
                  Cada punto: <span className="font-bold" style={{color:BLUE}}>{formatCurrency(TV_PLAN.value)}</span>
                </p>
              </div>
            </div>
            <div className="rounded-xl p-5" style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
              <h3 className="text-sm font-semibold mb-4" style={{color:LIGHT}}>Distribución de clientes por plan</h3>
              <div className="space-y-3">
                {PLANS.map(plan=>{
                  const count = clients.filter(c=>c.plan===plan.name).length
                  const pct   = clients.length ? Math.round((count/clients.length)*100) : 0
                  return (
                    <div key={plan.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{color:LIGHT}}>{plan.name}</span>
                        <span style={{color:LIGHT}}>{count} clientes · {pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{backgroundColor:BG}}>
                        <div className="h-full rounded-full transition-all duration-500"
                             style={{width:`${pct}%`, backgroundColor:plan.color}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══ CLIENTES ══ */}
        {tab==='clients' && (
          <div className="space-y-3">
            {/* Filtros */}
            <div className="rounded-xl p-4" style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input type="text"
                           placeholder="Buscar por nombre, celular, cédula, barrio..."
                           value={search} onChange={e=>setSearch(e.target.value)}
                           style={iStyle} className={iCls+' pl-9'}/>
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm">🔍</span>
                  </div>
                  <select value={filterPlan} onChange={e=>setFilterPlan(e.target.value)}
                          style={iStyle} className={iCls+' sm:w-44'}>
                    <option value="">Todos los planes</option>
                    {PLANS.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
                          style={iStyle} className={iCls+' sm:w-36'}>
                    <option value="">Todos</option>
                    <option value="active">Activos</option>
                    <option value="suspended">Suspendidos</option>
                  </select>
                </div>
                {/* Filtros clasificación */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-medium" style={{color:MUTED}}>Estado:</span>
                  <button onClick={()=>setFilterClass('')}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border
                            ${!filterClass ? 'text-white border-blue-500 bg-blue-500/20' : 'border-transparent hover:border-slate-600'}`}
                          style={{color: !filterClass ? 'white' : MUTED}}>
                    Todos ({clients.length})
                  </button>
                  {classStats.map(cs => {
                    const cfg    = getClassConfig(cs.classification)
                    const active = filterClass === cs.classification
                    return (
                      <button key={cs.classification}
                              onClick={()=>setFilterClass(active ? '' : cs.classification)}
                              className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                              style={{
                                backgroundColor: active ? cfg.bg : 'transparent',
                                color: cfg.text,
                                border: `1px solid ${active ? cfg.border : 'transparent'}`,
                                outline: active ? `1px solid ${cfg.border}` : 'none',
                              }}>
                        {cfg.label} ({cs.n})
                      </button>
                    )
                  })}
                  {(search||filterPlan||filterStatus||filterClass) && (
                    <button onClick={()=>{ setSearch(''); setFilterPlan(''); setFilterStatus(''); setFilterClass('') }}
                            className="px-3 py-1 rounded-full text-xs hover:text-white transition-colors"
                            style={{border:`1px solid ${BORDER}`, color:LIGHT}}>
                      ✕ Limpiar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tabla */}
            <div className="rounded-xl overflow-hidden" style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
              <div className="flex items-center justify-between px-5 py-4"
                   style={{borderBottom:`1px solid ${BORDER}`}}>
                <h2 className="font-semibold text-white">
                  Clientes <span style={{color:MUTED}}>({filteredClients.length})</span>
                </h2>
                <button onClick={()=>{ setEditClient(null); setForm(EMPTY_CLIENT); setShowModal(true) }}
                        className="flex items-center gap-2 hover:opacity-90 text-sm px-4 py-2 rounded-lg transition-opacity font-medium text-white"
                        style={{backgroundColor:BLUE}}>
                  <Plus className="w-4 h-4"/> <span className="hidden sm:inline">Nuevo Cliente</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{borderBottom:`1px solid ${BORDER}`, backgroundColor:BG}}>
                      {['Cliente','Celular','Plan','Valor','Clasificación','Día Pago','Barrio','Acciones'].map(h=>(
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                            style={{color:MUTED}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map(c=>(
                      <tr key={c.id}
                          className="hover:bg-white/5 transition-colors cursor-pointer"
                          style={{borderBottom:`1px solid ${BORDER}`}}
                          onClick={()=>setDetailClient(c)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {/* mini avatar / foto */}
                            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0"
                                 style={{backgroundColor:CARD2}}>
                              {c.foto_fachada ? (
                                <img src={c.foto_fachada} alt="" className="w-full h-full object-cover"/>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold"
                                     style={{color:LIGHT}}>
                                  {c.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate max-w-[140px]">{c.name}</p>
                              {c.cedula && <p className="text-xs truncate" style={{color:MUTED}}>CC: {c.cedula}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{color:LIGHT}}>{c.cellphone}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-xs text-white font-medium"
                                style={{backgroundColor:getPlanColor(c.plan)}}>{c.plan}</span>
                        </td>
                        <td className="px-4 py-3 text-green-400 font-semibold whitespace-nowrap text-xs">
                          {formatCurrency(c.plan_value)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap"><ClassBadge cls={c.classification} size="xs"/></td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{color:LIGHT}}>
                          {c.dia_pago ? `Día ${c.dia_pago}` : c.payment_date || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{color:MUTED}}>
                          {c.neighborhood || '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" onClick={e=>e.stopPropagation()}>
                          <div className="flex gap-2">
                            <button onClick={e=>{ e.stopPropagation(); openNewPayment(c.id) }}
                                    title="Registrar pago"
                                    className="p-1.5 rounded-lg transition-colors hover:bg-green-500/20 text-green-400">
                              <CreditCard className="w-4 h-4"/>
                            </button>
                            <button onClick={e=>{ e.stopPropagation(); openEditClient(c) }}
                                    title="Editar"
                                    className="p-1.5 rounded-lg transition-colors hover:bg-blue-500/20"
                                    style={{color:LIGHT}}>
                              <Pencil className="w-4 h-4"/>
                            </button>
                            <button onClick={e=>{ e.stopPropagation(); setDetailClient(c) }}
                                    title="Ver detalle"
                                    className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                                    style={{color:LIGHT}}>
                              <Eye className="w-4 h-4"/>
                            </button>
                            <button onClick={e=>{ e.stopPropagation(); handleDeleteClient(c.id) }}
                                    title="Eliminar"
                                    className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20 text-red-400">
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredClients.length && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-sm" style={{color:MUTED}}>
                          {clients.length ? 'Sin resultados para esa búsqueda.' : 'No hay clientes aún. ¡Agrega el primero!'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ PAGOS ══ */}
        {tab==='payments' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <MetricCard label="Total Pagos"     value={payStats.total??0}                          icon={<CreditCard className="w-5 h-5"/>}/>
              <MetricCard label="Total Recaudado" value={formatCurrency(payStats.total_amount??0)}   icon={<DollarSign className="w-5 h-5"/>}/>
              <MetricCard label="Cobrado"          value={formatCurrency(payStats.paid_amount??0)}    icon={<CheckCircle className="w-5 h-5"/>}/>
              <MetricCard label="Pendiente"        value={formatCurrency(payStats.pending_amount??0)} icon={<Clock className="w-5 h-5"/>}/>
            </div>
            <div className="rounded-xl overflow-hidden" style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
              <div className="flex items-center justify-between px-5 py-4"
                   style={{borderBottom:`1px solid ${BORDER}`}}>
                <h2 className="font-semibold text-white">
                  Pagos <span style={{color:MUTED}}>({payments.length})</span>
                </h2>
                <button onClick={()=>openNewPayment()}
                        className="flex items-center gap-2 hover:opacity-90 text-sm px-4 py-2 rounded-lg transition-opacity font-medium text-white"
                        style={{backgroundColor:'#16a34a'}}>
                  <Plus className="w-4 h-4"/> <span className="hidden sm:inline">Registrar Pago</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{borderBottom:`1px solid ${BORDER}`, backgroundColor:BG}}>
                      {['Cliente','Celular','Período','Monto','Método','Estado','Fecha','Acciones'].map(h=>(
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                            style={{color:MUTED}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p=>(
                      <tr key={p.id} className="hover:bg-white/5 transition-colors" style={{borderBottom:`1px solid ${BORDER}`}}>
                        <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{p.client_name}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{color:LIGHT}}>{p.cellphone}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{color:LIGHT}}>{p.period}</td>
                        <td className="px-4 py-3 text-green-400 font-semibold whitespace-nowrap">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-3 text-xs capitalize whitespace-nowrap" style={{color:LIGHT}}>{p.method}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                            ${p.status==='paid'?'bg-green-900/40 text-green-400':'bg-yellow-900/40 text-yellow-400'}`}>
                            {p.status==='paid'?'Pagado':'Pendiente'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{color:MUTED}}>
                          {p.created_at?.slice(0,10)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button onClick={()=>openEditPayment(p)}
                                    className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors">
                              <Pencil className="w-4 h-4"/>
                            </button>
                            <button onClick={()=>handleDeletePayment(p.id)}
                                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors">
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!payments.length && (
                      <tr><td colSpan={8} className="py-12 text-center text-sm" style={{color:MUTED}}>No hay pagos registrados aún</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ REPORTES ══ */}
        {tab==='reports' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-1">
              <BarChart2 className="w-5 h-5" style={{color:BLUE}}/>
              <h2 className="text-lg font-bold text-white">Reportes y Estadísticas</h2>
            </div>
            <div className="rounded-xl p-5" style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
              <h3 className="text-sm font-semibold mb-4" style={{color:LIGHT}}>Recaudo Mensual (últimos 12 meses)</h3>
              {reports?.byMonth?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={reports.byMonth} margin={{top:4,right:4,left:0,bottom:4}}>
                    <XAxis dataKey="month" tick={{fill:MUTED,fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis tickFormatter={v=>formatCurrency(v).replace('$','')}
                           tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false} width={70}/>
                    <Tooltip content={CustomTooltip}/>
                    <Bar dataKey="total" fill={BLUE} radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-36 flex items-center justify-center text-sm" style={{color:MUTED}}>Sin datos de pagos aún</div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl p-5" style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
                <h3 className="text-sm font-semibold mb-4" style={{color:LIGHT}}>Por Método de Pago</h3>
                {reports?.byMethod?.length ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={reports.byMethod} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={75}>
                        {reports.byMethod.map((_,i)=>(
                          <Cell key={i} fill={[BLUE,'#16a34a','#8b5cf6','#ec4899','#f59e0b'][i%5]}/>
                        ))}
                      </Pie>
                      <Legend formatter={v=><span style={{color:LIGHT,fontSize:12}}>{v}</span>}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-36 flex items-center justify-center text-sm" style={{color:MUTED}}>Sin datos aún</div>
                )}
              </div>
              <div className="rounded-xl p-5" style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
                <h3 className="text-sm font-semibold mb-4" style={{color:LIGHT}}>Clientes por Plan</h3>
                <div className="space-y-3">
                  {(reports?.byPlan ?? PLANS.map(p=>({plan:p.name,count:0,potential:0}))).map((row,i)=>{
                    const planObj = PLANS.find(p=>p.name===row.plan)
                    const total   = reports?.byPlan?.reduce((s,r)=>s+Number(r.count),0)||1
                    const pct     = Math.round((Number(row.count)/total)*100)
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{color:LIGHT}}>{row.plan}</span>
                          <span style={{color:LIGHT}}>{row.count} · {pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{backgroundColor:BG}}>
                          <div className="h-full rounded-full transition-all duration-500"
                               style={{width:`${pct}%`, backgroundColor:planObj?.color??'#64748b'}}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            {/* Sin pago este mes */}
            <div className="rounded-xl overflow-hidden" style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
              <div className="flex items-center gap-2 px-5 py-4" style={{borderBottom:`1px solid ${BORDER}`}}>
                <AlertCircle className="w-4 h-4 text-yellow-400"/>
                <h3 className="font-semibold text-sm text-white">
                  Sin pago este mes <span style={{color:MUTED}}>({reports?.pendingClients?.length??0})</span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{borderBottom:`1px solid ${BORDER}`, backgroundColor:BG}}>
                      {['Cliente','Celular','Plan','Valor','Día Pago','Acción'].map(h=>(
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                            style={{color:MUTED}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports?.pendingClients?.map(c=>(
                      <tr key={c.id} className="hover:bg-white/5 transition-colors" style={{borderBottom:`1px solid ${BORDER}`}}>
                        <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{c.name}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{color:LIGHT}}>{c.cellphone}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-xs text-white font-medium"
                                style={{backgroundColor:getPlanColor(c.plan)}}>{c.plan}</span>
                        </td>
                        <td className="px-4 py-3 text-yellow-400 font-semibold whitespace-nowrap">{formatCurrency(c.plan_value)}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{color:LIGHT}}>{c.payment_date}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button onClick={()=>openNewPayment(c.id)}
                                  className="flex items-center gap-1 hover:opacity-90 text-xs px-3 py-1.5 rounded-lg transition-opacity font-medium text-white"
                                  style={{backgroundColor:'#16a34a'}}>
                            <CreditCard className="w-3 h-3"/> Registrar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!reports?.pendingClients?.length && (
                      <tr><td colSpan={6} className="py-10 text-center text-green-400 font-medium text-sm">
                        ✅ Todos los clientes pagaron este mes
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
      )}

      {/* ══ PANEL DE DETALLE ══ */}
      {detailClient && (
        <ClientDetailPanel
          client={detailClient}
          onClose={()=>setDetailClient(null)}
          onEdit={()=>openEditClient(detailClient)}
          onDelete={()=>handleDeleteClient(detailClient.id)}
          onRegisterPayment={()=>openNewPayment(detailClient.id)}
        />
      )}

      {/* ══ MODAL CLIENTE ══ */}
      {showModal && (
        <ClientModal
          editClient={editClient}
          form={form}
          setForm={setForm}
          onSave={handleSaveClient}
          onClose={()=>{ setShowModal(false); setEditClient(null); setForm(EMPTY_CLIENT) }}
        />
      )}

      {/* ══ MODAL PAGO ══ */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{backgroundColor:'rgba(0,0,0,0.85)'}}>
          <div className="w-full max-w-lg rounded-2xl" style={{backgroundColor:CARD, border:`1px solid ${BORDER}`}}>
            <div className="flex items-center justify-between p-5" style={{borderBottom:`1px solid ${BORDER}`}}>
              <h3 className="font-bold text-white text-lg">{editPayment ? 'Editar Pago' : 'Registrar Pago'}</h3>
              <button onClick={()=>setShowPayModal(false)} style={{color:MUTED}} className="hover:text-white transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{color:MUTED}}>Cliente *</label>
                <select value={payForm.client_id}
                        onChange={e=>{ const c=clients.find(x=>x.id===Number(e.target.value)); setPayForm(p=>({...p,client_id:Number(e.target.value),amount:c?.plan_value??p.amount})) }}
                        style={iStyle} className={iCls}>
                  <option value={0}>Seleccionar cliente...</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.name} — {c.cellphone}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{color:MUTED}}>Período *</label>
                <input type="month" value={payForm.period} onChange={e=>setPayForm(p=>({...p,period:e.target.value}))} style={iStyle} className={iCls}/>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{color:MUTED}}>Monto *</label>
                <input type="number" value={payForm.amount} onChange={e=>setPayForm(p=>({...p,amount:Number(e.target.value)}))} style={iStyle} className={iCls}/>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{color:MUTED}}>Método de Pago</label>
                <select value={payForm.method} onChange={e=>setPayForm(p=>({...p,method:e.target.value}))} style={iStyle} className={iCls}>
                  {METHODS.map(m=><option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{color:MUTED}}>Estado</label>
                <select value={payForm.status} onChange={e=>setPayForm(p=>({...p,status:e.target.value}))} style={iStyle} className={iCls}>
                  <option value="paid">Pagado</option>
                  <option value="pending">Pendiente</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{color:MUTED}}>Notas</label>
                <textarea value={payForm.notes} onChange={e=>setPayForm(p=>({...p,notes:e.target.value}))} rows={2} style={iStyle} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none transition-colors"/>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5" style={{borderTop:`1px solid ${BORDER}`}}>
              <button onClick={()=>setShowPayModal(false)} style={{border:`1px solid ${BORDER}`,color:LIGHT}} className="px-4 py-2.5 text-sm rounded-lg hover:text-white transition-colors font-medium">Cancelar</button>
              <button onClick={handleSavePayment} style={{backgroundColor:'#16a34a'}} className="px-6 py-2.5 text-sm rounded-lg font-medium hover:opacity-90 transition-opacity text-white">
                {editPayment ? 'Actualizar' : 'Guardar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
