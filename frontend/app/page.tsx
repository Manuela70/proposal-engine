'use client'

import { useState } from 'react'

export default function Home() {
  const [context, setContext] = useState('')
  const [qualification, setQualification] = useState<any>(null)
  const [discovery, setDiscovery] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'idle' | 'qualified' | 'discovery'>('idle')

  const qualify = async () => {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/opportunity/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crm_context: context })
      })
      const data = await res.json()
      setQualification(data)
      setStep('qualified')
    } catch (e) {
      alert('Error al calificar la oportunidad')
    }
    setLoading(false)
  }

  const getDiscovery = async () => {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/opportunity/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crm_context: context })
      })
      const data = await res.json()
      setDiscovery(data)
      setStep('discovery')
    } catch (e) {
      alert('Error al generar preguntas')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Proposal Engine</h1>
        <p className="text-gray-500 mb-8">Applying Consulting — Pipeline de Propuestas</p>

        {/* Input */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contexto del CRM
          </label>
          <textarea
            className="w-full h-40 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Pega aquí las notas del CRM sobre la oportunidad..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
          <button
            onClick={qualify}
            disabled={loading || !context}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Calificar Oportunidad'}
          </button>
        </div>

        {/* Qualification Result */}
        {qualification && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Calificación Técnica</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Viabilidad</p>
                <p className="font-semibold text-gray-900">{qualification.viabilidad}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Complejidad</p>
                <p className="font-semibold text-gray-900">{qualification.complejidad}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Decisión</p>
                <p className={`font-semibold ${qualification.decision === 'Go' ? 'text-green-600' : qualification.decision === 'No Go' ? 'text-red-600' : 'text-yellow-600'}`}>
                  {qualification.decision}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">{qualification.justificacion_decision}</p>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">RIESGOS</p>
              <ul className="space-y-1">
                {qualification.riesgos?.map((r: string, i: number) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">⚠</span> {r}
                  </li>
                ))}
              </ul>
            </div>
            {qualification.decision !== 'No Go' && (
              <button
                onClick={getDiscovery}
                disabled={loading}
                className="mt-4 bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? 'Generando...' : 'Generar Preguntas de Discovery'}
              </button>
            )}
          </div>
        )}

        {/* Discovery Questions */}
        {discovery && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Preguntas de Discovery</h2>
            {['preguntas_funcionales', 'preguntas_tecnicas', 'preguntas_arquitectura'].map((key) => (
              <div key={key} className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                  {key.replace('preguntas_', '').replace('_', ' ')}
                </p>
                <ul className="space-y-1">
                  {discovery[key]?.map((q: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-blue-500">→</span> {q}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}