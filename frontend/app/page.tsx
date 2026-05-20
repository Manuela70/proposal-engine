'use client'

import { useState } from 'react'

export default function Home() {
  const [context, setContext] = useState('')
  const [qualification, setQualification] = useState<any>(null)
  const [discovery, setDiscovery] = useState<any>(null)
  const [technicalBase, setTechnicalBase] = useState<any>(null)
  const [solutionDesign, setSolutionDesign] = useState<any>(null)
  const [calculatorJson, setCalculatorJson] = useState<any>(null)
  const [discoveryNotes, setDiscoveryNotes] = useState('')
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

  const getTechnicalBase = async () => {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/opportunity/technical-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crm_context: context, discovery_notes: discoveryNotes })
      })
      const data = await res.json()
      setTechnicalBase(data)
    } catch (e) {
      alert('Error al generar documento técnico')
    }
    setLoading(false)
  }

  const getSolutionDesign = async () => {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/opportunity/solution-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technical_base: technicalBase })
      })
      const data = await res.json()
      setSolutionDesign(data)
    } catch (e) {
      alert('Error al generar diseño de solución')
    }
    setLoading(false)
  }

  const getCalculatorJson = async () => {
  setLoading(true)
  try {
    const res = await fetch('http://localhost:8000/api/opportunity/calculator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solution_design: solutionDesign })
    })
    const data = await res.json()
    setCalculatorJson(data)
  } catch (e) {
    alert('Error al generar JSON de calculadora')
  }
  setLoading(false)
}

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Proposal Engine</h1>
        <p className="text-gray-500 mb-8">Applying Consulting — Pipeline de Propuestas</p>

        {/* Input CRM */}
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

        {/* Calificación Técnica */}
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

        {/* Preguntas de Discovery */}
        {discovery && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
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

        {/* Notas de Discovery */}
        {step === 'discovery' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas de la Reunión de Discovery
            </label>
            <textarea
              className="w-full h-40 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Pega aquí las notas de lo que dijo el cliente en la reunión..."
              value={discoveryNotes}
              onChange={(e) => setDiscoveryNotes(e.target.value)}
            />
            <button
              onClick={getTechnicalBase}
              disabled={loading || !discoveryNotes}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generando...' : 'Generar Documento Técnico Base'}
            </button>
          </div>
        )}

        {/* Documento Técnico Base */}
        {technicalBase && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Documento Técnico Base</h2>

            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Resumen Ejecutivo</p>
              <p className="text-sm text-gray-700">{technicalBase.resumen_ejecutivo}</p>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Requerimientos Funcionales</p>
              <ul className="space-y-1">
                {technicalBase.requerimientos_funcionales?.map((r: any) => (
                  <li key={r.id} className="text-sm text-gray-700 flex items-center gap-2">
                    <span className="text-blue-500 font-mono text-xs">{r.id}</span>
                    <span className="flex-1">{r.descripcion}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.prioridad === 'Alta' ? 'bg-red-100 text-red-700' : r.prioridad === 'Media' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {r.prioridad}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Semáforo de Riesgos</p>
              <div className="grid grid-cols-3 gap-3">
                {['verde', 'amarillo', 'rojo'].map((color) => (
                  <div key={color} className={`rounded-lg p-3 ${color === 'verde' ? 'bg-green-50' : color === 'amarillo' ? 'bg-yellow-50' : 'bg-red-50'}`}>
                    <p className={`text-xs font-medium mb-1 ${color === 'verde' ? 'text-green-700' : color === 'amarillo' ? 'text-yellow-700' : 'text-red-700'}`}>
                      {color.charAt(0).toUpperCase() + color.slice(1)}
                    </p>
                    <ul className="space-y-1">
                      {technicalBase.semaforo_riesgos?.[color]?.map((r: string, i: number) => (
                        <li key={i} className="text-xs text-gray-700">{r}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Puntos Pendientes</p>
              <ul className="space-y-1">
                {technicalBase.puntos_pendientes?.map((p: string, i: number) => (
                  <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                    <span>⚑</span> {p}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={getSolutionDesign}
              disabled={loading}
              className="mt-2 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generando...' : 'Diseñar Solución AWS'}
            </button>
          </div>
        )}

        {/* Diseño de Solución */}
        {solutionDesign && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Diseño de Solución AWS</h2>

            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Resumen Ejecutivo</p>
              <p className="text-sm text-gray-700">{solutionDesign.resumen_ejecutivo}</p>
            </div>

            {['computo', 'almacenamiento_datos', 'networking', 'seguridad', 'observabilidad', 'iac_cicd'].map((categoria) => (
              solutionDesign.arquitectura?.[categoria]?.length > 0 && (
                <div key={categoria} className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                    {categoria.replace('_', ' ')}
                  </p>
                  <div className="space-y-2">
                    {solutionDesign.arquitectura[categoria].map((s: any, i: number) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{s.servicio}</span>
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">WAF ✓</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{s.proposito}</p>
                        <p className="text-xs text-gray-500 italic">{s.justificacion_waf}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}

            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Flujo de Datos</p>
              <p className="text-sm text-gray-700">{solutionDesign.flujo_de_datos}</p>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Alcance Técnico</p>
              <div className="grid grid-cols-3 gap-3">
                {['inclusiones', 'exclusiones', 'responsabilidades_cliente'].map((key) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-1 capitalize">{key.replace('_', ' ')}</p>
                    <ul className="space-y-1">
                      {solutionDesign.alcance_tecnico?.[key]?.map((item: string, i: number) => (
                        <li key={i} className="text-xs text-gray-700">{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Valor de Negocio</p>
              <p className="text-sm text-gray-700 mb-2">{solutionDesign.valor_de_negocio?.impacto_utilidad}</p>
              <ul className="space-y-1">
                {solutionDesign.valor_de_negocio?.capacidades_creadas?.map((c: string, i: number) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-green-500">✓</span> {c}
                  </li>
                ))}
              </ul>
            </div>
            <button
  onClick={getCalculatorJson}
  disabled={loading}
  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
>
  {loading ? 'Generando...' : 'Generar JSON Calculadora'}
</button>
          </div>
        )}

        {calculatorJson && (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
    <h2 className="text-lg font-semibold text-gray-800 mb-2">JSON Calculadora AWS</h2>
    <p className="text-xs text-gray-500 mb-4">Copia este JSON y pégalo en la extensión RPA de Chrome</p>
    
    <div className="bg-gray-900 rounded-lg p-4 mb-4 relative">
      <pre className="text-xs text-green-400 overflow-auto max-h-64">
        {JSON.stringify(calculatorJson, null, 2)}
      </pre>
      <button
        onClick={() => navigator.clipboard.writeText(JSON.stringify(calculatorJson, null, 2))}
        className="absolute top-3 right-3 bg-gray-700 text-white text-xs px-3 py-1 rounded hover:bg-gray-600"
      >
        Copiar
      </button>
    </div>

    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs font-medium text-gray-500 mb-2">SERVICIOS INCLUIDOS</p>
      <ul className="space-y-1">
        {calculatorJson.services?.map((s: any, i: number) => (
          <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
            <span className="text-orange-500">▸</span>
            <span className="font-medium">{s.name}</span>
            <span className="text-gray-400 text-xs">— {Object.keys(s.fields).length} campos</span>
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