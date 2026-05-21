'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FileUpload from '@/app/components/FileUpload'

const API_URL = 'http://localhost:8000'

export default function EstimadorPage() {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [estimation, setEstimation] = useState<any>(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [showOppForm, setShowOppForm] = useState(false)
  const [oppForm, setOppForm] = useState({ cliente_nombre: '', nombre_proyecto: '' })
  const [converting, setConverting] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const freeContext = { resumen_ejecutivo: description, descripcion_libre: description, requerimientos_funcionales: [], arquitectura: { computo: [], almacenamiento_datos: [], networking: [], seguridad: [], observabilidad: [], iac_cicd: [] } }
      const res = await fetch(`${API_URL}/api/opportunity/estimation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution_design: freeContext, technical_base: freeContext })
      })
      setEstimation(await res.json())
    } catch { alert('Error al generar estimación') }
    setLoading(false)
  }

  const refine = async () => {
    if (!feedback.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/opportunity/estimation/refine`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_estimation: estimation, feedback })
      })
      setEstimation(await res.json())
      setFeedback('')
    } catch { alert('Error al refinar') }
    setLoading(false)
  }

  const download = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/opportunity/estimation/export`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estimation)
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${estimation.project_name || 'estimacion'}_plan.xlsx`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { alert('Error al descargar') }
    setLoading(false)
  }

  const convertToOpportunity = async () => {
    if (!oppForm.cliente_nombre || !oppForm.nombre_proyecto) return
    setConverting(true)
    try {
      const oppRes = await fetch(`${API_URL}/api/backoffice/oportunidades`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...oppForm, crm_context: description })
      })
      const opp = await oppRes.json()
      const freeContext = { resumen_ejecutivo: description, descripcion_libre: description, requerimientos_funcionales: [], arquitectura: { computo: [], almacenamiento_datos: [], networking: [], seguridad: [], observabilidad: [], iac_cicd: [] } }
      await fetch(`${API_URL}/api/opportunity/estimation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution_design: freeContext, technical_base: freeContext, opportunity_id: opp.id })
      })
      router.push(`/pipeline?id=${opp.id}`)
    } catch { alert('Error al convertir') }
    setConverting(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="text-xs text-gray-400 hover:text-gray-600">← Inicio</a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-1">Estimador de proyectos</h1>
        <p className="text-sm text-gray-500 mb-8">Describe el proyecto y obtén una estimación de horas, costos y duración.</p>

        {!estimation && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Describe el proyecto</label>
            <textarea className="w-full h-48 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Describe el proyecto..."
              value={description} onChange={e => setDescription(e.target.value)} />
            <div className="flex items-center gap-3 mt-4">
              <button onClick={generate} disabled={loading || !description}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
                {loading ? 'Generando...' : 'Generar Estimación'}
              </button>
              <FileUpload
                existingContext={description}
                onExtracted={(text) => setDescription(prev => prev ? `${prev}\n\n${text}` : text)}
                label="Adjuntar documento"
              />
              <button onClick={() => setDescription('Migración de infraestructura on-premise a AWS para un banco con 3 aplicaciones Spring Boot, PostgreSQL, ~200 usuarios concurrentes. Requiere ECS Fargate, RDS Multi-AZ, ALB, ambientes DEV y PROD, IaC con Terraform.')}
                className="text-xs text-gray-400 hover:text-teal-600 underline underline-offset-2">
                Cargar ejemplo
              </button>
            </div>
          </div>
        )}

        {estimation && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{estimation.project_name}</h2>
                <p className="text-xs text-gray-400">{estimation.project_type} · {estimation.nivel_senioridad}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEstimation(null)}
                  className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                  Nueva estimación
                </button>
                <button onClick={() => setShowOppForm(!showOppForm)}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                  + Convertir en oportunidad
                </button>
                <button onClick={download} disabled={loading}
                  className="flex items-center gap-1.5 bg-teal-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
                  ↓ .xlsx
                </button>
              </div>
            </div>

            {showOppForm && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-xs font-medium text-blue-700 mb-3">Crear oportunidad y continuar en el pipeline</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Cliente</label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={oppForm.cliente_nombre} onChange={e => setOppForm({ ...oppForm, cliente_nombre: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Nombre del proyecto</label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={oppForm.nombre_proyecto} onChange={e => setOppForm({ ...oppForm, nombre_proyecto: e.target.value })} />
                  </div>
                </div>
                <button onClick={convertToOpportunity} disabled={converting || !oppForm.cliente_nombre || !oppForm.nombre_proyecto}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {converting ? 'Creando...' : 'Crear y abrir pipeline →'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-teal-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-teal-700">{estimation.resumen_economico?.horas_totales_applying}h</p>
                <p className="text-xs text-teal-600 mt-1">Horas Applying</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">${estimation.resumen_economico?.costo_total_usd?.toLocaleString()}</p>
                <p className="text-xs text-blue-600 mt-1">Costo Total USD</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-700">{estimation.duracion_estimada_semanas} sem</p>
                <p className="text-xs text-gray-500 mt-1">Duración estimada</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Rol</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Horas</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Tarifa</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {estimation.resumen_economico?.desglose_por_rol?.map((r: any, i: number) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 text-gray-900 font-medium">{r.rol}</td>
                      <td className="px-4 py-2.5 text-gray-600 text-right">{r.horas}h</td>
                      <td className="px-4 py-2.5 text-gray-600 text-right">${r.tarifa_hora}/h</td>
                      <td className="px-4 py-2.5 font-semibold text-right">${r.subtotal_usd?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Ajustar Estimación</p>
              <textarea className="w-full h-24 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder='Ej: "Quita la migración de BD, agrega 16h al arquitecto en pruebas"'
                value={feedback} onChange={e => setFeedback(e.target.value)} />
              <button onClick={refine} disabled={loading || !feedback.trim()}
                className="mt-3 bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                {loading ? 'Refinando...' : 'Refinar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
