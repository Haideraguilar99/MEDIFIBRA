'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

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
        toast.error(data.error ?? 'Credenciales incorrectas')
      } else {
        toast.success(`Bienvenido, ${data.user.username}`)
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'#111827'}}>
      <Toaster position="top-right"/>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;900&display=swap');
        @keyframes blobMove {
          0%,100%{ transform: translate(0,0) scale(1); }
          33%{ transform: translate(30px,-20px) scale(1.05); }
          66%{ transform: translate(-20px,15px) scale(0.97); }
        }
        @keyframes mfPulse {
          0%,100%{ opacity:1; text-shadow:0 0 12px rgba(220,38,38,0.8); }
          50%{ opacity:0.4; text-shadow:none; }
        }
        .blob { animation: blobMove 8s ease-in-out infinite; }
        .mf-pulse { animation: mfPulse 1.4s ease-in-out infinite; }
        input:-webkit-autofill { -webkit-box-shadow:0 0 0 100px #1f2937 inset !important; -webkit-text-fill-color:#fff !important; }
      `}</style>

      <div className="w-full max-w-4xl rounded-3xl overflow-hidden flex shadow-2xl" style={{background:'#1f2937',minHeight:'560px'}}>

        {/* ── PANEL IZQUIERDO — Formulario ── */}
        <div className="flex-1 flex flex-col justify-center px-10 py-12 min-w-0">

          {/* Logo */}
          <div className="mb-10">
            <div className="flex items-baseline leading-none mb-1" style={{fontFamily:"'Nunito',sans-serif"}}>
              <span className="font-black mf-pulse" style={{fontSize:'2.6rem',color:'#dc2626',letterSpacing:'0.03em'}}>M</span>
              <span className="font-black" style={{fontSize:'2.6rem',color:'#ffffff',letterSpacing:'0.03em'}}>EDI</span>
              <span className="font-black mf-pulse" style={{fontSize:'2.6rem',color:'#dc2626',letterSpacing:'0.03em'}}>F</span>
              <span className="font-black" style={{fontSize:'2.6rem',color:'#ffffff',letterSpacing:'0.03em'}}>IBRA</span>
            </div>
            <p className="text-sm font-medium" style={{color:'#6b7280'}}>Sistema de Gestión · Panel Administrativo</p>
          </div>

          {/* Título */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Bienvenido</h2>
            <p className="text-sm mt-1" style={{color:'#9ca3af'}}>Ingresa tus credenciales para continuar</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{color:'#9ca3af'}}>Usuario</label>
              <input
                type="text"
                required
                autoComplete="username"
                value={form.username}
                onChange={e=>setForm(f=>({...f,username:e.target.value}))}
                placeholder="Medifibra2026"
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none border transition-all"
                style={{background:'#111827',borderColor:'#374151'}}
                onFocus={e=>{e.target.style.borderColor='#2563eb';e.target.style.boxShadow='0 0 0 3px rgba(37,99,235,0.15)'}}
                onBlur={e=>{e.target.style.borderColor='#374151';e.target.style.boxShadow='none'}}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{color:'#9ca3af'}}>Contraseña</label>
              <div className="relative">
                <input
                  type={showPass?'text':'password'}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm text-white outline-none border transition-all"
                  style={{background:'#111827',borderColor:'#374151'}}
                  onFocus={e=>{e.target.style.borderColor='#2563eb';e.target.style.boxShadow='0 0 0 3px rgba(37,99,235,0.15)'}}
                  onBlur={e=>{e.target.style.borderColor='#374151';e.target.style.boxShadow='none'}}
                />
                <button type="button" onClick={()=>setShowPass(s=>!s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{color:'#6b7280'}}>
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all mt-2"
              style={{
                background: loading ? '#1e3a8a' : 'linear-gradient(135deg,#1d4ed8,#2563eb)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(37,99,235,0.4)',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}>
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Credenciales */}
          <div className="mt-8 rounded-xl p-4" style={{background:'#111827',border:'1px solid #1f2d45'}}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{color:'#4b5563'}}>Credenciales de acceso</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{color:'#6b7280'}}>Usuario</p>
                <p className="text-sm font-semibold text-white">Medifibra2026</p>
              </div>
              <div style={{width:1,height:32,background:'#1f2937'}}/>
              <div>
                <p className="text-xs" style={{color:'#6b7280'}}>Contraseña</p>
                <p className="text-sm font-semibold text-white">Mariana2026*</p>
              </div>
            </div>
          </div>

          <p className="text-xs mt-6" style={{color:'#374151'}}>© 2026 Medifibra S.A.S · NIT 902060057-8</p>
        </div>

        {/* ── PANEL DERECHO — Decorativo ── */}
        <div className="hidden md:flex flex-col items-center justify-center relative overflow-hidden" style={{width:'420px',background:'#0f172a'}}>
          {/* Blobs */}
          <div className="blob absolute rounded-full" style={{width:320,height:320,top:'-60px',right:'-60px',background:'radial-gradient(circle,#1d4ed8 0%,#1e3a8a 50%,transparent 80%)',opacity:.7}}/>
          <div className="blob absolute rounded-full" style={{width:280,height:280,bottom:'-40px',left:'-40px',background:'radial-gradient(circle,#7c3aed 0%,#1e3a8a 50%,transparent 80%)',opacity:.5,animationDelay:'3s'}}/>
          <div className="blob absolute rounded-full" style={{width:200,height:200,top:'50%',left:'30%',background:'radial-gradient(circle,#2563eb 0%,transparent 70%)',opacity:.4,animationDelay:'1.5s'}}/>

          {/* Contenido central */}
          <div className="relative z-10 text-center px-10">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{background:'rgba(37,99,235,0.2)',border:'1px solid rgba(37,99,235,0.3)',backdropFilter:'blur(10px)'}}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M1.5 8.5C5.5 4.5 18.5 4.5 22.5 8.5" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/>
                <path d="M5 12C7.5 9.5 16.5 9.5 19 12" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
                <path d="M8.5 15.5C10 14 14 14 15.5 15.5" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="19" r="1.5" fill="#93c5fd"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Fibra Óptica</h3>
            <p className="text-sm leading-relaxed" style={{color:'#94a3b8'}}>Gestión inteligente de clientes, planes y pagos para Medifibra S.A.S</p>
            <div className="flex items-center justify-center gap-6 mt-8">
              {[['492','Clientes'],['441','Activos'],['6','Planes']].map(([n,l])=>(
                <div key={l} className="text-center">
                  <p className="text-xl font-bold text-white">{n}</p>
                  <p className="text-xs mt-0.5" style={{color:'#64748b'}}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
