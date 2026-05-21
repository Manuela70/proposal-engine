'use client'
import { useEffect, useState } from 'react'

const API_URL = 'http://localhost:8000'

export default function PortafolioPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', industria: '', pais: 'CO' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`${API_URL}/api/backoffice/portafolio`)
      .then(r => r.json())
      .then(d => { setClients(d); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    await fetch(`${API_URL}/api/backoffice/portafolio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setShowForm(false)
    setForm({ nombre: '', industria: '', pais: 'CO' })
    load()
    setSaving(false)
  }

  const toggle = async (id: string, activo: boolean) => {
    await fetch(`${API_URL}/api/backoffice/portafolio/${id}`, {
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
          <h1 className="text-xl font-semibold text-gray-900">Portafolio de clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.filter(c => c.activo).length} activos</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
          + Nuevo cliente
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-4">Nuevo cliente</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Industria</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.industria} onChange={e => setForm({ ...form, industria: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">País</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.pais} onChange={e => setForm({ ...form, pais: e.target.value })}>
                <option value="CO">Colombia</option>
                <option value="PE">Perú</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={save} disabled={saving || !form.nombre}
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
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Industria</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">País</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map((c) => (
                <tr key={c.id} className={`hover:bg-gray-50 ${!c.activo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{c.industria ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.pais === 'CO' ? '🇨🇴 Colombia' : c.pais === 'PE' ? '🇵🇪 Perú' : c.pais ?? '—'}
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
