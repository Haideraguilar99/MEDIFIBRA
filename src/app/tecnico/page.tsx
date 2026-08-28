'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TecnicoLogin() {
  const router = useRouter()
  const [cedula, setCedula] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!cedula.trim()) { setError('Ingresa tu cédula'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/tecnico/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: cedula.trim() })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al ingresar'); return }
      localStorage.setItem('tech_token', data.token)
      localStorage.setItem('tech_data', JSON.stringify(data.tech))
      router.push('/tecnico/dashboard')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1b3e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Portal Técnico</h1>
          <p className="text-blue-300 text-sm mt-1">Medifibra S.A.S</p>
        </div>

        <div className="bg-[#1a2d5a] rounded-2xl p-6 shadow-xl border border-blue-800">
          <label className="block text-blue-300 text-sm font-medium mb-2">Cédula</label>
          <input
            type="number"
            value={cedula}
            onChange={e => setCedula(e.target.value.replace(/\D/g, '').slice(0, 12))}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Número de cédula"
            className="w-full bg-[#0d1b3e] text-white border border-blue-700 rounded-xl px-4 py-3 text-lg tracking-widest focus:outline-none focus:border-blue-400 mb-4 placeholder:text-blue-900"
          />
          {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </div>

        <p className="text-center text-blue-800 text-xs mt-6">
          Solo para técnicos autorizados · Medifibra © 2026
        </p>
      </div>
    </div>
  )
}
