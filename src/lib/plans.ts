export const PLANS = [
  { id: 'fibra-50',  name: 'FIBRA 50 MBPS',  speed: 50,  value: 55000,  color: '#1d4ed8', label: '50'  },
  { id: 'fibra-100', name: 'FIBRA 100 MBPS', speed: 100, value: 80000,  color: '#0891b2', label: '100' },
  { id: 'fibra-150', name: 'FIBRA 150 MBPS', speed: 150, value: 95000,  color: '#16a34a', label: '150' },
  { id: 'fibra-200', name: 'FIBRA 200 MBPS', speed: 200, value: 105000, color: '#d97706', label: '200' },
  { id: 'fibra-300', name: 'FIBRA 300 MBPS', speed: 300, value: 125000, color: '#7c3aed', label: '300' },
  { id: 'fibra-500', name: 'FIBRA 500 MBPS', speed: 500, value: 130000, color: '#1e3a5f', label: '500' },
]
export const TV_PLAN = { name: 'Televisión', value: 30000 }
export function getPlanByName(name: string) { return PLANS.find(p => p.name === name) }
export function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}
