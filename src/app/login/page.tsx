'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import { Wifi, Lock, User, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ username: '', password: '' })

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Error al iniciar sesión')
      } else {
        toast.success(`Bienvenido, ${data.user.username}!`)
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0f1623 0%, #1a1f2e 100%)' }}>
      <Toaster position="top-right" />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 rounded-2xl mb-4" style={{ background: '#1e3a5f' }}>
            <Wifi size={40} color="#3b82f6" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wide">MEDIFIBRA</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>Conéctate con velocidad real</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 border"
          style={{ background: '#1e2a3d', borderColor: '#1e3a5f' }}>
          <h2 className="text-base font-semibold text-white mb-6">Panel de Administración</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Usuario */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                Usuario
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#475569' }} />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="admin"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-white outline-none border transition-colors"
                  style={{ background: '#111827', borderColor: '#1e3a5f' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#1e3a5f'}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                Contraseña
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#475569' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg text-sm text-white outline-none border transition-colors"
                  style={{ background: '#111827', borderColor: '#1e3a5f' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#1e3a5f'}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#475569' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-white text-sm transition-all mt-2 cursor-pointer"
              style={{ background: loading ? '#1e3a5f' : '#1d4ed8' }}>
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#1e3a5f' }}>
          © 2026 Medifibra S.A.S
        </p>
      </div>
    </div>
  )
}
