import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { useAuth } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import { Bell, Search } from 'lucide-react'

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
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              placeholder="Buscar..."
              className="pl-9 pr-4 h-9 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 w-44 transition-all"
            />
          </div>
          <button className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
            <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
          </button>
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
