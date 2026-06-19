import { Suspense, useState, useRef } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { CorretorSidebar } from '@/components/corretor/CorretorSidebar'
import { useAuth } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { RouteFallback } from '@/components/shared/RouteFallback'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/portal/home':         { title: 'Início',        subtitle: 'Bem-vindo ao portal IDIBRA'         },
  '/portal/eventos':      { title: 'Eventos',       subtitle: 'Eventos disponíveis para inscrição' },
  '/portal/treinamentos': { title: 'Treinamentos',  subtitle: 'Suas capacitações'                  },
  '/portal/inscricoes':   { title: 'Inscrições',    subtitle: 'Seus eventos inscritos'             },
  '/portal/historico':    { title: 'Histórico',     subtitle: 'Histórico de participações'         },
  '/portal/perfil':       { title: 'Meu Perfil',    subtitle: 'Suas informações profissionais'     },
}

function CorretorTopbar({ hidden, onMenu }: { hidden: boolean; onMenu: () => void }) {
  const location = useLocation()
  const base = '/' + location.pathname.split('/').slice(1, 3).join('/')
  const page = pageTitles[base] ?? { title: 'Portal', subtitle: 'Portal de Corretores IDIBRA' }
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

  return (
    <div
      className={`sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 topbar-shadow transition-transform duration-300 ${hidden ? '-translate-y-full' : 'translate-y-0'} lg:translate-y-0`}
    >
      <div className="flex items-center justify-between px-4 sm:px-6 h-16">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onMenu} aria-label="Abrir menu" className="lg:hidden p-2 -ml-1 text-gray-700 hover:bg-gray-100 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 leading-tight truncate">{page.title}</h2>
            <p className="text-xs text-gray-400 capitalize hidden sm:block">{today}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      </div>
    </div>
  )
}

export function CorretorLayout() {
  const { role } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)

  if (role !== 'corretor') {
    return <Navigate to="/login" replace />
  }

  const onScroll = (e: React.UIEvent<HTMLElement>) => {
    const y = e.currentTarget.scrollTop
    const last = lastY.current
    if (y > last && y > 80) setHidden(true)
    else if (y < last - 4) setHidden(false)
    lastY.current = y
  }

  return (
    <div className="flex h-screen bg-gray-50/70 overflow-hidden">
      <CorretorSidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main onScroll={onScroll} className="flex-1 overflow-y-auto">
          <CorretorTopbar hidden={hidden} onMenu={() => setMenuOpen(true)} />
          <div key={location.pathname} className="p-5 lg:p-7 page-enter">
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  )
}
