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

export default function BackofficeDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/api/backoffice/dashboard`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-400 text-sm">Cargando...</div>

  const totalOps = Object.values(data?.oportunidades_por_estado ?? {}).reduce((a: number, b) => a + (b as number), 0)

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-8">Resumen general del Proposal Engine</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Oportunidades totales</p>
          <p className="text-3xl font-bold text-gray-900">{totalOps as number}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Propuestas este mes</p>
          <p className="text-3xl font-bold text-gray-900">{data?.propuestas_este_mes ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">SEs activos</p>
          <p className="text-3xl font-bold text-gray-900">{data?.ses_activos?.length ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-4">Oportunidades por estado</p>
          {Object.entries(data?.oportunidades_por_estado ?? {}).length === 0 ? (
            <p className="text-sm text-gray-400">Sin datos aún</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data?.oportunidades_por_estado ?? {}).map(([estado, count]) => (
                <div key={estado} className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[estado] ?? 'bg-gray-100 text-gray-600'}`}>
                    {estado}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{count as number}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-4">SEs más activos</p>
          {data?.ses_activos?.length === 0 ? (
            <p className="text-sm text-gray-400">Sin datos aún</p>
          ) : (
            <div className="space-y-3">
              {data?.ses_activos?.map((se: any) => (
                <div key={se.nombre} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{se.nombre}</span>
                  <span className="text-xs font-medium text-gray-500">{se.oportunidades} oportunidades</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
