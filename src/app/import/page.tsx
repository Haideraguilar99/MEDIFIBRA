'use client'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { Upload, CheckCircle, AlertCircle, Download, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PLANS, formatCurrency } from '@/lib/plans'

type RawRow = Record<string, string | number>
type MappedClient = {
  name: string; cellphone: string; plan: string; plan_value: number
  email: string; phone: string; address: string; city: string
  neighborhood: string; commune: string; consumption_date: string
  payment_date: string; reference: string; status: string; notes: string
}
type ImportResult = { inserted: number; skipped: number; errors: string[] }

const PLAN_ALIASES: Record<string, string> = {
  '50': 'FIBRA 50 MBPS', '100': 'FIBRA 100 MBPS', '150': 'FIBRA 150 MBPS',
  '200': 'FIBRA 200 MBPS', '300': 'FIBRA 300 MBPS', '500': 'FIBRA 500 MBPS',
  'fibra50': 'FIBRA 50 MBPS', 'fibra100': 'FIBRA 100 MBPS', 'fibra150': 'FIBRA 150 MBPS',
  'fibra200': 'FIBRA 200 MBPS', 'fibra300': 'FIBRA 300 MBPS', 'fibra500': 'FIBRA 500 MBPS',
}

function normalizePlan(raw: string): { plan: string; plan_value: number } {
  const key = String(raw).toLowerCase().replace(/\s+/g, '')
  const name = PLAN_ALIASES[key] ?? PLANS.find(p => p.name.toLowerCase().includes(key))?.name ?? String(raw)
  const value = PLANS.find(p => p.name === name)?.value ?? 0
  return { plan: name, plan_value: value }
}

function mapRow(row: RawRow): MappedClient {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const found = Object.keys(row).find(rk => rk.toLowerCase().replace(/\s+/g,'').includes(k))
      if (found && row[found] !== undefined && row[found] !== '') return String(row[found])
    }
    return ''
  }
  const planRaw = get('plan')
  const { plan, plan_value } = normalizePlan(planRaw)
  return {
    name: get('nombre','name'),
    cellphone: get('celular','cellphone','cel','movil','móvil'),
    email: get('email','correo'),
    phone: get('telefono','teléfono','phone','fijo'),
    address: get('direccion','dirección','address'),
    city: get('ciudad','city'),
    neighborhood: get('barrio','neighborhood'),
    commune: get('comuna','commune'),
    consumption_date: get('consumo','consumption'),
    payment_date: get('pago','payment'),
    plan, plan_value,
    reference: get('referencia','reference','llave','bre'),
    status: get('estado','status') || 'active',
    notes: get('notas','notes','novedad'),
  }
}

export default function ImportPage() {
  const [preview, setPreview] = useState<MappedClient[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')

  const processFile = useCallback((file: File) => {
    setResult(null); setError(''); setFileName(file.name)
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (res) => setPreview((res.data as RawRow[]).map(mapRow))
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json<RawRow>(ws)
        setPreview(data.map(mapRow))
      }
      reader.readAsBinaryString(file)
    } else {
      setError('Formato no soportado. Usa .xlsx, .xls o .csv')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && processFile(files[0]),
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'], 'text/csv': ['.csv'] },
    multiple: false
  })

  const handleImport = async () => {
    if (!preview.length) return
    setImporting(true)
    try {
      const res = await fetch('/api/clients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: preview })
      })
      const data = await res.json()
      setResult(data)
      if (data.inserted > 0) setPreview([])
    } catch { setError('Error al importar') }
    finally { setImporting(false) }
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      nombre: 'Juan Pérez', celular: '3001234567', email: 'juan@email.com',
      telefono: '2341234', direccion: 'Cll 10 # 20-30', ciudad: 'Medellín',
      barrio: 'Laureles', comuna: '11', consumo: '2026-01-15', pago: '2026-01-30',
      plan: '100', referencia: '043791', estado: 'active', notas: ''
    }])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.writeFile(wb, 'plantilla_medifibra.xlsx')
  }

  const inputStyle = { backgroundColor:'#111827', border:'1px solid #1e3a5f', color:'white' }

  return (
    <div className="min-h-screen text-white p-6" style={{ backgroundColor:'#1a1f2e' }}>
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5"/>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Importar Clientes</h1>
              <p className="text-xs" style={{ color:'#64748b' }}>Carga masiva desde Excel o CSV</p>
            </div>
          </div>
          <button onClick={downloadTemplate} style={{ border:'1px solid #1e3a5f', color:'#94a3b8' }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm hover:text-white transition-colors">
            <Download className="w-4 h-4"/> Descargar Plantilla
          </button>
        </div>

        {/* Dropzone */}
        <div {...getRootProps()} style={{ border:`2px dashed ${isDragActive?'#3b82f6':'#1e3a5f'}`, backgroundColor:'#1e2a3d', cursor:'pointer' }}
          className="rounded-xl p-10 text-center transition-colors hover:border-blue-500/50">
          <input {...getInputProps()}/>
          <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: isDragActive?'#3b82f6':'#64748b' }}/>
          <p className="font-medium">{isDragActive ? 'Suelta el archivo aquí' : 'Arrastra tu archivo o haz clic para seleccionar'}</p>
          <p className="text-sm mt-1" style={{ color:'#64748b' }}>Soporta .xlsx, .xls y .csv</p>
          {fileName && <p className="text-sm mt-2 text-blue-400">📄 {fileName}</p>}
        </div>

        {error && (
          <div style={{ backgroundColor:'#450a0a', border:'1px solid #7f1d1d' }} className="rounded-lg p-4 flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0"/> {error}
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div style={{ backgroundColor:'#052e16', border:'1px solid #166534' }} className="rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-green-400 font-semibold">
              <CheckCircle className="w-5 h-5"/> Importación completada
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div style={{ backgroundColor:'#1e2a3d' }} className="rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{result.inserted}</p>
                <p style={{ color:'#64748b' }}>Importados</p>
              </div>
              <div style={{ backgroundColor:'#1e2a3d' }} className="rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{result.skipped}</p>
                <p style={{ color:'#64748b' }}>Omitidos</p>
              </div>
              <div style={{ backgroundColor:'#1e2a3d' }} className="rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{result.errors.length}</p>
                <p style={{ color:'#64748b' }}>Errores</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="text-xs space-y-1 pt-2">
                {result.errors.map((e,i) => <p key={i} className="text-red-400">• {e}</p>)}
              </div>
            )}
            <Link href="/dashboard" style={{ backgroundColor:'#1d4ed8' }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors mt-2">
              Ver clientes en dashboard →
            </Link>
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && !result && (
          <div style={{ backgroundColor:'#1e2a3d', border:'1px solid #1e3a5f' }} className="rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid #1e3a5f' }}>
              <div>
                <h2 className="font-semibold">Vista previa <span style={{ color:'#64748b' }}>({preview.length} registros)</span></h2>
                <p className="text-xs mt-0.5" style={{ color:'#64748b' }}>Verifica que los datos estén correctos antes de importar</p>
              </div>
              <button onClick={handleImport} disabled={importing} style={{ backgroundColor:'#16a34a' }}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                {importing ? 'Importando...' : `✅ Importar ${preview.length} clientes`}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom:'1px solid #1e3a5f', backgroundColor:'#111827' }}>
                    {['Nombre','Celular','Plan','Valor','Ciudad','Barrio','Referencia','Estado'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color:'#64748b' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((c, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #1e3a5f' }} className="hover:bg-blue-900/10">
                      <td className="px-4 py-3 font-medium">{c.name || <span className="text-red-400">⚠ vacío</span>}</td>
                      <td className="px-4 py-3" style={{ color:'#94a3b8' }}>{c.cellphone || <span className="text-red-400">⚠ vacío</span>}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs text-white font-medium"
                          style={{ backgroundColor: PLANS.find(p=>p.name===c.plan)?.color ?? '#64748b' }}>
                          {c.plan || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-green-400 font-semibold">{c.plan_value ? formatCurrency(c.plan_value) : '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color:'#94a3b8' }}>{c.city || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color:'#94a3b8' }}>{c.neighborhood || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color:'#64748b' }}>{c.reference || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.status==='active'?'bg-green-900/40 text-green-400':'bg-red-900/40 text-red-400'}`}>
                          {c.status==='active'?'Activo':'Suspendido'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
