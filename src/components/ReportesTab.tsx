'use client'
import { useState } from 'react'
import { FileSpreadsheet, Download, AlertCircle, CheckCircle, Lock } from 'lucide-react'

interface Props {
  BG: string; CARD: string; CARD2: string
  BORDER: string; TEXT: string; MUTED: string
}

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

const START_YEAR  = 2026
const START_MONTH = 10

export default function ReportesTab({ CARD, CARD2, BORDER, MUTED }: Props) {
  const now   = new Date()
  const thisY = now.getFullYear()
  const thisM = now.getMonth() + 1
  const today = now.getDate()

  const prevY = thisM === 1 ? thisY - 1 : thisY
  const prevM = thisM === 1 ? 12 : thisM - 1
  const defaultP = String(prevY) + '-' + String(prevM).padStart(2,'0')

  const [selected,    setSelected]    = useState<string>(defaultP)
  const [downloading, setDownloading] = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  type Month = { value:string; label:string; short:string; available:boolean; year:number }
  const allMonths: Month[] = []
  let y = START_YEAR
  let m = START_MONTH
  while (y < thisY || (y === thisY && m <= thisM)) {
    const v     = String(y) + '-' + String(m).padStart(2,'0')
    const isCur = y === thisY && m === thisM
    allMonths.push({
      value    : v,
      label    : MONTH_NAMES[m - 1] + ' ' + String(y),
      short    : MONTH_NAMES[m - 1].slice(0, 3).toUpperCase(),
      available: !isCur || today >= 4,
      year     : y,
    })
    m++
    if (m > 12) { m = 1; y++ }
  }

  const byYear = allMonths.reduce<Record<number, Month[]>>((acc, mo) => {
    if (!acc[mo.year]) acc[mo.year] = []
    acc[mo.year].push(mo)
    return acc
  }, {})
  const years = Object.keys(byYear).map(Number).sort()

  const info  = allMonths.find(mo => mo.value === selected)
  const canDl = info?.available ?? false
  const BLUE  = '#3b82f6'
  const GRN   = '#22c55e'
  const YLW   = '#f59e0b'

  const handleDownload = async () => {
    if (!canDl || downloading) return
    setDownloading(true)
    setError(null)
    try {
      const res  = await fetch('/api/reportes/mensual?period=' + selected)
      if (!res.ok) throw new Error('Error ' + res.status)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = 'Reporte_Medifibra_' + (info ? info.label : selected) + '.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setError('No se pudo generar: ' + (e instanceof Error ? e.message : 'Error'))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-5 p-4">

      <div className="flex items-center gap-3">
        <FileSpreadsheet className="w-5 h-5" style={{ color: BLUE }} />
        <h2 className="text-lg font-bold text-white">Reportes y Estadisticas</h2>
      </div>

      <div style={{ backgroundColor: CARD, border: '1px solid ' + BORDER }}
        className="rounded-xl p-5">

        <h3 className="text-sm font-semibold mb-5 text-white">Selecciona el mes a reportar</h3>

        <div className="space-y-5 mb-5">
          {years.map(yr => (
            <div key={yr}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1" style={{ backgroundColor: BORDER }} />
                <span className="text-xs font-bold tracking-widest px-2.5 py-0.5 rounded-full"
                  style={{ color: BLUE, backgroundColor: 'rgba(59,130,246,0.12)' }}>
                  {yr}
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: BORDER }} />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {byYear[yr].map(mo => {
                  const isSel = mo.value === selected
                  return (
                    <button
                      key={mo.value}
                      onClick={() => mo.available && setSelected(mo.value)}
                      disabled={!mo.available}
                      title={mo.available ? mo.label : 'Disponible desde el dia 4'}
                      className="rounded-xl py-4 text-center transition-all border"
                      style={{
                        backgroundColor: isSel ? 'rgba(59,130,246,0.15)' : CARD2,
                        borderColor    : isSel ? BLUE : 'transparent',
                        opacity        : mo.available ? 1 : 0.3,
                        cursor         : mo.available ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <p className="text-sm font-bold"
                        style={{ color: isSel ? '#93c5fd' : '#e2e8f0' }}>
                        {mo.short}
                      </p>
                      <div className="flex justify-center mt-2">
                        {mo.available
                          ? <div className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: isSel ? BLUE : 'transparent' }} />
                          : <Lock className="w-3 h-3" style={{ color: '#475569' }} />
                        }
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {info && (
          <div className="rounded-lg px-4 py-3.5 mb-4 flex items-start gap-3"
            style={{ backgroundColor: CARD2, border: '1px solid ' + BORDER }}>
            {canDl
              ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: GRN }} />
              : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: YLW }} />}
            <div>
              <p className="text-sm font-semibold text-white">{info.label}</p>
              <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                {canDl
                  ? 'Clientes sin pago, tasa de exito de cobro, recaudo por metodo y faltante por plan'
                  : 'Estara disponible a partir del dia 4 del mes en curso'}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={!canDl || downloading}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-base text-white transition-all"
          style={{
            backgroundColor: canDl ? '#1d4ed8' : '#374151',
            opacity: !canDl || downloading ? 0.6 : 1,
            cursor : !canDl || downloading ? 'not-allowed' : 'pointer',
          }}
        >
          {downloading
            ? <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generando Excel...
              </>
            : <>
                <Download className="w-4 h-4" />
                {'Descargar Excel' + (info ? ' — ' + info.label : '')}
              </>
          }
        </button>

        {error && <p className="mt-3 text-xs text-center text-red-400">{error}</p>}
      </div>

      <div style={{ backgroundColor: CARD, border: '1px solid ' + BORDER }}
        className="rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4 text-white">El reporte Excel incluye 4 hojas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { c: BLUE,      t: 'Hoja 1 — Resumen Ejecutivo', d: 'Ingresos, tasa de exito, deuda estimada y recaudo por Efectivo, Bancolombia y Nequi' },
            { c: '#ef4444', t: 'Hoja 2 — Clientes Sin Pago',  d: 'Lista con nombre, plan, valor mensual, clasificacion y celular' },
            { c: YLW,       t: 'Hoja 3 — Faltante por Plan',  d: 'Cuanto falta cobrar agrupado por cada plan de internet' },
            { c: '#8b5cf6', t: 'Hoja 4 — Sin Cobro Enviado',  d: 'Clientes activos sin mensaje de cobranza enviado este mes' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg p-3.5"
              style={{ backgroundColor: CARD2 }}>
              <div className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0"
                style={{ backgroundColor: item.c }} />
              <div>
                <p className="text-xs font-semibold text-white">{item.t}</p>
                <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{item.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
