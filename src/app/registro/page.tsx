'use client'
import { useState } from 'react'

export default function RegistroPage() {
  const [form, setForm] = useState({
    name: '', cedula: '', cellphone: '', telefono_alternativo: '',
    phone: '', email: '', address: '', punto_referencia: '',
    neighborhood: '', commune: '', city: 'Medellín',
  })
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const s = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.cedula.trim()) { setError('La cédula es obligatoria'); return }
    if (!form.cellphone.trim()) { setError('El celular es obligatorio'); return }
    if (!form.address.trim()) { setError('La dirección es obligatoria'); return }
    setError('')
    setSending(true)
    try {
      const res = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al enviar'); return }
      setDone(true)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }

  const iStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid #2d3748', background: '#1a202c',
    color: '#e2e8f0', fontSize: 15, outline: 'none',
  }
  const lStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, color: '#94a3b8',
    marginBottom: 4, fontWeight: 600,
  }

  if (done) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#1e293b', borderRadius: 16, padding: 40, maxWidth: 420, width: '100%', textAlign: 'center', border: '1px solid #10b981' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h2 style={{ color: '#10b981', fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Solicitud enviada</h2>
        <p style={{ color: '#94a3b8', fontSize: 15 }}>
          Hemos recibido tu información. Un asesor de Medifibra se pondrá en contacto contigo pronto para asignarte tu plan y fecha de pago.
        </p>
        <p style={{ color: '#475569', fontSize: 13, marginTop: 16 }}>
          Contacto: <strong style={{ color: '#60a5fa' }}>333 728 8745</strong>
        </p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', padding: '32px 16px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/medifibra_sin_fondo_1050.png" alt="Medifibra" style={{ height: 60, objectFit: 'contain', marginBottom: 8 }} />
          <h1 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 800, margin: 0 }}>Solicitud de Servicio</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>Completa tu información para que podamos contactarte</p>
        </div>

        <div style={{ background: '#1e293b', borderRadius: 16, padding: 28, border: '1px solid #334155' }}>
          {/* Datos personales */}
          <p style={{ color: '#60a5fa', fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 16, marginTop: 0 }}>DATOS PERSONALES</p>

          <div style={{ marginBottom: 16 }}>
            <label style={lStyle}>Nombre Completo *</label>
            <input style={iStyle} value={form.name} onChange={s('name')} placeholder="Como aparece en la cédula" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lStyle}>Cédula de Ciudadanía *</label>
            <input style={iStyle} value={form.cedula} onChange={e => setForm(p => ({ ...p, cedula: e.target.value.replace(/\D/g, '').slice(0, 12) }))} placeholder="Sin puntos ni guiones" inputMode="numeric" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={lStyle}>Celular Principal *</label>
              <input style={iStyle} value={form.cellphone} onChange={e => setForm(p => ({ ...p, cellphone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="3XX XXX XXXX" inputMode="numeric" />
            </div>
            <div>
              <label style={lStyle}>Teléfono Alternativo</label>
              <input style={iStyle} value={form.telefono_alternativo} onChange={e => setForm(p => ({ ...p, telefono_alternativo: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="Opcional" inputMode="numeric" />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lStyle}>Teléfono Fijo</label>
            <input style={iStyle} value={form.phone} onChange={s('phone')} placeholder="Opcional" />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={lStyle}>Correo Electrónico</label>
            <input style={iStyle} value={form.email} onChange={s('email')} placeholder="correo@ejemplo.com" type="email" />
          </div>

          {/* Dirección */}
          <p style={{ color: '#60a5fa', fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 16, marginTop: 0 }}>DIRECCIÓN DE INSTALACIÓN</p>

          <div style={{ marginBottom: 16 }}>
            <label style={lStyle}>Dirección *</label>
            <input style={iStyle} value={form.address} onChange={s('address')} placeholder="Calle, carrera, número..." />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lStyle}>Punto de Referencia</label>
            <input style={iStyle} value={form.punto_referencia} onChange={s('punto_referencia')} placeholder="Casa azul, frente al parque..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={lStyle}>Barrio</label>
              <input style={iStyle} value={form.neighborhood} onChange={s('neighborhood')} placeholder="Ej: Blanquizal" />
            </div>
            <div>
              <label style={lStyle}>Comuna</label>
              <input style={iStyle} value={form.commune} onChange={s('commune')} placeholder="Ej: 13" />
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={lStyle}>Ciudad</label>
            <input style={iStyle} value={form.city} onChange={s('city')} placeholder="Medellín" />
          </div>

          {error && (
            <div style={{ background: '#1f0a0a', border: '1px solid #991b1b', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 14 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={sending}
            style={{
              width: '100%', padding: '13px', borderRadius: 10, border: 'none',
              background: sending ? '#1e3a5f' : '#1d4ed8', color: '#fff',
              fontSize: 16, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer',
            }}
          >
            {sending ? 'Enviando...' : 'Enviar Solicitud'}
          </button>

          <p style={{ color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
            Al enviar aceptas que Medifibra S.A.S. contacte con fines comerciales.
          </p>
        </div>
      </div>
    </div>
  )
}
