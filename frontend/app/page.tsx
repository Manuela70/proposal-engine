'use client'

const API_URL = 'http://localhost:8000'

const TOOLS = [
  {
    href: '/pipeline',
    icon: '⬡',
    color: 'bg-blue-50 text-blue-600',
    title: 'Pipeline completo',
    description: 'Flujo de punta a punta: calificación, discovery, arquitectura, estimación y diagrama.',
    badge: 'Recomendado',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    href: '/tools/calificador',
    icon: '◎',
    color: 'bg-emerald-50 text-emerald-600',
    title: 'Calificador de oportunidades',
    description: 'Evalúa rápidamente si una oportunidad es viable, su complejidad y decisión Go / No Go.',
  },
  {
    href: '/tools/documento-tecnico',
    icon: '▤',
    color: 'bg-violet-50 text-violet-600',
    title: 'Documento técnico base',
    description: 'Genera el documento técnico con requerimientos, actores, riesgos y puntos pendientes.',
  },
  {
    href: '/tools/calculadora',
    icon: '◈',
    color: 'bg-orange-50 text-orange-600',
    title: 'Calculadora AWS',
    description: 'Genera el JSON para la extensión RPA de calculator.aws a partir del diseño de solución.',
  },
  {
    href: '/tools/diagrama',
    icon: '◫',
    color: 'bg-purple-50 text-purple-600',
    title: 'Diagrama de arquitectura',
    description: 'Genera y refina diagramas AWS en Draw.io a partir de la descripción de la solución.',
  },
  {
    href: '/tools/estimador',
    icon: '◷',
    color: 'bg-teal-50 text-teal-600',
    title: 'Estimador de proyectos',
    description: 'Estima horas, costos y duración. Descarga el plan de trabajo listo para MS Project.',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-8 py-16">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Applying Consulting</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-400">AWS Advanced Partner</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Proposal Engine</h1>
          <p className="text-gray-500 text-lg">Hola, ¿qué quieres hacer hoy?</p>
        </div>

        {/* Grid de herramientas */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {TOOLS.map((tool) => (
            <a
              key={tool.href}
              href={tool.href}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${tool.color}`}>
                  {tool.icon}
                </div>
                {tool.badge && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tool.badgeColor}`}>
                    {tool.badge}
                  </span>
                )}
              </div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1.5 group-hover:text-blue-600 transition-colors">
                {tool.title}
              </h2>
              <p className="text-xs text-gray-500 leading-relaxed">{tool.description}</p>
            </a>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
          <a href="/backoffice" className="hover:text-gray-600">Backoffice →</a>
          <span>·</span>
          <span>v1.0 — Solo para uso interno</span>
        </div>

      </div>
    </main>
  )
}
