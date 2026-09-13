'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, User, Shield, AlertTriangle, CheckCircle } from 'lucide-react'

const NAME_MAP: Record<string, string> = {
  'MEDIFIBRA':     'Administrador',
  'Medifibra2026': 'Mariana Lujan',
  'mariana':       'Mariana Lujan',
  'medardo':       'Medardo Mosquera',
  'haider':        'Haider Aguilar',
}

const MAX_ATTEMPTS = 5
const LOCKOUT_MS   = 10 * 60 * 1000
const STORAGE_KEY  = 'mf_login_guard'

function readGuard() {
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
        const next  = attempts + 1
        let until   = lockoutUntil
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
        const uname = (data.user?.username ?? '') as string
        const dname = NAME_MAP[uname] ?? uname
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
    <div className="min-h-screen flex" style={{ background: '#0b0f1a' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;900&display=swap');
        @keyframes mfPulse {
          0%,100%{ opacity:1; text-shadow:0 0 18px rgba(220,38,38,1),0 0 40px rgba(220,38,38,0.5); }
          50%    { opacity:0.15; text-shadow:none; }
        }
        @keyframes fadeUp {
          from{ opacity:0; transform:translateY(18px); }
          to  { opacity:1; transform:translateY(0); }
        }
        @keyframes popIn {
          0%  { opacity:0; transform:scale(0.9) translateY(10px); }
          70% { transform:scale(1.02); }
          100%{ opacity:1; transform:scale(1) translateY(0); }
        }
        .mf-pulse { animation: mfPulse 1.5s ease-in-out infinite; }
        .fade-up  { animation: fadeUp  0.5s ease both; }
        .pop-in   { animation: popIn   0.4s cubic-bezier(.34,1.56,.64,1) both; }
        .mf-input {
          width:100%; padding:14px 16px 14px 44px;
          border-radius:10px; font-size:14px; color:#f1f5f9;
          outline:none; background:#0b0f1a;
          border:1px solid #1e2d40;
          transition:border-color .2s, box-shadow .2s;
        }
        .mf-input:focus {
          border-color:#4f46e5;
          box-shadow:0 0 0 3px rgba(79,70,229,.2);
        }
        .mf-input::placeholder { color:#2d3d50; }
        .mf-input:disabled     { opacity:.4; cursor:not-allowed; }
        input:-webkit-autofill {
          -webkit-box-shadow:0 0 0 100px #0b0f1a inset !important;
          -webkit-text-fill-color:#f1f5f9 !important;
        }
      `}</style>

      {/* ===== IZQUIERDA — imagen fondoM.png (solo desktop) ===== */}
      <div
        className="hidden lg:block flex-1 relative"
        style={{
          backgroundImage:    "url('/fondoM.png')",
          backgroundSize:     'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* overlay suave para no tapar la imagen */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(11,15,26,0.15) 0%, rgba(11,15,26,0.45) 100%)' }}
        />
      </div>

      {/* ===== DERECHA — formulario ===== */}
      <div
        className="w-full lg:w-[460px] flex flex-col justify-center relative"
        style={{
          background: '#0f1117',
          boxShadow:  '-20px 0 60px rgba(0,0,0,0.8)',
          minHeight:  '100vh',
        }}
      >
        {/* Welcome overlay */}
        {welcome && (
          <div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center pop-in"
            style={{ background: '#0f1117' }}
          >
            <div
              className="flex items-center justify-center w-20 h-20 rounded-full mb-5"
              style={{
                background: 'rgba(34,197,94,.08)',
                border:     '2px solid rgba(34,197,94,.3)',
                boxShadow:  '0 0 40px rgba(34,197,94,.15)',
              }}
            >
              <CheckCircle className="w-10 h-10" style={{ color: '#22c55e' }} />
            </div>
            <p className="text-2xl font-bold text-white text-center px-8">{welcome}</p>
            <p className="text-sm mt-2" style={{ color: '#475569' }}>
              Redirigiendo al panel de control...
            </p>
            <div className="mt-8 h-1 w-48 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
              <div
                ref={barRef}
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg,#4f46e5,#6366f1,#818cf8)',
                  width:      '0%',
                }}
              />
            </div>
          </div>
        )}

        {/* Contenido */}
        <div className="relative z-10 w-full px-10 sm:px-14 fade-up">

          {/* Logo */}
          <div className="mb-8">
            <div
              className="flex items-baseline leading-none mb-1"
              style={{ fontFamily: "'Nunito',sans-serif" }}
            >
              <span className="font-black mf-pulse" style={{ fontSize: '2.8rem', color: '#dc2626' }}>M</span>
              <span className="font-black"           style={{ fontSize: '2.8rem', color: '#fff' }}>EDI</span>
              <span className="font-black mf-pulse" style={{ fontSize: '2.8rem', color: '#dc2626' }}>F</span>
              <span className="font-black"           style={{ fontSize: '2.8rem', color: '#fff' }}>IBRA</span>
            </div>
            <p className="text-xs font-semibold" style={{ color: '#374151', letterSpacing: '0.16em' }}>
              Panel Administrativo · v8.2
            </p>
            <div className="mt-3 w-10 h-0.5 rounded-full" style={{ background: '#4f46e5' }} />
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-xl font-bold text-white">Ingreso al sistema</h2>
            <p className="text-sm mt-1" style={{ color: '#4b5563' }}>
              Acceso exclusivo para personal autorizado.
            </p>
          </div>

          {/* Barra intentos */}
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

          {/* Bloqueado */}
          {isLocked && (
            <div
              className="flex items-start gap-3 p-4 rounded-xl mb-6"
              style={{ background: '#1c0505', border: '1px solid #7f1d1d' }}
            >
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} />
              <div>
                <p className="text-sm font-bold" style={{ color: '#ef4444' }}>Acceso bloqueado</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: '#fca5a5' }}>
                  Intenta de nuevo en{" "}
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

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase mb-2" style={{ color: '#4b5563', letterSpacing: '0.14em' }}>
                Cedula
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#2d3d50' }} />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="Numero de cedula o usuario"
                  disabled={isLocked}
                  className="mf-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase mb-2" style={{ color: '#4b5563', letterSpacing: '0.14em' }}>
                Contrasena
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#2d3d50' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Contrasena de acceso"
                  disabled={isLocked}
                  className="mf-input"
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: '#475569' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full py-4 rounded-xl font-bold text-white text-sm transition-all duration-200 mt-2"
              style={{
                background: isLocked
                  ? '#1e293b'
                  : loading
                  ? '#312e81'
                  : 'linear-gradient(135deg,#4338ca 0%,#4f46e5 50%,#6366f1 100%)',
                boxShadow: isLocked || loading
                  ? 'none'
                  : '0 4px 24px rgba(79,70,229,.45)',
                cursor:       isLocked || loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.05em',
                opacity:      isLocked ? 0.5 : 1,
              }}
            >
              {loading
                ? 'Verificando...'
                : isLocked
                ? `Bloqueado ${fmt(countdown)}`
                : 'Ingresar al Sistema'
              }
            </button>
          </form>

          {/* Aviso */}
          <div
            className="mt-6 flex items-start gap-2.5 p-3.5 rounded-xl"
            style={{ background: '#0b0f1a', border: '1px solid #1a2235' }}
          >
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#312e81' }} />
            <p className="text-xs leading-relaxed" style={{ color: '#374151' }}>
              Solo personal autorizado — Medifibra S.A.S
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
