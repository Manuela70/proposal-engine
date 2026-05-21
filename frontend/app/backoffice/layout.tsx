'use client'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/backoffice', label: 'Dashboard', icon: '▦' },
  { href: '/backoffice/oportunidades', label: 'Oportunidades', icon: '◎' },
  { href: '/backoffice/usuarios', label: 'Usuarios', icon: '◉' },
  { href: '/backoffice/casos-exito', label: 'Casos de éxito', icon: '★' },
  { href: '/backoffice/portafolio', label: 'Portafolio', icon: '◈' },
]

function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col fixed h-full">
      <div className="px-5 py-5 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Proposal Engine</p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5">Backoffice</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={`text-xs ${active ? 'text-gray-300' : 'text-gray-400'}`}>{item.icon}</span>
              {item.label}
            </a>
          )
        })}
      </nav>
      <div className="px-5 py-4 border-t border-gray-100">
        <a href="/" className="text-xs text-gray-400 hover:text-gray-600">← Volver al Pipeline</a>
      </div>
    </aside>
  )
}

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-56 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
