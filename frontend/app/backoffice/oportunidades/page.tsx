'use client'
import { useEffect, useState } from 'react'

const API_URL = 'http://localhost:8000'

const ESTADO_COLORS: Record<string, string> = {
  NUEVO: 'bg-blue-100 text-blue-700',
  EN_PROGRESO: 'bg-yellow-100 text-yellow-700',
  PROPUESTA_GENERADA: 'bg-purple-100 text-purple-700',
  ENVIADA: 'bg-orange-100 text-orange-700',
  GANADA: 'bg-green-100 text-green-700',
  PERDIDA: 'bg-red-100 text-red-700',
}

const AGENTES = ['qualify', 'discovery', 'technical_base', 'solution_design', 'calculator', 'estimation', 'drawio']

export default function OportunidadesPage() {
  const [opps, setOpps] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`${API_URL}/api/backoffice/oportunidades`)
      .then(r => r.json())
      .then(d => { setOpps(d); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const openDetail = async (id: string) => {
    setDetailLoading(true)
    const data = await fetch(`${API_URL}/api/backoffice/oportunidades/${id}`).then(r => r.json())
    setSelected(data)
    setDetailLoading(false)
  }

  const updateEstado = async (id: string, estado: string) => {
    await fetch(`${API_URL}/api/backoffice/oportunidades/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado })
    })
    load()
    openDetail(id)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Oportunidades</h1>
            <p className="text-sm text-gray-500 mt-0.5">{opps.length} en total</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <p className="text-sm text-gray-400 p-5">Cargando...</p>
          ) : opps.length === 0 ? (
            <p className="text-sm text-gray-400 p-5">Sin oportunidades aún. Crea una desde el pipeline.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cliente / Proyecto</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">SE</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Actualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {opps.map((o) => (
                  <tr key={o.id} onClick={() => openDetail(o.id)}
                    className={`hover:bg-gray-50 cursor-pointer ${selected?.id === o.id ? 'bg-gray-50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{o.cliente_nombre}</p>
                      <p className="text-xs text-gray-400">{o.nombre_proyecto}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{o.tipo_proyecto ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{o.se?.nombre ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[o.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                        {o.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(o.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <div className="w-80 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-0">
            {detailLoading ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">{selected.cliente_nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{selected.nombre_proyecto}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
                </div>

                <div className="mb-4 flex items-center gap-2">
                  <p className="text-xs text-gray-400 font-mono truncate flex-1">{selected.id}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(selected.id)}
                    className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 px-2 py-0.5 rounded flex-shrink-0">
                    Copiar ID
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1.5">Estado</p>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                    value={selected.estado} onChange={e => updateEstado(selected.id, e.target.value)}>
                    {Object.keys(ESTADO_COLORS).map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>

                <div className="mb-4 text-xs text-gray-500 space-y-1">
                  <p><span className="font-medium">SE:</span> {selected.se?.nombre ?? '—'}</p>
                  <p><span className="font-medium">AM:</span> {selected.am?.nombre ?? '—'}</p>
                  <p><span className="font-medium">Tipo:</span> {selected.tipo_proyecto ?? '—'}</p>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Agentes ejecutados</p>
                  <div className="space-y-1">
                    {AGENTES.map(agente => {
                      const outputs = selected.agent_outputs?.filter((a: any) => a.agente === agente) ?? []
                      const active = outputs.find((a: any) => a.es_activo)
                      return (
                        <div key={agente} className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 capitalize">{agente.replace('_', ' ')}</span>
                          {active ? (
                            <span className="text-xs text-green-600 font-medium">v{active.version} ✓</span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {selected.proposals?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Propuestas generadas</p>
                    <div className="space-y-1.5">
                      {selected.proposals.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">v{p.version}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            p.review_status === 'APROBADA' ? 'bg-green-100 text-green-700' :
                            p.review_status === 'CON_OBSERVACIONES' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>{p.review_status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
