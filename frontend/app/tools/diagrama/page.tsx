'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FileUpload from '@/app/components/FileUpload'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function DiagramaPage() {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [feedback, setFeedback] = useState('')
  const [drawio, setDrawio] = useState<{ xml: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [showOppForm, setShowOppForm] = useState(false)
  const [oppForm, setOppForm] = useState({ cliente_nombre: '', nombre_proyecto: '' })
  const [converting, setConverting] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/opportunity/drawio`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution_design: { resumen_ejecutivo: description, descripcion_libre: description, arquitectura: { computo: [], almacenamiento_datos: [], networking: [], seguridad: [], observabilidad: [], iac_cicd: [] } } })
      })
      const data = await res.json()
      setDrawio({ xml: (data.xml ?? '').replace(/<\/mxGeometry>/g, '') })
    } catch { alert('Error al generar diagrama') }
    setLoading(false)
  }

  const refine = async () => {
    if (!feedback.trim() || !drawio) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/opportunity/drawio/refine`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_xml: drawio.xml, feedback })
      })
      const data = await res.json()
      setDrawio({ xml: (data.xml ?? '').replace(/<\/mxGeometry>/g, '') })
      setFeedback('')
    } catch { alert('Error al refinar diagrama') }
    setLoading(false)
  }

  const download = () => {
    if (!drawio) return
    const blob = new Blob([drawio.xml], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'arquitectura.drawio'
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
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
      await fetch(`${API_URL}/api/opportunity/drawio`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution_design: { descripcion_libre: description }, opportunity_id: opp.id })
      })
      router.push(`/pipeline?id=${opp.id}`)
    } catch { alert('Error al convertir') }
    setConverting(false)
  }

  useEffect(() => {
    if (!drawio) return
    const handler = (e: MessageEvent) => {
      if (typeof e.data !== 'string') return
      try {
        const msg = JSON.parse(e.data)
        if (msg.event === 'configure') {
          iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ action: 'configure', config: {} }), '*')
        }
        if (msg.event === 'init' || msg.event === 'ready') {
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ action: 'load', xml: drawio.xml, autosave: 0 }), '*'
          )
        }
      } catch {}
    }
    window.addEventListener('message', handler)
    const t = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ action: 'load', xml: drawio.xml, autosave: 0 }), '*'
      )
    }, 2000)
    return () => { window.removeEventListener('message', handler); clearTimeout(t) }
  }, [drawio])

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <a href="/" className="text-xs text-gray-400 hover:text-gray-600">← Inicio</a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-1">Diagrama de Arquitectura</h1>
        <p className="text-sm text-gray-500 mb-8">Describe tu arquitectura y genera un diagrama Draw.io con iconos AWS oficiales.</p>

        {!drawio && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Describe la arquitectura AWS</label>
            <textarea className="w-full h-48 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Describe tu arquitectura..."
              value={description} onChange={e => setDescription(e.target.value)} />
            <div className="flex items-center gap-3 mt-3">
              <button onClick={generate} disabled={loading || !description}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                {loading ? 'Generando...' : 'Generar Diagrama'}
              </button>
              <FileUpload
                existingContext={description}
                onExtracted={(text) => setDescription(prev => prev ? `${prev}\n\n${text}` : text)}
                label="Adjuntar documento"
              />
              <button onClick={() => setDescription('Una app web con usuarios que acceden vía CloudFront → ALB → ECS Fargate (2 servicios: API y workers). Base de datos RDS PostgreSQL Multi-AZ en subred privada. S3 para archivos estáticos. CloudWatch para monitoreo.')}
                className="text-xs text-gray-400 hover:text-purple-600 underline underline-offset-2">
                Cargar ejemplo
              </button>
            </div>
          </div>
        )}

        {drawio && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Diagrama</h2>
              <div className="flex gap-2">
                <button onClick={() => setDrawio(null)}
                  className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                  Nuevo diagrama
                </button>
                <button onClick={() => setShowOppForm(!showOppForm)}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                  + Convertir en oportunidad
                </button>
                <button onClick={download}
                  className="flex items-center gap-1.5 bg-purple-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700">
                  ↓ .drawio
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

            <iframe ref={iframeRef}
              src="https://embed.diagrams.net/?embed=1&proto=json&spin=1&libraries=1"
              className="w-full rounded-lg border border-gray-200"
              style={{ height: '500px' }}
            />

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Ajustar Diagrama</p>
              <textarea className="w-full h-24 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder='Ej: "Agrega un WAF antes del ALB, quita el CodePipeline"'
                value={feedback} onChange={e => setFeedback(e.target.value)} />
              <button onClick={refine} disabled={loading || !feedback.trim()}
                className="mt-3 bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                {loading ? 'Refinando...' : 'Refinar Diagrama'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
