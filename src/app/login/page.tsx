'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, User, Shield, AlertTriangle, CheckCircle } from 'lucide-react'

const NAME_MAP: Record<string, string> = {
  'Medifibra2026': 'Mariana Lujan',
  'mariana':       'Mariana Lujan',
  'medardo':       'Medardo Mosquera',
  'haider':        'Haider Aguilar',
}

const MAX_ATTEMPTS    = 5
const LOCKOUT_MS      = 10 * 60 * 1000
const STORAGE_KEY     = 'mf_login_guard'

function readGuard(): { attempts: number; lockoutUntil: number } {
  if (typeof window === 'undefined') return { attempts: 0, lockoutUntil: 0 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { attempts: 0, lockoutUntil: 0 }
  } catch { return { attempts: 0, lockoutUntil: 0 } }
}
function writeGuard(d: { attempts: number; lockoutUntil: number }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
}

export default function LoginPage() {
  const router = useRouter()
  const [loading,      setLoading]      = useState(false)
  const [showPass,     setShowPass]     = useState(false)
  const [form,         setForm]         = useState({ username: '', password: '' })
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null)
  const [welcome,      setWelcome]      = useState<string | null>(null)
  const [attempts,     setAttempts]     = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState(0)
  const [countdown,    setCountdown]    = useState(0)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const g = readGuard()
    setAttempts(g.attempts)
    setLockoutUntil(g.lockoutUntil)
  }, [])

  useEffect(() => {
    if (lockoutUntil <= Date.now()) { setCountdown(0); return }
    const tick = () => {
      const rem = Math.max(0, lockoutUntil - Date.now())
      setCountdown(rem)
      if (rem === 0) { setAttempts(0); writeGuard({ attempts: 0, lockoutUntil: 0 }) }
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [lockoutUntil])

  const isLocked = countdown > 0

  const fmt = (ms: number) => {
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (isLocked || loading) return
    setErrorMsg(null)
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        const next = attempts + 1
        let until  = lockoutUntil
        if (next >= MAX_ATTEMPTS) {
          until = Date.now() + LOCKOUT_MS
          setLockoutUntil(until)
        }
        setAttempts(next)
        writeGuard({ attempts: next, lockoutUntil: until })
        setErrorMsg(
          next >= MAX_ATTEMPTS
            ? 'Acceso bloqueado 10 minutos por multiples intentos fallidos.'
            : `Credenciales incorrectas. Intento ${next} de ${MAX_ATTEMPTS}.`
        )
      } else {
        writeGuard({ attempts: 0, lockoutUntil: 0 })
        const uname  = (data.user?.username ?? '') as string
        const dname  = NAME_MAP[uname] ?? uname
        setWelcome(`Bienvenido, ${dname}`)
        if (barRef.current) {
          barRef.current.style.transition = 'width 1.8s linear'
          barRef.current.style.width      = '100%'
        }
        setTimeout(() => { router.push('/dashboard'); router.refresh() }, 2000)
      }
    } catch {
      setErrorMsg('Error de conexion. Verifica tu red e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0d1117' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;900&display=swap');

        @keyframes mfPulse {
          0%,100%{ opacity:1; text-shadow:0 0 18px rgba(220,38,38,0.95),0 0 40px rgba(220,38,38,0.35); }
          50%    { opacity:0.25; text-shadow:none; }
        }
        @keyframes fadeUp {
          from{ opacity:0; transform:translateY(20px); }
          to  { opacity:1; transform:translateY(0); }
        }
        @keyframes popIn {
          0%  { opacity:0; transform:scale(0.88) translateY(12px); }
          70% { transform:scale(1.03) translateY(-2px); }
          100%{ opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes shimmer {
          0%  { background-position: -400px 0; }
          100%{ background-position:  400px 0; }
        }

        .mf-pulse  { animation: mfPulse 1.5s ease-in-out infinite; }
        .fade-up   { animation: fadeUp  0.55s ease both; }
        .pop-in    { animation: popIn   0.45s cubic-bezier(.34,1.56,.64,1) both; }

        .mf-input {
          width:100%; padding:13px 16px; border-radius:12px;
          font-size:14px; color:#f1f5f9; outline:none;
          background:#0d1117; border:1px solid #1e2d40;
          transition:border-color .2s,box-shadow .2s;
        }
        .mf-input:focus {
          border-color:#2563eb;
          box-shadow:0 0 0 3px rgba(37,99,235,.18);
        }
        .mf-input::placeholder { color:#334155; }
        .mf-input:disabled     { opacity:.4; cursor:not-allowed; }

        input:-webkit-autofill {
          -webkit-box-shadow:0 0 0 100px #0d1117 inset !important;
          -webkit-text-fill-color:#f1f5f9 !important;
        }
      `}</style>

      {/* ===== LEFT — imagen de fondo (solo escritorio) ===== */}
      <div
        className="hidden lg:flex flex-1 relative flex-col justify-end"
        style={{
          backgroundImage:    "url('/fondoM.png')",
          backgroundSize:     'cover',
          backgroundPosition: 'center',
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg,rgba(8,12,22,.55) 0%,rgba(8,12,22,.3) 100%)' }}
        />
        <div className="relative z-10 px-12 pb-14">
          <p
            className="text-3xl font-bold text-white leading-snug"
            style={{ textShadow: '0 2px 20px rgba(0,0,0,.85)' }}
          >
            Gestion centralizada<br/>para Medifibra S.A.S.
          </p>
          <p
            className="text-sm mt-3 leading-relaxed"
            style={{ color: 'rgba(255,255,255,.6)', textShadow: '0 1px 8px rgba(0,0,0,.8)', maxWidth: '380px' }}
          >
            Control de clientes, facturacion y cobros en un solo lugar.
            Disenado exclusivamente para el equipo autorizado.
          </p>
          <div className="flex items-center gap-2 mt-5">
            <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,.5)' }}>
              Sistema activo — Medifibra S.A.S.
            </span>
          </div>
        </div>
      </div>

      {/* ===== RIGHT — formulario ===== */}
      <div
        className="w-full lg:w-[500px] flex flex-col justify-center relative overflow-hidden"
        style={{
          background:  '#111827',
          boxShadow:   '-24px 0 80px rgba(0,0,0,.7), 0 0 0 1px rgba(37,99,235,.07)',
          minHeight:   '100vh',
        }}
      >
        {/* Decoracion sutil de fondo */}
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(37,99,235,.06) 0%,transparent 70%)', transform: 'translate(30%,-30%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(124,58,237,.05) 0%,transparent 70%)', transform: 'translate(-30%,30%)' }}
        />

        {/* ── Welcome overlay ── */}
        {welcome && (
          <div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center pop-in"
            style={{ background: '#111827' }}
          >
            <div
              className="flex items-center justify-center w-24 h-24 rounded-full mb-6"
              style={{
                background:  'rgba(34,197,94,.08)',
                border:      '2px solid rgba(34,197,94,.25)',
                boxShadow:   '0 0 40px rgba(34,197,94,.12)',
              }}
            >
              <CheckCircle className="w-12 h-12" style={{ color: '#22c55e' }} />
            </div>
            <p className="text-2xl font-bold text-white text-center px-8">{welcome}</p>
            <p className="text-sm mt-2" style={{ color: '#475569' }}>Redirigiendo al panel de control...</p>
            <div className="mt-8 h-1 w-56 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
              <div
                ref={barRef}
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg,#1d4ed8,#2563eb,#60a5fa)',
                  width:      '0%',
                }}
              />
            </div>
          </div>
        )}

        {/* ── Contenido principal ── */}
        <div className="relative z-10 w-full max-w-sm mx-auto px-8 sm:px-0 fade-up">

          {/* Logo */}
          <div className="mb-10">
            <div
              className="flex items-baseline leading-none mb-2"
              style={{ fontFamily: "'Nunito',sans-serif" }}
            >
              <span className="font-black mf-pulse" style={{ fontSize: '3rem', color: '#dc2626' }}>M</span>
              <span className="font-black"           style={{ fontSize: '3rem', color: '#fff' }}>EDI</span>
              <span className="font-black mf-pulse" style={{ fontSize: '3rem', color: '#dc2626' }}>F</span>
              <span className="font-black"           style={{ fontSize: '3rem', color: '#fff' }}>IBRA</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[.18em]" style={{ color: '#374151' }}>
              Panel Administrativo · v8.2
            </p>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white">Ingreso al sistema</h2>
            <p className="text-sm mt-1" style={{ color: '#4b5563' }}>
              Acceso exclusivo para personal autorizado.
            </p>
          </div>

          {/* Barra de intentos */}
          {attempts > 0 && !isLocked && (
            <div className="mb-5">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs" style={{ color: '#6b7280' }}>Intentos fallidos</span>
                <span className="text-xs font-bold" style={{ color: attempts >= 4 ? '#ef4444' : '#f97316' }}>
                  {attempts} / {MAX_ATTEMPTS}
                </span>
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-1.5 rounded-full transition-all duration-300"
                    style={{ background: i < attempts ? (attempts >= 4 ? '#ef4444' : '#f97316') : '#1e293b' }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Banner bloqueado */}
          {isLocked && (
            <div
              className="flex items-start gap-3 p-4 rounded-xl mb-6"
              style={{ background: '#1c0505', border: '1px solid #7f1d1d', boxShadow: '0 0 0 1px rgba(239,68,68,.1)' }}
            >
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} />
              <div>
                <p className="text-sm font-bold" style={{ color: '#ef4444' }}>Acceso bloqueado temporalmente</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: '#fca5a5' }}>
                  Demasiados intentos fallidos. Intenta de nuevo en{" "}
                  <span className="font-mono font-bold text-white">{fmt(countdown)}</span>
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {errorMsg && !isLocked && (
            <div
              className="flex items-start gap-3 p-3.5 rounded-xl mb-5"
              style={{ background: '#1a0707', border: '1px solid #450a0a' }}
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#f87171' }} />
              <p className="text-xs leading-relaxed" style={{ color: '#fca5a5' }}>{errorMsg}</p>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[.15em] mb-2" style={{ color: '#4b5563' }}>
                Cedula
              </label>
              <div className="relative">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: '#334155' }}
                />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="Numero de cedula o usuario"
                  disabled={isLocked}
                  className="mf-input"
                  style={{ paddingLeft: '44px' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[.15em] mb-2" style={{ color: '#4b5563' }}>
                Contrasena
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: '#334155' }}
                />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Contrasena de acceso"
                  disabled={isLocked}
                  className="mf-input"
                  style={{ paddingLeft: '44px', paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: '#475569' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all duration-200 mt-2"
              style={{
                background:  isLocked
                  ? '#1e293b'
                  : loading
                  ? '#1e3a8a'
                  : 'linear-gradient(135deg,#1d4ed8 0%,#2563eb 60%,#3b82f6 100%)',
                boxShadow:   isLocked || loading
                  ? 'none'
                  : '0 4px 20px rgba(37,99,235,.4), 0 1px 0 rgba(255,255,255,.08) inset',
                cursor:      isLocked || loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.04em',
                opacity:     isLocked ? 0.6 : 1,
              }}
            >
              {loading
                ? 'Verificando credenciales...'
                : isLocked
                ? `Bloqueado  ${fmt(countdown)}`
                : 'Ingresar al Sistema'
              }
            </button>
          </form>

          {/* Aviso seguridad */}
          <div
            className="mt-8 flex items-start gap-2.5 p-3.5 rounded-xl"
            style={{ background: '#0d1117', border: '1px solid #1e293b' }}
          >
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#1e3a8a' }} />
            <p className="text-xs leading-relaxed" style={{ color: '#374151' }}>
              Acceso protegido. Los intentos fallidos quedan registrados
              y generan bloqueo automatico de 10 minutos.
            </p>
          </div>

          <p className="text-xs mt-6 text-center" style={{ color: '#1f2937' }}>
            &copy; 2026 Medifibra S.A.S · NIT 902060057-8
          </p>
        </div>
      </div>
    </div>
  )
}
