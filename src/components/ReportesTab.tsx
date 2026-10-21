'use client'
import { useState } from 'react'
import { FileSpreadsheet, Download, Calendar, TrendingUp,
         AlertCircle, CheckCircle, DollarSign, Lock } from 'lucide-react'

interface Props {
  BG: string; CARD: string; CARD2: string
  BORDER: string; TEXT: string; MUTED: string
}

export default function ReportesTab({ CARD, CARD2, BORDER, MUTED }: Props) {
  const now   = new Date()
  const thisY = now.getFullYear()
  const thisM = now.getMonth() + 1
  const today = now.getDate()

  const defaultPeriod = thisM === 1
    ? `${thisY - 1}-12`
    : `${thisY}-${String(thisM - 1).padStart(2,'0')}`

  const [selected,    setSelected]    = useState<string>(defaultPeriod)
  const [downloading, setDownloading] = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const MONTH_NAMES = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ]

  // Ultimos 13 meses
  const months: { value: string; label: string; available: boolean }[] = []
  for (let i = 12; i >= 0; i--) {
    const d  = new Date(thisY, thisM - 1 - i, 1)
    const y  = d.getFullYear()
    const m  = d.getMonth() + 1
    const v  = `${y}-${String(m).padStart(2,'0')}`
    const isCurrent = y === thisY && m === thisM
    months.push({
      value: v,
      label: `${MONTH_NAMES[m-1]} ${y}`,
      available: !isCurrent || today >= 4
    })
  }

  const info      = months.find(m => m.value === selected)
  const canDl     = info?.available ?? false
  const [mn, yr]  = (info?.label ?? '').split(' ')

  const handleDownload = async () => {
    if (!canDl || downloading) return
    setDownloading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reportes/mensual?period=${selected}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `Reporte_Medifibra_${mn}_${yr}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setError(`No se pudo generar el reporte: ${e instanceof Error ? e.message : 'Error'}`)
    } finally {
      setDownloading(false)
    }
  }

  const BLUE   = '#3b82f6'
  const GREEN  = '#22c55e'
  const YELLOW = '#f59e0b'

  return (
    <div className="space-y-5 p-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-1">
        <FileSpreadsheet className="w-5 h-5" style={{ color: BLUE }} />
        <h2 className="text-lg font-bold text-white">Reportes y Estadisticas</h2>
      </div>

      {/* Selector de mes */}
      <div
        style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}
        className="rounded-xl p-5"
      >
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"
          style={{ color: '#e2e8f0' }}>
          <Calendar className="w-4 h-4" style={{ color: BLUE }} />
          Selecciona el mes a reportar
        </h3>

        {/* Grid de meses */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2 mb-5">
          {months.map(m => {
            const isSelected = m.value === selected
            const parts = m.label.split(' ')
            return (
              <button
                key={m.value}
                onClick={() => m.available && setSelected(m.value)}
                disabled={!m.available}
                title={!m.available ? 'Disponible desde el dia 4' : m.label}
                className={`rounded-lg py-3 px-1 text-center transition-all border select-none
                  ${!m.available
                    ? 'opacity-35 cursor-not-allowed'
                    : 'cursor-pointer'}
                  ${isSelected
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-transparent hover:border-slate-500'}`}
                style={!isSelected ? { backgroundColor: CARD2 } : undefined}
              >
                <div className="text-xs font-bold tracking-wide"
                  style={{ color: isSelected ? '#60a5fa' : '#e2e8f0' }}>
                  {parts[0].slice(0,3).toUpperCase()}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                  {parts[1]}
                </div>
                {!m.available
                  ? <Lock className="w-2.5 h-2.5 mx-auto mt-1" style={{ color: '#475569' }} />
                  : isSelected
                  ? <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mx-auto mt-1" />
                  : null}
              </button>
            )
          })}
        </div>

        {/* Info del mes seleccionado */}
        {info && (
          <div className="rounded-lg px-4 py-3 mb-5 flex items-start gap-3"
            style={{ backgroundColor: CARD2, border: `1px solid ${BORDER}` }}>
            {canDl
              ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: GREEN }} />
              : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: YELLOW }} />}
            <div>
              <p className="text-sm font-semibold text-white">{info.label}</p>
              <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                {canDl
                  ? 'Reporte disponible — clientes sin pago, tasa de exito, recaudo por metodo y faltante por plan'
                  : 'Disponible a partir del dia 4 del mes en curso'}
              </p>
            </div>
          </div>
        )}

        {/* Boton de descarga */}
        <button
          onClick={handleDownload}
          disabled={!canDl || downloading}
          className={`w-full flex items-center justify-center gap-2.5 py-3.5
            rounded-xl font-semibold text-sm transition-all text-white
            ${canDl && !downloading
              ? 'hover:brightness-110 active:scale-[0.99]'
              : 'opacity-50 cursor-not-allowed'}`}
          style={{ backgroundColor: canDl ? '#1d4ed8' : '#374151' }}
        >
          {downloading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generando Excel...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Descargar Excel — {info?.label ?? selected}
            </>
          )}
        </button>

        {error && (
          <p className="mt-2.5 text-xs text-red-400 text-center flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
      </div>

      {/* Descripcion hojas del Excel */}
      <div
        style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}
        className="rounded-xl p-5"
      >
        <h3 className="text-sm font-semibold mb-4 text-white">
          Contenido del reporte Excel (4 hojas)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            [TrendingUp,      BLUE,   'Resumen Ejecutivo',
              'KPIs del mes: ingresos totales, tasa de exito de cobro, deuda estimada y recaudo por Efectivo, Bancolombia y Nequi'],
            [AlertCircle,    '#ef4444','Clientes Sin Pago',
              'Lista con nombre, plan, valor mensual, clasificacion y celular'],
            [DollarSign,     YELLOW, 'Faltante por Plan',
              'Cuantos clientes y cuanto dinero falta cobrar en cada plan de internet'],
            [FileSpreadsheet,'#8b5cf6','Sin Cobro Enviado',
              'Clientes activos a quienes no se les envio mensaje de cobranza este mes'],
          ] as const).map(([Icon, color, title, desc], i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg p-3"
              style={{ backgroundColor: CARD2 }}>
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} />
              <div>
                <p className="text-xs font-semibold text-white">{title}</p>
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
