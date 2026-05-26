import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { CorretorSidebar } from '@/components/corretor/CorretorSidebar'
import { useAuth } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import { NotificationBell } from '@/components/shared/NotificationBell'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/portal/home':       { title: 'Início',      subtitle: 'Bem-vindo ao portal IDIBRA'           },
  '/portal/eventos':    { title: 'Eventos',     subtitle: 'Eventos disponíveis para inscrição'   },
  '/portal/inscricoes': { title: 'Inscrições',  subtitle: 'Seus eventos inscritos'               },
  '/portal/historico':  { title: 'Histórico',   subtitle: 'Histórico de participações'           },
  '/portal/perfil':     { title: 'Meu Perfil',  subtitle: 'Suas informações profissionais'       },
}

function CorretorTopbar() {
  const location = useLocation()
  const base = '/' + location.pathname.split('/').slice(1, 3).join('/')
  const page = pageTitles[base] ?? { title: 'Portal', subtitle: 'Portal de Corretores IDIBRA' }
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 topbar-shadow">
      <div className="flex items-center justify-between px-6 h-16">
        <div className="pl-10 lg:pl-0">
          <h2 className="text-base font-bold text-gray-900 leading-tight">{page.title}</h2>
          <p className="text-xs text-gray-400 capitalize">{today}</p>
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

  if (role !== 'corretor') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen bg-gray-50/70 overflow-hidden">
      <CorretorSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <CorretorTopbar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-5 lg:p-7 page-enter">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  )
}
