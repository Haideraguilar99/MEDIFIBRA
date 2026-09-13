'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock } from 'lucide-react'

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
      setErrorMsg('Error de conexion. Verifica tu red.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#0c0e14', fontFamily:'Inter,system-ui,sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes mfPulse {
          0%,100%{ opacity:1; text-shadow:0 0 20px rgba(220,38,38,1),0 0 50px rgba(220,38,38,0.4); }
          50%    { opacity:0.12; text-shadow:none; }
        }
        @keyframes popIn {
          0%  { opacity:0; transform:scale(0.92); }
          70% { transform:scale(1.02); }
          100%{ opacity:1; transform:scale(1); }
        }
        @keyframes fadeIn {
          from{ opacity:0; transform:translateY(14px); }
          to  { opacity:1; transform:translateY(0); }
        }
        .mf-pulse{ animation: mfPulse 1.5s ease-in-out infinite; }
        .pop-in  { animation: popIn   0.38s cubic-bezier(.34,1.56,.64,1) both; }
        .fade-in { animation: fadeIn  0.45s ease both; }

        .mf-field {
          width: 100%;
          padding: 13px 15px;
          background: #12161f;
          border: 1px solid #1e2535;
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 15px;
          font-family: inherit;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
          box-sizing: border-box;
        }
        .mf-field:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,.15);
        }
        .mf-field::placeholder { color: #2d3a4f; }
        .mf-field:disabled     { opacity: .4; cursor: not-allowed; }
        .mf-field-pass         { padding-right: 48px; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #12161f inset !important;
          -webkit-text-fill-color: #e2e8f0 !important;
        }
      `}</style>

      {/* ===== IZQUIERDA — fondoM.png ===== */}
      <div
        className="hidden lg:block lg:flex-1 relative"
        style={{
          backgroundImage: "url('/fondoM.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* ===== DERECHA — formulario ===== */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: '#0c0e14',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 52px',
        boxSizing: 'border-box',
        position: 'relative',
        minHeight: '100vh',
        boxShadow: '-20px 0 80px rgba(0,0,0,.9)',
      }}>

        {/* Welcome overlay */}
        {welcome && (
          <div className="pop-in" style={{
            position: 'absolute', inset: 0, zIndex: 50,
            background: '#0c0e14',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '32px',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(34,197,94,.07)',
              border: '2px solid rgba(34,197,94,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
              boxShadow: '0 0 40px rgba(34,197,94,.12)',
            }}>
              <svg viewBox="0 0 24 24" style={{width:32,height:32,stroke:'#22c55e',fill:'none',strokeWidth:2.5,strokeLinecap:'round',strokeLinejoin:'round'}}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#fff', textAlign: 'center', margin: 0 }}>{welcome}</p>
            <p style={{ fontSize: 13, color: '#475569', marginTop: 8 }}>Redirigiendo al panel de control...</p>
            <div style={{ marginTop: 28, height: 3, width: 180, borderRadius: 99, background: '#1e293b', overflow: 'hidden' }}>
              <div ref={barRef} style={{ height: '100%', width: '0%', borderRadius: 99, background: 'linear-gradient(90deg,#6366f1,#818cf8)' }} />
            </div>
          </div>
        )}

        {/* Contenido del form */}
        <div className="fade-in">

          {/* Logo */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display:'flex', alignItems:'baseline', lineHeight:1, marginBottom: 6 }}>
              <span className="mf-pulse" style={{ fontSize:'2.4rem', fontWeight:900, color:'#dc2626', fontFamily:'Inter,sans-serif', letterSpacing:'-0.01em' }}>M</span>
              <span style={{ fontSize:'2.4rem', fontWeight:900, color:'#fff', fontFamily:'Inter,sans-serif', letterSpacing:'-0.01em' }}>EDI</span>
              <span className="mf-pulse" style={{ fontSize:'2.4rem', fontWeight:900, color:'#dc2626', fontFamily:'Inter,sans-serif', letterSpacing:'-0.01em' }}>F</span>
              <span style={{ fontSize:'2.4rem', fontWeight:900, color:'#fff', fontFamily:'Inter,sans-serif', letterSpacing:'-0.01em' }}>IBRA</span>
            </div>
            <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 10px 0', fontWeight: 400 }}>
              Panel Administrativo · v8.2
            </p>
            <div style={{ width: 40, height: 3, borderRadius: 99, background: '#dc2626' }} />
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 6px 0' }}>
              Ingreso al sistema
            </h2>
            <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>
              Acceso exclusivo para personal autorizado.
            </p>
          </div>

          {/* Barra intentos */}
          {attempts > 0 && !isLocked && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 6 }}>
                <span style={{ fontSize:11, color:'#6b7280' }}>Intentos fallidos</span>
                <span style={{ fontSize:11, fontWeight:700, color: attempts >= 4 ? '#ef4444' : '#f97316' }}>
                  {attempts} / {MAX_ATTEMPTS}
                </span>
              </div>
              <div style={{ display:'flex', gap: 5 }}>
                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                  <div key={i} style={{
                    flex:1, height: 4, borderRadius: 99,
                    background: i < attempts ? (attempts >= 4 ? '#ef4444' : '#f97316') : '#1e293b',
                    transition: 'background .3s',
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Bloqueado */}
          {isLocked && (
            <div style={{
              display:'flex', gap:10, padding:'12px 14px', borderRadius:8, marginBottom:18,
              background:'#1c0505', border:'1px solid #7f1d1d',
            }}>
              <Lock size={14} style={{ color:'#ef4444', flexShrink:0, marginTop:2 }} />
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'#ef4444', margin:'0 0 3px 0' }}>Acceso bloqueado</p>
                <p style={{ fontSize:12, color:'#fca5a5', margin:0 }}>
                  Intenta de nuevo en <span style={{ fontFamily:'monospace', fontWeight:700, color:'#fff' }}>{fmt(countdown)}</span>
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {errorMsg && !isLocked && (
            <div style={{
              fontSize:12, color:'#fca5a5', padding:'10px 14px', borderRadius:8,
              background:'#1a0707', border:'1px solid #450a0a', marginBottom:18,
            }}>
              {errorMsg}
            </div>
          )}

          {/* Campos */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:8 }}>
                Cedula
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="Numero de cedula o usuario"
                disabled={isLocked}
                className="mf-field"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:8 }}>
                Contrasena
              </label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Contrasena de acceso"
                  disabled={isLocked}
                  className="mf-field mf-field-pass"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#4b5563', padding:0, display:'flex' }}
                >
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isLocked}
              style={{
                width:'100%', padding:'14px', borderRadius:8,
                fontWeight:700, fontSize:15, color:'#fff',
                border:'none', cursor: isLocked || loading ? 'not-allowed' : 'pointer',
                background: isLocked ? '#1e293b' : loading ? '#312e81' : 'linear-gradient(135deg,#4338ca,#6366f1)',
                boxShadow: isLocked || loading ? 'none' : '0 4px 20px rgba(99,102,241,.4)',
                opacity: isLocked ? 0.5 : 1,
                transition: 'all .2s',
                fontFamily: 'inherit',
                letterSpacing: '0.03em',
              }}
            >
              {loading ? 'Verificando...' : isLocked ? `Bloqueado ${fmt(countdown)}` : 'Ingresar al Sistema'}
            </button>
          </form>

          <p style={{ fontSize:13, color:'#374151', marginTop:28, textAlign:'center' }}>
            Solo personal autorizado — Medifibra S.A.S
          </p>
        </div>
      </div>


    </div>
  )
}
