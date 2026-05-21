'use client'
import { useEffect, useState } from 'react'

const API_URL = 'http://localhost:8000'

const TIPO_COLORS: Record<string, string> = {
  CLOUD: 'bg-orange-100 text-orange-700',
  DATA: 'bg-blue-100 text-blue-700',
  SW: 'bg-purple-100 text-purple-700',
}

export default function CasosExitoPage() {
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ id: '', cliente: '', industria: '', tipo_propuesta: 'CLOUD', descripcion: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`${API_URL}/api/backoffice/casos-exito`)
      .then(r => r.json())
      .then(d => { setCases(d); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    await fetch(`${API_URL}/api/backoffice/casos-exito`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setShowForm(false)
    setForm({ id: '', cliente: '', industria: '', tipo_propuesta: 'CLOUD', descripcion: '' })
    load()
    setSaving(false)
  }

  const toggle = async (id: string, activo: boolean) => {
    await fetch(`${API_URL}/api/backoffice/casos-exito/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !activo })
    })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Casos de éxito</h1>
          <p className="text-sm text-gray-500 mt-0.5">{cases.filter(c => c.activo).length} activos</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
          + Nuevo caso
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-4">Nuevo caso de éxito</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">ID (ej: CASO-CLOUD-006)</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                value={form.id} onChange={e => setForm({ ...form, id: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.tipo_propuesta} onChange={e => setForm({ ...form, tipo_propuesta: e.target.value })}>
                <option value="CLOUD">Cloud</option>
                <option value="DATA">Data / IA</option>
                <option value="SW">Software</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Cliente</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Industria</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.industria} onChange={e => setForm({ ...form, industria: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
              <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 resize-none"
                value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={save} disabled={saving || !form.id || !form.cliente}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-gray-500 text-sm px-4 py-2 hover:text-gray-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 p-5">Cargando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Industria</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cases.map((c) => (
                <tr key={c.id} className={`hover:bg-gray-50 ${!c.activo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.cliente}</td>
                  <td className="px-4 py-3 text-gray-500">{c.industria}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COLORS[c.tipo_propuesta] ?? 'bg-gray-100 text-gray-600'}`}>
                      {c.tipo_propuesta}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggle(c.id, c.activo)} className="text-xs text-gray-400 hover:text-gray-700">
                      {c.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
