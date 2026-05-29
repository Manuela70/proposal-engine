'use client'
import { useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function DocumentoTecnicoPage() {
  const [context, setContext] = useState('')
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/opportunity/technical-base`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crm_context: context, discovery_notes: notes })
      })
      setResult(await res.json())
    } catch { alert('Error al generar documento') }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="text-xs text-gray-400 hover:text-gray-600">← Inicio</a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-1">Documento Técnico Base</h1>
        <p className="text-sm text-gray-500 mb-8">Genera requerimientos, actores, riesgos y puntos pendientes.</p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contexto del CRM</label>
            <textarea className="w-full h-32 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Notas del CRM sobre la oportunidad..."
              value={context} onChange={e => setContext(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notas de la reunión de discovery</label>
            <textarea className="w-full h-32 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Lo que dijo el cliente en la reunión..."
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <button onClick={generate} disabled={loading || !context || !notes}
            className="bg-violet-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
            {loading ? 'Generando...' : 'Generar Documento'}
          </button>
        </div>

        {result && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Resumen Ejecutivo</p>
              <p className="text-sm text-gray-700">{result.resumen_ejecutivo}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Requerimientos Funcionales</p>
              <ul className="space-y-1">
                {result.requerimientos_funcionales?.map((r: any) => (
                  <li key={r.id} className="text-sm text-gray-700 flex items-center gap-2">
                    <span className="text-violet-500 font-mono text-xs">{r.id}</span>
                    <span className="flex-1">{r.descripcion}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.prioridad === 'Alta' ? 'bg-red-100 text-red-700' : r.prioridad === 'Media' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {r.prioridad}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Semáforo de Riesgos</p>
              <div className="grid grid-cols-3 gap-3">
                {['verde', 'amarillo', 'rojo'].map((color) => (
                  <div key={color} className={`rounded-lg p-3 ${color === 'verde' ? 'bg-green-50' : color === 'amarillo' ? 'bg-yellow-50' : 'bg-red-50'}`}>
                    <p className={`text-xs font-medium mb-1 ${color === 'verde' ? 'text-green-700' : color === 'amarillo' ? 'text-yellow-700' : 'text-red-700'}`}>
                      {color.charAt(0).toUpperCase() + color.slice(1)}
                    </p>
                    <ul className="space-y-1">
                      {result.semaforo_riesgos?.[color]?.map((r: string, i: number) => (
                        <li key={i} className="text-xs text-gray-700">{r}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Puntos Pendientes</p>
              <ul className="space-y-1">
                {result.puntos_pendientes?.map((p: string, i: number) => (
                  <li key={i} className="text-sm text-red-700 flex items-start gap-2"><span>⚑</span> {p}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
