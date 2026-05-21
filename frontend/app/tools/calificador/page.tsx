'use client'
import { useState } from 'react'
import FileUpload from '@/app/components/FileUpload'

const API_URL = 'http://localhost:8000'

export default function CalificadorPage() {
  const [context, setContext] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const qualify = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/opportunity/qualify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crm_context: context })
      })
      setResult(await res.json())
    } catch { alert('Error al calificar') }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <a href="/" className="text-xs text-gray-400 hover:text-gray-600">← Inicio</a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-1">Calificador de oportunidades</h1>
        <p className="text-sm text-gray-500 mb-8">Evalúa viabilidad, complejidad y decisión Go / No Go.</p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Contexto del CRM</label>
          <textarea
            className="w-full h-48 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Pega aquí las notas del CRM sobre la oportunidad..."
            value={context}
            onChange={e => setContext(e.target.value)}
          />
          <div className="flex items-center gap-3 mt-4">
          <button onClick={qualify} disabled={loading || !context}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Calificando...' : 'Calificar'}
          </button>
          <FileUpload
          existingContext={context}
          onExtracted={(text) => setContext(prev => prev ? `${prev}\n\n${text}` : text)}
            label="Adjuntar documento"
            />
              <button onClick={() => setContext('Cliente: Banco Regional Andino\nNecesidad: Migrar infraestructura on-premise a AWS. 3 apps Spring Boot, PostgreSQL, ~200 usuarios concurrentes.\nPresupuesto: $15,000 USD. Plazo: 3 meses.\nObservaciones: Ya tienen cuenta AWS sin gobierno. CTO interesado en containers.')}
                className="text-xs text-gray-400 hover:text-blue-600 underline underline-offset-2">
                Cargar ejemplo
              </button>
            </div>
        </div>

        {result && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Viabilidad</p>
                <p className="font-bold text-gray-900">{result.viabilidad}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Complejidad</p>
                <p className="font-bold text-gray-900">{result.complejidad}</p>
              </div>
              <div className={`rounded-lg p-4 text-center ${result.decision === 'Go' ? 'bg-green-50' : result.decision === 'No Go' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                <p className="text-xs text-gray-500 mb-1">Decisión</p>
                <p className={`font-bold text-lg ${result.decision === 'Go' ? 'text-green-700' : result.decision === 'No Go' ? 'text-red-700' : 'text-yellow-700'}`}>
                  {result.decision}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-4">{result.justificacion_decision}</p>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Riesgos</p>
              <ul className="space-y-1">
                {result.riesgos?.map((r: string, i: number) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-yellow-500">⚠</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
