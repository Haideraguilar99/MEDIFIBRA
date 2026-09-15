with open('src/app/dashboard/page.tsx', 'r') as f:
    c = f.read()

# --- 1. Eye import ---
old = "LayoutDashboard, Menu, ChevronLeft, Upload } from 'lucide-react'"
new = "LayoutDashboard, Menu, ChevronLeft, Upload, Eye } from 'lucide-react'"
assert old in c, "FAIL 1: lucide import"
c = c.replace(old, new, 1)
print("1. Eye import OK")

# --- 2. viewClient state ---
old = "const [showModal,    setShowModal]    = useState(false)"
new = "const [showModal,    setShowModal]    = useState(false)\n  const [viewClient,   setViewClient]   = useState<Client|null>(null)"
assert old in c, "FAIL 2: showModal state"
c = c.replace(old, new, 1)
print("2. viewClient state OK")

# --- 3. Boton Eye en fila cliente (antes del boton Editar) ---
old = '<button onClick={()=>openEditClient(c)} title="Editar" className="p-1.5 rounded-lgtransition-colors hover:opacity-80" style={{backgroundColor:CARD2,color:LIGHT}}><Pencil className="w-3.5 h-3.5"/></button>'
new = ('<button onClick={()=>setViewClient(c)} title="Ver detalle" className="p-1.5 rounded-lg transition-colors hover:opacity-80" style={{backgroundColor:\'#0f2744\',color:\'#60a5fa\'}}><Eye className="w-3.5 h-3.5"/></button>\n                            '
       '<button onClick={()=>openEditClient(c)} title="Editar" className="p-1.5 rounded-lg transition-colors hover:opacity-80" style={{backgroundColor:CARD2,color:LIGHT}}><Pencil className="w-3.5 h-3.5"/></button>')
assert old in c, "FAIL 3: edit button"
c = c.replace(old, new, 1)
print("3. Eye button OK")

# --- 4. MediTV display en tabla ---
old = '{c.incluye_tv?<p className="text-xs mt-0.5" style={{color:MUTED}}>MediTV</p>:null}'
new = '{c.incluye_tv>0?<p className="text-xs mt-0.5 font-semibold" style={{color:\'#f59e0b\'}}>+ MediTV</p>:null}'
assert old in c, "FAIL 4: tv table display"
c = c.replace(old, new, 1)
print("4. TV table display OK")

# --- 5. Opciones TV: 3 opciones ---
old = "{[{v:1,l:'Si\u0301, incluye MediTV'},{v:0,l:'No incluye TV'}].map(opt=>("
if old not in c:
    old = "{[{v:1,l:'S\xed, incluye MediTV'},{v:0,l:'No incluye TV'}].map(opt=>("
if old not in c:
    old = "{[{v:1,l:'Sí, incluye MediTV'},{v:0,l:'No incluye TV'}].map(opt=>("
assert old in c, "FAIL 5: tv options — buscar manualmente la linea 1068"
new = "{[{v:0,l:'Sin TV'},{v:30000,l:'MediTV Standard — $30.000'},{v:40000,l:'MediTV Premium — $40.000'}].map(opt=>("
c = c.replace(old, new, 1)
print("5. TV 3 opciones OK")

# --- 6. TV onChange recalcula plan_value ---
old = "onChange={()=>setForm(p=>({...p,incluye_tv:opt.v}))}"
new = "onChange={()=>setForm(p=>({...p,incluye_tv:opt.v,plan_value:(plans.find(x=>x.name===p.plan)?.value??(Number(p.plan_value)-Number(p.incluye_tv)))+opt.v}))}"
assert old in c, "FAIL 6: tv onChange"
c = c.replace(old, new, 1)
print("6. TV onChange OK")

# --- 7. Plan select onChange incluye TV actual ---
old = "setForm(prev=>({...prev,plan:e.target.value,plan_value:p?.value??0}))"
new = "setForm(prev=>({...prev,plan:e.target.value,plan_value:(p?.value??0)+Number(prev.incluye_tv)}))"
assert old in c, "FAIL 7: plan onChange"
c = c.replace(old, new, 1)
print("7. Plan onChange OK")

# --- 8. Modal quick-view (antes del modal de editar) ---
anchor = "{/* \u2550\u2550 MODAL CLIENTE \u2550\u2550 */}"
if anchor not in c:
    anchor = "{/* == MODAL CLIENTE == */}"
assert anchor in c, "FAIL 8: anchor modal cliente"

qv = """      {viewClient&&(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{backgroundColor:'rgba(0,0,0,0.82)'}} onClick={()=>setViewClient(null)}>
          <div style={{backgroundColor:CARD,border:`1px solid ${BORDER}`,boxShadow:'0 25px 80px rgba(0,0,0,0.5)'}} className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-start justify-between px-5 py-4 sticky top-0 z-10" style={{backgroundColor:CARD,borderBottom:`1px solid ${BORDER}`}}>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{color:MUTED}}>ID #{viewClient.id}</p>
                <h3 className="font-bold text-base leading-tight" style={{color:TEXT}}>{viewClient.name}</h3>
                <div className="mt-1.5"><ClassBadge cls={viewClient.classification}/></div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={()=>{openWAModal(viewClient);setViewClient(null)}} title="WhatsApp" className="p-1.5 rounded-lg hover:opacity-80 transition-opacity" style={{backgroundColor:'#f0fdf4',color:'#16a34a'}}><MessageCircle className="w-4 h-4"/></button>
                <Link href={`/factura/${viewClient.id}`} target="_blank" title="Factura" className="p-1.5 rounded-lg hover:opacity-80 transition-opacity" style={{backgroundColor:'#eff6ff',color:'#2563eb'}}><FileText className="w-4 h-4"/></Link>
                <button onClick={()=>{openEditClient(viewClient);setViewClient(null)}} title="Editar" className="p-1.5 rounded-lg hover:opacity-80 transition-opacity" style={{backgroundColor:CARD2,color:LIGHT}}><Pencil className="w-4 h-4"/></button>
                <button onClick={()=>setViewClient(null)} className="p-1.5 rounded-lg hover:opacity-75 transition-opacity" style={{backgroundColor:CARD2,color:MUTED}}><X className="w-4 h-4"/></button>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="rounded-xl p-4" style={{backgroundColor:CARD2,border:`1px solid ${BORDER}`}}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color:MUTED}}>Plan y Facturacion</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-lg text-sm font-bold text-white" style={{backgroundColor:getPlanColor(viewClient.plan)}}>{viewClient.plan||'Sin plan'}</span>
                  <span className="text-xl font-bold" style={{color:'#4ade80'}}>{formatCurrency(viewClient.plan_value)}</span>
                </div>
                {viewClient.incluye_tv>0&&<div className="mb-3 px-3 py-1.5 rounded-lg inline-block" style={{backgroundColor:'#451a03'}}><p className="text-xs font-semibold" style={{color:'#f59e0b'}}>MediTV incluido — {formatCurrency(viewClient.incluye_tv)}/mes</p></div>}
                <div className="flex gap-6">
                  <div><p className="text-xs mb-0.5" style={{color:MUTED}}>Dia de pago</p><p className="font-bold text-sm" style={{color:viewClient.dia_pago?TEXT:MUTED}}>{viewClient.dia_pago?'Dia '+viewClient.dia_pago:'Sin definir'}</p></div>
                  {viewClient.fecha_instalacion&&<div><p className="text-xs mb-0.5" style={{color:MUTED}}>Instalacion</p><p className="font-bold text-sm" style={{color:TEXT}}>{viewClient.fecha_instalacion}</p></div>}
                </div>
              </div>
              <div className="rounded-xl p-4" style={{backgroundColor:CARD2,border:`1px solid ${BORDER}`}}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color:MUTED}}>Contacto</p>
                <div className="space-y-2">
                  {viewClient.cedula&&<div className="flex justify-between items-center"><span className="text-xs" style={{color:MUTED}}>Cedula</span><span className="text-sm font-semibold" style={{color:TEXT}}>{viewClient.cedula}</span></div>}
                  <div className="flex justify-between items-center"><span className="text-xs" style={{color:MUTED}}>Celular</span><a href={'tel:'+viewClient.cellphone} className="text-sm font-bold" style={{color:'#60a5fa'}}>{viewClient.cellphone}</a></div>
                  {viewClient.telefono_alternativo&&<div className="flex justify-between items-center"><span className="text-xs" style={{color:MUTED}}>Alternativo</span><a href={'tel:'+viewClient.telefono_alternativo} className="text-sm" style={{color:'#60a5fa'}}>{viewClient.telefono_alternativo}</a></div>}
                  {viewClient.email&&<div className="flex justify-between items-center"><span className="text-xs" style={{color:MUTED}}>Email</span><span className="text-sm truncate max-w-[200px]" style={{color:TEXT}}>{viewClient.email}</span></div>}
                </div>
              </div>
              {(viewClient.address||viewClient.punto_referencia)&&(
                <div className="rounded-xl p-4" style={{backgroundColor:CARD2,border:`1px solid ${BORDER}`}}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color:MUTED}}>Ubicacion</p>
                  <div className="space-y-2">
                    {viewClient.address&&<div><p className="text-xs mb-0.5" style={{color:MUTED}}>Direccion</p><p className="text-sm font-medium" style={{color:TEXT}}>{viewClient.address}</p></div>}
                    {viewClient.punto_referencia&&<div><p className="text-xs mb-0.5" style={{color:MUTED}}>Referencia</p><p className="text-sm" style={{color:LIGHT}}>{viewClient.punto_referencia}</p></div>}
                    {viewClient.neighborhood&&<div className="flex justify-between items-center"><span className="text-xs" style={{color:MUTED}}>Barrio</span><span className="text-sm" style={{color:LIGHT}}>{viewClient.neighborhood}</span></div>}
                  </div>
                </div>
              )}
              {viewClient.notes&&(
                <div className="rounded-xl p-4" style={{backgroundColor:CARD2,border:`1px solid ${BORDER}`}}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{color:MUTED}}>Notas</p>
                  <p className="text-sm" style={{color:LIGHT}}>{viewClient.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
"""
c = c.replace(anchor, qv + anchor, 1)
print("8. Quick-view modal OK")

with open('src/app/dashboard/page.tsx', 'w') as f:
    f.write(c)
print("\nTODOS LOS CAMBIOS APLICADOS")
