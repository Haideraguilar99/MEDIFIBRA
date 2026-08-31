'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TecnicoLogin() {
  const router = useRouter()
  const [cedula, setCedula] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('tech_token'))
      router.replace('/tecnico/dashboard')
  }, [router])

  async function handleLogin() {
    const val = cedula.trim()
    if (!val) { setError('Ingresa tu número de cédula'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/tecnico/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: val })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Acceso no autorizado'); return }
      localStorage.setItem('tech_token', data.token)
      localStorage.setItem('tech_data', JSON.stringify(data.tech))
      router.push('/tecnico/dashboard')
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#e2e8f0', letterSpacing: '-0.5px', marginBottom: '0.375rem' }}>
            <span style={{ color: '#ef4444' }}>M</span>EDI<span style={{ color: '#ef4444' }}>F</span>IBRA
          </div>
          <div style={{ color: '#374151', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Portal de Técnicos
          </div>
        </div>

        <div style={{ background: '#0f1117', border: '1px solid #1c1f27', borderRadius: '12px', padding: '1.5rem' }}>
          <label style={{ display: 'block', color: '#374151', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
            Número de cédula
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={cedula}
            onChange={e => setCedula(e.target.value.replace(/\D/g, '').slice(0, 12))}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="_ _ _ _ _ _ _ _ _ _"
            style={{
              width: '100%', background: '#0a0a0f', color: '#f1f5f9',
              border: `1px solid ${error ? '#450a0a' : '#1c1f27'}`,
              borderRadius: '8px', padding: '0.875rem 1rem',
              fontSize: '1.25rem', letterSpacing: '0.25em',
              outline: 'none', boxSizing: 'border-box', marginBottom: '1rem',
              fontVariantNumeric: 'tabular-nums'
            }}
          />

          {error && (
            <div style={{ background: '#1c0a0a', border: '1px solid #450a0a', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#f87171', fontSize: '0.8rem', marginBottom: '0.875rem', lineHeight: 1.4 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !cedula}
            style={{
              width: '100%',
              background: loading || !cedula ? '#0f1117' : '#0f2040',
              color: loading || !cedula ? '#374151' : '#93c5fd',
              border: `1px solid ${loading || !cedula ? '#1c1f27' : '#1d4ed8'}`,
              borderRadius: '8px', padding: '0.875rem',
              fontSize: '0.9rem', fontWeight: 700,
              cursor: loading || !cedula ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s'
            }}
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#1c1f27', fontSize: '0.68rem', marginTop: '1.5rem' }}>
          Medifibra S.A.S · Solo personal autorizado
        </p>
      </div>
    </div>
  )
}
