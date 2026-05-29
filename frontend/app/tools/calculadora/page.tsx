'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function CalculadoraPage() {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [oppForm, setOppForm] = useState({ cliente_nombre: '', nombre_proyecto: '' })
  const [showOppForm, setShowOppForm] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/opportunity/calculator`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution_design: { resumen_ejecutivo: description, arquitectura: { computo: [], almacenamiento_datos: [], networking: [], seguridad: [], observabilidad: [], iac_cicd: [] }, descripcion_libre: description } })
      })
      setResult(await res.json())
    } catch { alert('Error al generar calculadora') }
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
      await fetch(`${API_URL}/api/opportunity/calculator`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution_design: { descripcion_libre: description }, opportunity_id: opp.id })
      })
      router.push(`/pipeline?id=${opp.id}`)
    } catch { alert('Error al convertir') }
    setConverting(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="text-xs text-gray-400 hover:text-gray-600">← Inicio</a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-1">Calculadora AWS</h1>
        <p className="text-sm text-gray-500 mb-8">Describe los servicios y genera el JSON para la extensión RPA de calculator.aws.</p>

        {!result && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Describe la solución o los servicios AWS que necesitas</label>
            <textarea className="w-full h-48 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Ej: Necesito ECS Fargate con 2 tareas, RDS PostgreSQL Multi-AZ, ALB, S3 para archivos y CloudWatch para monitoreo. Región us-east-1."
              value={description} onChange={e => setDescription(e.target.value)} />
            <button onClick={generate} disabled={loading || !description}
              className="mt-4 bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
              {loading ? 'Generando...' : 'Generar JSON'}
            </button>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">JSON generado — {result.services?.length ?? 0} servicios</p>
              <div className="flex gap-2">
                <button onClick={() => setResult(null)}
                  className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                  Nueva calculadora
                </button>
                <button onClick={() => setShowOppForm(!showOppForm)}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                  + Convertir en oportunidad
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

            <div className="bg-gray-900 rounded-lg p-4 relative">
              <pre className="text-xs text-green-400 overflow-auto max-h-80">{JSON.stringify(result, null, 2)}</pre>
              <button onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                className="absolute top-3 right-3 bg-gray-700 text-white text-xs px-3 py-1 rounded hover:bg-gray-600">
                Copiar
              </button>
            </div>

            <ul className="space-y-1">
              {result.services?.map((s: any, i: number) => (
                <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="text-orange-500">▸</span>
                  <span className="font-medium">{s.name}</span>
                  <span className="text-gray-400 text-xs">— {Object.keys(s.fields).length} campos</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}
