import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { useAuth } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import { NotificationBell } from '@/components/shared/NotificationBell'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/admin/dashboard':    { title: 'Dashboard',       subtitle: 'Visão geral da plataforma' },
  '/admin/eventos':      { title: 'Eventos',          subtitle: 'Gerenciamento de eventos' },
  '/admin/corretores':   { title: 'Corretores',       subtitle: 'Cadastro e gestão de corretores' },
  '/admin/imobiliarias': { title: 'Imobiliárias',     subtitle: 'Gestão de imobiliárias parceiras' },
  '/admin/relatorios':   { title: 'Relatórios',       subtitle: 'Análise e exportação de dados' },
  '/admin/configuracoes':{ title: 'Configurações',    subtitle: 'Configurações gerais do sistema' },
}

function AdminTopbar() {
  const location = useLocation()
  const base = '/' + location.pathname.split('/').slice(1, 3).join('/')
  const page = pageTitles[base] ?? { title: 'IDIBRA', subtitle: 'Painel Administrativo' }
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 topbar-shadow">
      <div className="flex items-center justify-between px-6 h-16">
        {/* Page info */}
        <div className="pl-10 lg:pl-0">
          <h2 className="text-base font-bold text-gray-900 leading-tight">{page.title}</h2>
          <p className="text-xs text-gray-400 capitalize">{today}</p>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      </div>
    </div>
  )
}

export function AdminLayout() {
  const { role } = useAuth()

  if (role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen bg-gray-50/70 overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopbar />
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
