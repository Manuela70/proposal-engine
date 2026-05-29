'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import FileUpload from '@/app/components/FileUpload'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const PIPELINE_ORDER = ['qualify', 'discovery', 'technical_base', 'solution_design', 'calculator', 'estimation', 'drawio']

function getDownstream(agente: string): string[] {
  const idx = PIPELINE_ORDER.indexOf(agente)
  return idx >= 0 ? PIPELINE_ORDER.slice(idx + 1) : []
}

export default function PipelinePage() {
  const searchParams = useSearchParams()

  // ── Oportunidad ────────────────────────────────────────────────────────────
  const [opportunityId, setOpportunityId] = useState<string | null>(null)
  const [opportunityInfo, setOpportunityInfo] = useState<any>(null)
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [oppMode, setOppMode] = useState<'none' | 'new' | 'load'>('none')
  const [newOppForm, setNewOppForm] = useState({ nombre_proyecto: '', cliente_nombre: '' })
  const [oppLoading, setOppLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // ── Contexto ───────────────────────────────────────────────────────────────
  const [context, setContext] = useState('')
  const [contextEditing, setContextEditing] = useState(false)
  const [contextChanged, setContextChanged] = useState(false)

  // ── Pipeline ───────────────────────────────────────────────────────────────
  const [qualification, setQualification] = useState<any>(null)
  const [discovery, setDiscovery] = useState<any>(null)
  const [technicalBase, setTechnicalBase] = useState<any>(null)
  const [solutionDesign, setSolutionDesign] = useState<any>(null)
  const [calculatorJson, setCalculatorJson] = useState<any>(null)
  const [estimation, setEstimation] = useState<any>(null)
  const [estimationFeedback, setEstimationFeedback] = useState('')
  const [drawio, setDrawio] = useState<{ xml: string } | null>(null)
  const [drawioFeedback, setDrawioFeedback] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [discoveryNotes, setDiscoveryNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'idle' | 'qualified' | 'discovery'>('idle')

  // ── Estado de confirmación y desactualización ──────────────────────────────
  const [stale, setStale] = useState<Set<string>>(new Set())
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())

  const confirmAgent = (agente: string) => setConfirmed(prev => new Set([...prev, agente]))

  const markStale = (from: string) => {
    const downstream = getDownstream(from)
    setStale(prev => new Set([...prev, ...downstream]))
    setConfirmed(prev => { const n = new Set(prev); downstream.forEach(a => n.delete(a)); return n })
  }

  const markFresh = (agente: string) => {
    setStale(prev => { const n = new Set(prev); n.delete(agente); return n })
  }

  // ── Auto-cargar desde query param ?id= ────────────────────────────────────────────
  useEffect(() => {
    const id = searchParams.get('id')
    if (id) loadOpportunity(id)
  }, [])

  // ── Oportunidades ──────────────────────────────────────────────────────────
  const fetchOpportunities = async () => {
    const data = await fetch(`${API_URL}/api/backoffice/oportunidades`).then(r => r.json())
    setOpportunities(data)
  }

  const createOpportunity = async () => {
    if (!newOppForm.nombre_proyecto || !newOppForm.cliente_nombre) return
    setOppLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/backoffice/oportunidades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newOppForm, crm_context: context || null })
      })
      const data = await res.json()
      setOpportunityId(data.id)
      setOpportunityInfo(newOppForm)
      setOppMode('none')
      setNewOppForm({ nombre_proyecto: '', cliente_nombre: '' })
      setIsLoaded(false)
    } catch { alert('Error al crear oportunidad') }
    setOppLoading(false)
  }

  const hydrateFromOutputs = (agent_outputs: any[]) => {
    const active = agent_outputs.filter((a: any) => a.es_activo)
    const loadedAgentes: string[] = []
    for (const out of active) {
      try {
        if (!out.output) continue
        const parsed = out.agente === 'drawio' ? out.output : JSON.parse(out.output)
        if (out.agente === 'qualify') { setQualification(parsed); setStep('qualified') }
        if (out.agente === 'discovery') { setDiscovery(parsed); setStep('discovery') }
        if (out.agente === 'technical_base') {
          setTechnicalBase(parsed)
          const notes = out.input_snapshot?.discovery_notes
          if (notes) setDiscoveryNotes(notes)
        }
        if (out.agente === 'solution_design') setSolutionDesign(parsed)
        if (out.agente === 'calculator') setCalculatorJson(parsed)
        if (out.agente === 'estimation') setEstimation(parsed)
        if (out.agente === 'drawio') setDrawio({ xml: (out.output ?? '').replace(/<\/mxGeometry>/g, '') })
        loadedAgentes.push(out.agente)
      } catch {}
    }
    setConfirmed(new Set(loadedAgentes))
  }

  const loadOpportunity = async (id: string) => {
    setOppLoading(true)
    try {
      const data = await fetch(`${API_URL}/api/backoffice/oportunidades/${id}`).then(r => r.json())
      setOpportunityId(id)
      setOpportunityInfo({ nombre_proyecto: data.nombre_proyecto, cliente_nombre: data.cliente_nombre })
      if (data.crm_context) setContext(data.crm_context)
      hydrateFromOutputs(data.agent_outputs ?? [])
      setOppMode('none')
      setIsLoaded(true)
    } catch { alert('Error al cargar oportunidad') }
    setOppLoading(false)
  }

  const saveContext = async () => {
    if (!opportunityId) return
    await fetch(`${API_URL}/api/backoffice/oportunidades/${opportunityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crm_context: context })
    })
    setContextEditing(false)
    setContextChanged(true)
    markStale('qualify')
    setTimeout(() => setContextChanged(false), 3000)
  }

  const resetPipeline = () => {
    setOpportunityId(null); setOpportunityInfo(null); setContext('')
    setQualification(null); setDiscovery(null); setTechnicalBase(null)
    setSolutionDesign(null); setCalculatorJson(null); setEstimation(null)
    setDrawio(null); setDiscoveryNotes(''); setStep('idle')
    setStale(new Set()); setConfirmed(new Set())
    setIsLoaded(false); setContextEditing(false)
  }

  // ── Agentes ────────────────────────────────────────────────────────────────
  const qualify = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/opportunity/qualify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crm_context: context, opportunity_id: opportunityId })
      })
      const data = await res.json()
      setQualification(data); setStep('qualified')
      markFresh('qualify'); markStale('qualify')
      if (opportunityId && context) {
        fetch(`${API_URL}/api/backoffice/oportunidades/${opportunityId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ crm_context: context })
        })
      }
    } catch { alert('Error al calificar la oportunidad') }
    setLoading(false)
  }

  const getDiscovery = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/opportunity/discovery`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crm_context: context, opportunity_id: opportunityId })
      })
      const data = await res.json()
      setDiscovery(data); setStep('discovery')
      markFresh('discovery'); markStale('discovery')
    } catch { alert('Error al generar preguntas') }
    setLoading(false)
  }

  const getTechnicalBase = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/opportunity/technical-base`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crm_context: context, discovery_notes: discoveryNotes, opportunity_id: opportunityId })
      })
      const data = await res.json()
      setTechnicalBase(data)
      markFresh('technical_base'); markStale('technical_base')
    } catch { alert('Error al generar documento técnico') }
    setLoading(false)
  }

  const getSolutionDesign = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/opportunity/solution-design`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technical_base: technicalBase, opportunity_id: opportunityId })
      })
      const data = await res.json()
      setSolutionDesign(data)
      markFresh('solution_design'); markStale('solution_design')
    } catch { alert('Error al generar diseño de solución') }
    setLoading(false)
  }

  const getCalculatorJson = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/opportunity/calculator`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution_design: solutionDesign, opportunity_id: opportunityId })
      })
      const data = await res.json()
      setCalculatorJson(data); markFresh('calculator')
    } catch { alert('Error al generar JSON de calculadora') }
    setLoading(false)
  }

  const getEstimation = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/opportunity/estimation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution_design: solutionDesign, technical_base: technicalBase, opportunity_id: opportunityId })
      })
      const data = await res.json()
      setEstimation(data); markFresh('estimation')
    } catch { alert('Error al generar estimación') }
    setLoading(false)
  }

  const refineEstimation = async () => {
    if (!estimationFeedback.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/opportunity/estimation/refine`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_estimation: estimation, feedback: estimationFeedback, opportunity_id: opportunityId })
      })
      const data = await res.json()
      setEstimation(data); setEstimationFeedback('')
    } catch { alert('Error al refinar estimación') }
    setLoading(false)
  }

  const downloadEstimation = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/opportunity/estimation/export`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estimation)
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${estimation.project_name || 'estimacion'}_plan.xlsx`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { alert('Error al descargar el plan') }
    setLoading(false)
  }

  const getDrawio = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/opportunity/drawio`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution_design: solutionDesign, opportunity_id: opportunityId })
      })
      if (!res.ok) throw new Error('Error del servidor')
      const data = await res.json()
      setDrawio({ xml: (data.xml ?? '').replace(/<\/mxGeometry>/g, '') })
      markFresh('drawio')
    } catch { alert('Error al generar diagrama') }
    setLoading(false)
  }

  const refineDrawio = async () => {
    if (!drawioFeedback.trim() || !drawio) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/opportunity/drawio/refine`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_xml: drawio.xml, feedback: drawioFeedback, opportunity_id: opportunityId })
      })
      const data = await res.json()
      setDrawio({ xml: (data.xml ?? '').replace(/<\/mxGeometry>/g, '') })
      setDrawioFeedback('')
    } catch { alert('Error al refinar diagrama') }
    setLoading(false)
  }

  const downloadDrawio = () => {
    if (!drawio) return
    const blob = new Blob([drawio.xml], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'arquitectura.drawio'
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
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

  // ── Componentes UI ─────────────────────────────────────────────────────────
  const Stalebadge = ({ agente }: { agente: string }) =>
    stale.has(agente) ? (
      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">⚠ Desactualizado</span>
    ) : null

  const CardActions = ({ agente, updateLabel, onUpdate }: { agente: string; updateLabel: string; onUpdate: () => void }) => {
    const isConfirmed = confirmed.has(agente)
    const isStale = stale.has(agente)
    return (
      <div className="flex items-center gap-2">
        {isStale && <Stalebadge agente={agente} />}
        {(!isConfirmed || isStale) && (
          <button onClick={onUpdate} disabled={loading}
            className="text-xs border border-gray-300 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            {loading ? '...' : `↺ ${updateLabel}`}
          </button>
        )}
        {!isConfirmed && !isStale && (
          <button onClick={() => confirmAgent(agente)}
            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium">
            Confirmar ✓
          </button>
        )}
        {isConfirmed && !isStale && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Confirmado</span>
        )}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <a href="/" className="text-xs text-gray-400 hover:text-gray-600">← Inicio</a>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Pipeline completo</h1>
            <p className="text-gray-500 text-sm">Calificación → Discovery → Arquitectura → Estimación → Diagrama</p>
          </div>
          <a href="/backoffice" className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg">
            Backoffice →
          </a>
        </div>

        {/* Panel de oportunidad */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          {opportunityInfo ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Oportunidad activa</p>
                <p className="font-semibold text-gray-900">{opportunityInfo.cliente_nombre}</p>
                <p className="text-xs text-gray-500">{opportunityInfo.nombre_proyecto}</p>
              </div>
              <button onClick={resetPipeline} className="text-xs text-gray-400 hover:text-red-500">
                Cambiar oportunidad
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700 mb-4">¿Con qué oportunidad vas a trabajar?</p>
              {oppMode === 'none' && (
                <div className="flex gap-3">
                  <button onClick={() => setOppMode('new')}
                    className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
                    + Nueva oportunidad
                  </button>
                  <button onClick={() => { setOppMode('load'); fetchOpportunities() }}
                    className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                    Cargar existente
                  </button>
                </div>
              )}
              {oppMode === 'new' && (
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Cliente</label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="Banco Regional Andino"
                        value={newOppForm.cliente_nombre}
                        onChange={e => setNewOppForm({ ...newOppForm, cliente_nombre: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Nombre del proyecto</label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="Migración Cloud EKS"
                        value={newOppForm.nombre_proyecto}
                        onChange={e => setNewOppForm({ ...newOppForm, nombre_proyecto: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={createOpportunity}
                      disabled={oppLoading || !newOppForm.cliente_nombre || !newOppForm.nombre_proyecto}
                      className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                      {oppLoading ? 'Creando...' : 'Crear y continuar'}
                    </button>
                    <button onClick={() => setOppMode('none')} className="text-gray-500 text-sm px-4 py-2">Cancelar</button>
                  </div>
                </div>
              )}
              {oppMode === 'load' && (
                <div>
                  {opportunities.length === 0 ? (
                    <p className="text-sm text-gray-400">No hay oportunidades guardadas aún.</p>
                  ) : (
                    <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                      {opportunities.map((o: any) => (
                        <button key={o.id} onClick={() => loadOpportunity(o.id)} disabled={oppLoading}
                          className="w-full text-left border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50 disabled:opacity-50">
                          <p className="font-medium text-gray-900 text-sm">{o.cliente_nombre}</p>
                          <p className="text-xs text-gray-400">{o.nombre_proyecto} · {o.estado}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setOppMode('none')} className="text-gray-500 text-sm">Cancelar</button>
                </div>
              )}
            </>
          )}
        </div>

        {opportunityInfo && (
          <>
            {/* Modo nueva oportunidad: CRM context */}
            {!isLoaded && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Contexto del CRM</label>
                <textarea
                  className="w-full h-40 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Pega aquí las notas del CRM sobre la oportunidad..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
                <button onClick={qualify} disabled={loading || !context}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Procesando...' : 'Calificar Oportunidad'}
                </button>
                <div className="mt-3">
                  <FileUpload
                    existingContext={context}
                    onExtracted={(text) => setContext(prev => prev ? `${prev}\n\n${text}` : text)}
                    label="Adjuntar documento"
                  />
                </div>
              </div>
            )}

            {/* Modo cargado: card de contexto colapsado */}
            {isLoaded && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Contexto del cliente</p>
                    {contextChanged && <p className="text-xs text-green-600 mt-0.5">✓ Guardado — agentes marcados como desactualizados</p>}
                  </div>
                  {!contextEditing && (
                    <button onClick={() => setContextEditing(true)}
                      className="text-xs border border-yellow-300 text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-lg hover:bg-yellow-100">
                      ¿Hubo cambios en el contexto?
                    </button>
                  )}
                </div>
                {contextEditing ? (
                  <>
                    {context && (
                      <div className="mb-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-medium text-gray-400 mb-1">Contexto anterior</p>
                        <p className="text-xs text-gray-500 line-clamp-4">{context}</p>
                      </div>
                    )}
                    <textarea
                      className="w-full h-40 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe los cambios en el contexto del cliente..."
                      onChange={(e) => setContext(e.target.value)}
                    />
                    <div className="flex gap-3 mt-3">
                      <button onClick={saveContext} disabled={!context}
                        className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                        Guardar cambios
                      </button>
                      <FileUpload
                        existingContext={context}
                        onExtracted={(text) => setContext(prev => prev ? `${prev}\n\n${text}` : text)}
                        label="Adjuntar documento"
                      />
                      <button onClick={() => setContextEditing(false)} className="text-gray-500 text-sm px-4 py-2">Cancelar</button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-400 mb-1">Contexto CRM</p>
                      <p className="text-sm text-gray-500 line-clamp-3">{context || 'Sin contexto guardado'}</p>
                    </div>
                    {discoveryNotes && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 mb-1">Notas de reunión</p>
                        <p className="text-sm text-gray-500 line-clamp-3">{discoveryNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Calificación */}
            {qualification && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Calificación Técnica</h2>
                  <CardActions agente="qualify" updateLabel="Recalificar" onUpdate={qualify} />
                </div>
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
                <ul className="space-y-1 mb-4">
                  {qualification.riesgos?.map((r: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-yellow-500 mt-0.5">⚠</span> {r}
                    </li>
                  ))}
                </ul>
                {qualification.decision !== 'No Go' && !discovery && (
                  <button onClick={getDiscovery} disabled={loading}
                    className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                    {loading ? 'Generando...' : 'Generar Preguntas de Discovery'}
                  </button>
                )}
              </div>
            )}

            {/* Discovery */}
            {discovery && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Preguntas de Discovery</h2>
                  <CardActions agente="discovery" updateLabel="Regenerar" onUpdate={getDiscovery} />
                </div>
                {['preguntas_funcionales', 'preguntas_tecnicas', 'preguntas_arquitectura'].map((key) => (
                  <div key={key} className="mb-4">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">{key.replace('preguntas_', '').replace('_', ' ')}</p>
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

            {/* Notas de discovery — solo si no hay technical_base aún */}
            {step === 'discovery' && !technicalBase && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notas de la Reunión de Discovery</label>
                <textarea
                  className="w-full h-40 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Pega aquí las notas de lo que dijo el cliente en la reunión..."
                  value={discoveryNotes}
                  onChange={(e) => setDiscoveryNotes(e.target.value)}
                />
                <button onClick={getTechnicalBase} disabled={loading || !discoveryNotes}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Generando...' : 'Generar Documento Técnico Base'}
                </button>
              </div>
            )}

            {/* Documento Técnico Base */}
            {technicalBase && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Documento Técnico Base</h2>
                  <CardActions agente="technical_base" updateLabel="Actualizar" onUpdate={getTechnicalBase} />
                </div>
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
                      <li key={i} className="text-sm text-red-700 flex items-start gap-2"><span>⚑</span> {p}</li>
                    ))}
                  </ul>
                </div>
                {!solutionDesign && (
                  <button onClick={getSolutionDesign} disabled={loading}
                    className="mt-2 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {loading ? 'Generando...' : 'Diseñar Solución AWS'}
                  </button>
                )}
              </div>
            )}

            {/* Diseño de Solución */}
            {solutionDesign && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Diseño de Solución AWS</h2>
                  <CardActions agente="solution_design" updateLabel="Actualizar" onUpdate={getSolutionDesign} />
                </div>
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Resumen Ejecutivo</p>
                  <p className="text-sm text-gray-700">{solutionDesign.resumen_ejecutivo}</p>
                </div>
                {['computo', 'almacenamiento_datos', 'networking', 'seguridad', 'observabilidad', 'iac_cicd'].map((categoria) => (
                  solutionDesign.arquitectura?.[categoria]?.length > 0 && (
                    <div key={categoria} className="mb-4">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">{categoria.replace('_', ' ')}</p>
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
                <div className="mb-6">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Valor de Negocio</p>
                  <p className="text-sm text-gray-700 mb-2">{solutionDesign.valor_de_negocio?.impacto_utilidad}</p>
                  <ul className="space-y-1">
                    {solutionDesign.valor_de_negocio?.capacidades_creadas?.map((c: string, i: number) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><span className="text-green-500">✓</span> {c}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-3">
                  <button onClick={getCalculatorJson} disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {loading ? 'Generando...' : 'Generar JSON Calculadora'}
                  </button>
                  <button onClick={getEstimation} disabled={loading}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                    {loading ? 'Generando...' : 'Generar Estimación'}
                  </button>
                  <button onClick={getDrawio} disabled={loading}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                    {loading ? 'Generando...' : 'Generar Diagrama'}
                  </button>
                </div>
              </div>
            )}

            {/* Calculadora */}
            {calculatorJson && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">JSON Calculadora AWS</h2>
                    <p className="text-xs text-gray-500">Copia este JSON y pégalo en la extensión RPA de Chrome</p>
                  </div>
                  <CardActions agente="calculator" updateLabel="Actualizar" onUpdate={getCalculatorJson} />
                </div>
                <div className="bg-gray-900 rounded-lg p-4 mb-4 relative">
                  <pre className="text-xs text-green-400 overflow-auto max-h-64">{JSON.stringify(calculatorJson, null, 2)}</pre>
                  <button onClick={() => navigator.clipboard.writeText(JSON.stringify(calculatorJson, null, 2))}
                    className="absolute top-3 right-3 bg-gray-700 text-white text-xs px-3 py-1 rounded hover:bg-gray-600">
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

            {/* Estimación */}
            {estimation && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Estimación de Proyecto</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{estimation.project_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CardActions agente="estimation" updateLabel="Actualizar" onUpdate={getEstimation} />
                    <button onClick={downloadEstimation} disabled={loading}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                      <span>↓</span> Descargar .xlsx
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-emerald-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{estimation.resumen_economico?.horas_totales_applying}h</p>
                    <p className="text-xs text-emerald-600 mt-1">Horas Applying</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">${estimation.resumen_economico?.costo_total_usd?.toLocaleString()}</p>
                    <p className="text-xs text-blue-600 mt-1">Costo Total USD</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-700">{estimation.duracion_estimada_semanas} sem</p>
                    <p className="text-xs text-gray-500 mt-1">Duración estimada</p>
                  </div>
                </div>
                <div className="mb-6">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-3">Desglose por Rol</p>
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Rol</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Horas</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Tarifa/h</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {estimation.resumen_economico?.desglose_por_rol?.map((r: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-gray-900 font-medium">{r.rol}</td>
                            <td className="px-4 py-2.5 text-gray-600 text-right">{r.horas}h</td>
                            <td className="px-4 py-2.5 text-gray-600 text-right">${r.tarifa_hora}/h</td>
                            <td className="px-4 py-2.5 text-gray-900 font-semibold text-right">${r.subtotal_usd?.toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-4 py-2.5 text-gray-900">Total</td>
                          <td className="px-4 py-2.5 text-gray-900 text-right">{estimation.resumen_economico?.horas_totales_applying}h</td>
                          <td className="px-4 py-2.5"></td>
                          <td className="px-4 py-2.5 text-emerald-700 text-right">${estimation.resumen_economico?.costo_total_usd?.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-5">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Ajustar Estimación</p>
                  <textarea
                    className="w-full h-24 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder='Ej: "Quita la migración de BD, agrega 16h al arquitecto en pruebas"'
                    value={estimationFeedback}
                    onChange={(e) => setEstimationFeedback(e.target.value)}
                  />
                  <button onClick={refineEstimation} disabled={loading || !estimationFeedback.trim()}
                    className="mt-3 bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                    {loading ? 'Refinando...' : 'Refinar Estimación'}
                  </button>
                </div>
              </div>
            )}

            {/* Diagrama */}
            {drawio && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Diagrama de Arquitectura</h2>
                  <div className="flex items-center gap-2">
                    <CardActions agente="drawio" updateLabel="Actualizar" onUpdate={getDrawio} />
                    <button onClick={downloadDrawio}
                      className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700">
                      <span>↓</span> Descargar .drawio
                    </button>
                  </div>
                </div>
                <iframe ref={iframeRef}
                  src="https://embed.diagrams.net/?embed=1&proto=json&spin=1&libraries=1"
                  className="w-full rounded-lg border border-gray-200"
                  style={{ height: '500px' }}
                />
                <div className="border-t border-gray-100 pt-5 mt-5">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Ajustar Diagrama</p>
                  <textarea
                    className="w-full h-24 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder='Ej: "Agrega un WAF antes del ALB, quita el CodePipeline"'
                    value={drawioFeedback}
                    onChange={(e) => setDrawioFeedback(e.target.value)}
                  />
                  <button onClick={refineDrawio} disabled={loading || !drawioFeedback.trim()}
                    className="mt-3 bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                    {loading ? 'Refinando...' : 'Refinar Diagrama'}
                  </button>
                </div>
              </div>
            )}

            {/* Oportunidad cargada sin outputs — mostrar CRM input */}
            {isLoaded && !qualification && !technicalBase && !solutionDesign && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Contexto del CRM</label>
                <textarea
                  className="w-full h-40 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Pega aquí las notas del CRM sobre la oportunidad..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
                <button onClick={qualify} disabled={loading || !context}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Procesando...' : 'Calificar Oportunidad'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
