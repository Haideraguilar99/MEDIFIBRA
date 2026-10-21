import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import ExcelJS from 'exceljs'
import path from 'path'
import fs from 'fs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period')
  if (!period || !/^\d{4}-\d{2}$/.test(period))
    return NextResponse.json({ error: 'period requerido (YYYY-MM)' }, { status: 400 })

  const db = await getDb()

  // 1. Total activos con fecha de pago
  const totalRes = await db.execute(
    `SELECT COUNT(*) as total FROM clients WHERE status='active' AND dia_pago != ''`
  )
  const totalActivos = Number(totalRes.rows[0].total ?? 0)

  // 2. Pagos del mes por metodo
  const pagosRes = await db.execute({
    sql: `SELECT method, SUM(amount) as total, COUNT(*) as count
          FROM payments
          WHERE status='paid' AND strftime('%Y-%m', created_at) = ?
          GROUP BY method`,
    args: [period]
  })

  // 3. Clientes que pagaron este mes
  const pagadosRes = await db.execute({
    sql: `SELECT COUNT(DISTINCT client_id) as pagados
          FROM payments
          WHERE status='paid' AND strftime('%Y-%m', created_at) = ?`,
    args: [period]
  })
  const pagados = Number(pagadosRes.rows[0].pagados ?? 0)

  // 4. Ingresos totales del mes
  const ingresosRes = await db.execute({
    sql: `SELECT COALESCE(SUM(amount),0) as total FROM payments
          WHERE status='paid' AND strftime('%Y-%m', created_at) = ?`,
    args: [period]
  })
  const ingresosTotales = Number(ingresosRes.rows[0].total ?? 0)

  // 5. Clientes sin pago este mes
  const sinPagoRes = await db.execute({
    sql: `SELECT c.id, c.name, c.plan, c.plan_value, c.classification,
                 c.dia_pago, c.cellphone, c.incluye_tv
          FROM clients c
          WHERE c.status='active' AND c.dia_pago != ''
            AND c.classification != 'AL_DIA'
            AND NOT EXISTS (
              SELECT 1 FROM payments p
              WHERE p.client_id = c.id AND p.status='paid'
                AND strftime('%Y-%m', p.created_at) = ?
            )
          ORDER BY CAST(c.dia_pago AS INTEGER) ASC, c.name ASC`,
    args: [period]
  })

  // 6. Faltante por plan
  const faltantePlanRes = await db.execute({
    sql: `SELECT c.plan, c.plan_value,
                 COUNT(*) as count, SUM(c.plan_value) as faltante
          FROM clients c
          WHERE c.status='active' AND c.dia_pago != ''
            AND c.classification != 'AL_DIA'
            AND NOT EXISTS (
              SELECT 1 FROM payments p
              WHERE p.client_id = c.id AND p.status='paid'
                AND strftime('%Y-%m', p.created_at) = ?
            )
          GROUP BY c.plan, c.plan_value
          ORDER BY c.plan_value DESC`,
    args: [period]
  })

  // 7. Sin cobro enviado este mes
  const sinCobroRes = await db.execute({
    sql: `SELECT c.id, c.name, c.plan, c.plan_value, c.dia_pago, c.cellphone
          FROM clients c
          WHERE c.status='active' AND c.dia_pago != ''
            AND c.classification NOT IN
              ('SUSPENDIDO','USUARIO_PERDIDO','RECOGER_EQUIPO','NO_PAGA_AUTORIZADO')
            AND NOT EXISTS (
              SELECT 1 FROM notifications_log nl
              WHERE nl.client_id = c.id AND nl.type='cobro_enviado'
                AND strftime('%Y-%m', nl.sent_at) = ?
            )
          ORDER BY CAST(c.dia_pago AS INTEGER) ASC, c.name ASC`,
    args: [period]
  })

  // ── Helpers ──────────────────────────────────────────
  const [year, month] = period.split('-')
  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const monthName = MONTH_NAMES[parseInt(month) - 1]
  const tasaExito = totalActivos > 0
    ? ((pagados / totalActivos) * 100).toFixed(1) : '0.0'
  const sinPago = totalActivos - pagados
  const deudaTotal = sinPagoRes.rows.reduce((s, r) => s + Number(r.plan_value ?? 0), 0)

  const classLabel: Record<string, string> = {
    AL_DIA:'Al dia', PROXIMO_PAGAR:'Proximo a pagar',
    RECORDAR_RECIBO:'Enviar recibo', DEUDA_PENDIENTE:'Deuda pendiente',
    NOVEDAD_PAGO:'Novedad de pago', NO_PAGA_AUTORIZADO:'No paga autorizado',
    SUSPENDIDO_TEMP:'Suspendido temporal', SUSPENDIDO:'Suspendido',
    RECOGER_EQUIPO:'Recoger equipo', USUARIO_PERDIDO:'Usuario perdido',
    SIN_FECHA:'Sin fecha'
  }

  // ── Colores ──────────────────────────────────────────
  const C = {
    headerBg : '1E3A5F',
    accent   : '0891B2',
    green    : '166534',
    red      : '991B1B',
    yellow   : '92400E',
    purple   : '4C1D95',
    white    : 'FFFFFF',
    text     : '1E293B',
    rowBlue  : 'EFF6FF',
    rowRed   : 'FEF2F2',
    rowYellow: 'FFFBEB',
    rowPurple: 'F5F3FF',
  }

  // ── Workbook ─────────────────────────────────────────
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'MEDIFIBRA'
  workbook.created = new Date()

  // Logo
  let logoId: number | undefined
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logofact.jpeg')
    if (fs.existsSync(logoPath)) {
      const buf = fs.readFileSync(logoPath)
      logoId = workbook.addImage({ buffer: buf as unknown as any, extension: 'jpeg' })
    }
  } catch {}

  // ── Helpers de hoja ──────────────────────────────────
  const sheetHeader = (
    ws: ExcelJS.Worksheet,
    cols: number,
    title: string,
    subtitle: string,
    bgColor: string,
    bgSub: string
  ) => {
    const last = String.fromCharCode(64 + cols)
    ws.mergeCells(`A1:${last}1`)
    const c1 = ws.getCell('A1')
    c1.value = title
    c1.font = { bold: true, size: 14, color: { argb: C.white } }
    c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
    c1.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(1).height = 34

    ws.mergeCells(`A2:${last}2`)
    const c2 = ws.getCell('A2')
    c2.value = subtitle
    c2.font = { size: 9.5, color: { argb: C.white }, italic: true }
    c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgSub } }
    c2.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(2).height = 20
  }

  const tableHeaders = (
    ws: ExcelJS.Worksheet,
    row: number,
    headers: string[],
    aligns: ('left'|'right'|'center')[]
  ) => {
    headers.forEach((h, i) => {
      const col = String.fromCharCode(65 + i)
      const cell = ws.getCell(`${col}${row}`)
      cell.value = h
      cell.font = { bold: true, size: 9, color: { argb: C.white } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } }
      cell.alignment = { horizontal: aligns[i] ?? 'left', vertical: 'middle' }
      cell.border = { bottom: { style: 'medium', color: { argb: C.accent } } }
    })
    ws.getRow(row).height = 22
  }

  const addRow = (
    ws: ExcelJS.Worksheet,
    rowNum: number,
    values: (string|number)[],
    aligns: ('left'|'right'|'center')[],
    evenBg: string,
    oddBg: string,
    isEven: boolean,
    numFmtCols: number[] = []
  ) => {
    ws.getRow(rowNum).height = 20
    values.forEach((v, i) => {
      const col = String.fromCharCode(65 + i)
      const cell = ws.getCell(`${col}${rowNum}`)
      cell.value = v
      cell.fill = { type: 'pattern', pattern: 'solid',
        fgColor: { argb: isEven ? evenBg : oddBg } }
      cell.font = { size: 9.5, color: { argb: C.text } }
      cell.alignment = { vertical: 'middle', horizontal: aligns[i] ?? 'left' }
      if (numFmtCols.includes(i)) cell.numFmt = '"$"#,##0'
    })
  }

  // ════════════════════════════════════════════════════════
  // HOJA 1 — RESUMEN EJECUTIVO
  // ════════════════════════════════════════════════════════
  const ws1 = workbook.addWorksheet('Resumen Ejecutivo')
  ws1.columns = [
    {width:5},{width:30},{width:5},{width:22},{width:22},{width:5}
  ]

  // Titulo
  ws1.mergeCells('B1:E1')
  const t1 = ws1.getCell('B1')
  t1.value = 'MEDIFIBRA S.A.S'
  t1.font = { bold:true, size:18, color:{argb:C.white} }
  t1.fill = { type:'pattern', pattern:'solid', fgColor:{argb:C.headerBg} }
  t1.alignment = { horizontal:'center', vertical:'middle' }
  ws1.getRow(1).height = 44

  ws1.mergeCells('B2:E2')
  const sub1 = ws1.getCell('B2')
  sub1.value = `Reporte Mensual — ${monthName} ${year}`
  sub1.font = { size:12, color:{argb:C.white} }
  sub1.fill = { type:'pattern', pattern:'solid', fgColor:{argb:C.accent} }
  sub1.alignment = { horizontal:'center', vertical:'middle' }
  ws1.getRow(2).height = 28

  if (logoId !== undefined)
    ws1.addImage(logoId, { tl:{col:4.6, row:0.1}, ext:{width:90, height:55} })

  ws1.getRow(3).height = 12

  // Titulo KPIs
  ws1.mergeCells('B4:E4')
  const kpiT = ws1.getCell('B4')
  kpiT.value = 'INDICADORES CLAVE DEL MES'
  kpiT.font = { bold:true, size:9, color:{argb:C.headerBg} }
  kpiT.alignment = { horizontal:'center' }
  kpiT.border = { bottom:{style:'medium', color:{argb:C.headerBg}} }
  ws1.getRow(4).height = 18

  const kpiRow = (r: number, label: string, value: string, argb: string) => {
    ws1.getRow(r).height = 26
    const lc = ws1.getCell(`B${r}`)
    lc.value = label
    lc.font = { size:9.5, color:{argb:'475569'} }
    lc.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'F8FAFC'} }
    lc.alignment = { vertical:'middle' }
    lc.border = { bottom:{style:'thin', color:{argb:'E2E8F0'}} }

    ws1.mergeCells(`C${r}:E${r}`)
    const vc = ws1.getCell(`C${r}`)
    vc.value = value
    vc.font = { bold:true, size:13, color:{argb: argb} }
    vc.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'F8FAFC'} }
    vc.alignment = { horizontal:'right', vertical:'middle' }
    vc.border = { bottom:{style:'thin', color:{argb:'E2E8F0'}} }
  }

  const tasa = Number(tasaExito)
  kpiRow(5, 'Clientes activos con fecha de pago', String(totalActivos), C.headerBg)
  kpiRow(6, 'Pagos registrados este mes', String(pagados), C.green)
  kpiRow(7, 'Clientes sin pago', String(sinPago), C.red)
  kpiRow(8, 'Ingresos recaudados', `$${ingresosTotales.toLocaleString('es-CO')}`, C.green)
  kpiRow(9, 'Deuda total estimada', `$${deudaTotal.toLocaleString('es-CO')}`, C.red)
  kpiRow(10, 'Tasa de exito de cobro', `${tasaExito}%`,
    tasa >= 85 ? C.green : tasa >= 65 ? C.yellow : C.red)

  ws1.getRow(11).height = 14

  // Titulo metodos
  ws1.mergeCells('B12:E12')
  const metT = ws1.getCell('B12')
  metT.value = 'RECAUDO POR METODO DE PAGO'
  metT.font = { bold:true, size:9, color:{argb:C.headerBg} }
  metT.alignment = { horizontal:'center' }
  metT.border = { bottom:{style:'medium', color:{argb:C.headerBg}} }
  ws1.getRow(12).height = 18

  // Headers metodos
  ;['B','C','D','E'].forEach((col, i) => {
    const cell = ws1.getCell(`${col}13`)
    cell.value = ['Metodo','','Transacciones','Total recaudado'][i]
    cell.font = { bold:true, size:9, color:{argb:C.white} }
    cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:C.headerBg} }
    cell.alignment = { horizontal: i < 2 ? 'left':'right', vertical:'middle' }
  })
  ws1.getRow(13).height = 22

  // Solo 3 metodos: efectivo, bancolombia, nequi
  const METODOS_DISPLAY = [
    { key:'efectivo',    label:'Efectivo' },
    { key:'bancolombia', label:'Bancolombia' },
    { key:'nequi',       label:'Nequi' },
  ]
  const metMap: Record<string,{total:number,count:number}> = {}
  for (const r of pagosRes.rows) {
    const m = String(r.method ?? '').toLowerCase()
    const key = METODOS_DISPLAY.find(x => x.key === m) ? m : 'otros'
    if (!metMap[key]) metMap[key] = { total:0, count:0 }
    metMap[key].total += Number(r.total ?? 0)
    metMap[key].count += Number(r.count ?? 0)
  }

  let mr = 14
  for (const { key, label } of METODOS_DISPLAY) {
    const data = metMap[key] ?? { total:0, count:0 }
    const isEven = (mr - 14) % 2 === 0
    const bg = isEven ? C.white : C.rowBlue
    ws1.getRow(mr).height = 22

    ws1.mergeCells(`B${mr}:C${mr}`)
    const lc = ws1.getCell(`B${mr}`)
    lc.value = label
    lc.font = { size:10, color:{argb:C.text} }
    lc.fill = { type:'pattern', pattern:'solid', fgColor:{argb:bg} }
    lc.alignment = { vertical:'middle' }

    const dc = ws1.getCell(`D${mr}`)
    dc.value = data.count
    dc.font = { size:10, color:{argb:C.text} }
    dc.fill = { type:'pattern', pattern:'solid', fgColor:{argb:bg} }
    dc.alignment = { horizontal:'right', vertical:'middle' }

    const tc = ws1.getCell(`E${mr}`)
    tc.value = data.total
    tc.numFmt = '"$"#,##0'
    tc.font = { bold:true, size:10,
      color:{argb: data.total > 0 ? C.green : C.text} }
    tc.fill = { type:'pattern', pattern:'solid', fgColor:{argb:bg} }
    tc.alignment = { horizontal:'right', vertical:'middle' }
    mr++
  }

  // Fila total metodos
  ws1.getRow(mr).height = 26
  ;['B','C','D','E'].forEach((col, i) => {
    const cell = ws1.getCell(`${col}${mr}`)
    cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:C.headerBg} }
    cell.font = { bold:true, size:10, color:{argb:C.white} }
    cell.alignment = { horizontal: i < 2 ? 'left':'right', vertical:'middle' }
    cell.border = { top:{style:'thin', color:{argb:C.accent}} }
  })
  ws1.mergeCells(`B${mr}:C${mr}`)
  ws1.getCell(`B${mr}`).value = 'TOTAL RECAUDADO'
  ws1.getCell(`D${mr}`).value = ''
  ws1.getCell(`E${mr}`).value = ingresosTotales
  ws1.getCell(`E${mr}`).numFmt = '"$"#,##0'

  // Footer ws1
  ws1.getRow(mr+2).height = 12
  ws1.mergeCells(`B${mr+3}:E${mr+3}`)
  const foot1 = ws1.getCell(`B${mr+3}`)
  foot1.value = `Generado por MEDIFIBRA Sistema de Gestion — ${new Date().toLocaleString('es-CO')}`
  foot1.font = { size:8, color:{argb:'94A3B8'}, italic:true }
  foot1.alignment = { horizontal:'center' }

  // ════════════════════════════════════════════════════════
  // HOJA 2 — CLIENTES SIN PAGO
  // ════════════════════════════════════════════════════════
  const ws2 = workbook.addWorksheet('Clientes Sin Pago')
  ws2.columns = [
    {width:5},{width:34},{width:22},{width:16},{width:24},{width:10},{width:18}
  ]
  sheetHeader(ws2, 7,
    `Clientes Sin Pago — ${monthName} ${year}`,
    `Total: ${sinPagoRes.rows.length} clientes — Deuda estimada: $${deudaTotal.toLocaleString('es-CO')}`,
    C.red, '7F1D1D')
  ws2.getRow(3).height = 8
  tableHeaders(ws2, 4,
    ['#','Nombre','Plan','Valor mensual','Clasificacion','Dia pago','Celular'],
    ['left','left','center','right','center','center','center'])

  sinPagoRes.rows.forEach((r, i) => {
    addRow(ws2, 5+i,
      [i+1, String(r.name??''), String(r.plan??''),
       Number(r.plan_value??0),
       classLabel[String(r.classification??'')] ?? String(r.classification??''),
       String(r.dia_pago??''), String(r.cellphone??'')],
      ['left','left','center','right','center','center','center'],
      C.white, C.rowRed, i%2===0, [3])
  })

  // ════════════════════════════════════════════════════════
  // HOJA 3 — FALTANTE POR PLAN
  // ════════════════════════════════════════════════════════
  const ws3 = workbook.addWorksheet('Faltante por Plan')
  ws3.columns = [{width:5},{width:30},{width:18},{width:18},{width:22}]
  sheetHeader(ws3, 5,
    `Faltante por Plan — ${monthName} ${year}`,
    'Monto que falta cobrar agrupado por plan de internet',
    C.yellow, '78350F')
  ws3.getRow(3).height = 8
  tableHeaders(ws3, 4,
    ['#','Plan','Valor / mes','Clientes sin pago','Total faltante'],
    ['left','left','right','right','right'])

  let totalFaltante = 0
  faltantePlanRes.rows.forEach((r, i) => {
    const f = Number(r.faltante ?? 0)
    totalFaltante += f
    addRow(ws3, 5+i,
      [i+1, String(r.plan??''), Number(r.plan_value??0), Number(r.count??0), f],
      ['left','left','right','right','right'],
      C.white, C.rowYellow, i%2===0, [2,4])
  })
  // Total row ws3
  const lr3 = 5 + faltantePlanRes.rows.length
  ws3.getRow(lr3).height = 26
  ;['A','B','C','D','E'].forEach((col, i) => {
    const cell = ws3.getCell(`${col}${lr3}`)
    cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:C.headerBg} }
    cell.font = { bold:true, size:10, color:{argb:C.white} }
    cell.alignment = { horizontal: i < 2 ? 'left':'right', vertical:'middle' }
  })
  ws3.mergeCells(`A${lr3}:D${lr3}`)
  ws3.getCell(`A${lr3}`).value = 'TOTAL FALTANTE'
  ws3.getCell(`E${lr3}`).value = totalFaltante
  ws3.getCell(`E${lr3}`).numFmt = '"$"#,##0'

  // ════════════════════════════════════════════════════════
  // HOJA 4 — SIN COBRO ENVIADO
  // ════════════════════════════════════════════════════════
  const ws4 = workbook.addWorksheet('Sin Cobro Enviado')
  ws4.columns = [{width:5},{width:34},{width:22},{width:16},{width:10},{width:18}]
  sheetHeader(ws4, 6,
    `Sin Cobro Enviado — ${monthName} ${year}`,
    `${sinCobroRes.rows.length} clientes activos sin mensaje de cobranza este mes`,
    C.purple, '3B0764')
  ws4.getRow(3).height = 8
  tableHeaders(ws4, 4,
    ['#','Nombre','Plan','Valor mensual','Dia pago','Celular'],
    ['left','left','center','right','center','center'])

  sinCobroRes.rows.forEach((r, i) => {
    addRow(ws4, 5+i,
      [i+1, String(r.name??''), String(r.plan??''),
       Number(r.plan_value??0), String(r.dia_pago??''), String(r.cellphone??'')],
      ['left','left','center','right','center','center'],
      C.white, C.rowPurple, i%2===0, [3])
  })

  // ── Generar buffer y responder ────────────────────────
  const rawBuffer = await workbook.xlsx.writeBuffer()
  const fileName = `Reporte_Medifibra_${monthName}_${year}.xlsx`
  // Convertir a Uint8Array puro para compatibilidad con Node 22 + Next.js
  const bytes = new Uint8Array(
    rawBuffer instanceof ArrayBuffer
      ? rawBuffer
      : (rawBuffer as unknown as Buffer).buffer
  )
  return new Response(bytes.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    }
  })
}