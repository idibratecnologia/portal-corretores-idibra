import { NavLink, useNavigate } from 'react-router-dom'
import idibraLogo from '@/assets/idibra_logo.png'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Building2,
  BarChart3,
  Bell,
  Megaphone,
  Settings,
  ShieldCheck,
  ScrollText,
  LogOut,
  ChevronRight,
  UserCheck,
  GraduationCap,
  Palette,
  Inbox,
  Cake,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { fetchCorretores } from '@/services/corretores'

const navGroups = [
  {
    label: 'Principal',
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/eventos', icon: Calendar, label: 'Eventos' },
      { to: '/admin/treinamentos', icon: GraduationCap, label: 'Treinamentos' },
      { to: '/admin/modelos', icon: Palette, label: 'Modelos Visuais' },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { to: '/admin/corretores', icon: Users, label: 'Corretores' },
      { to: '/admin/aprovacoes', icon: UserCheck, label: 'Aprovações' },
      { to: '/admin/imobiliarias', icon: Building2, label: 'Imobiliárias' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/admin/relatorios', icon: BarChart3, label: 'Relatórios' },
      { to: '/admin/notificacoes', icon: Bell, label: 'Notificações' },
      { to: '/admin/disparos', icon: Megaphone, label: 'Disparos' },
      { to: '/admin/comunicacoes', icon: Inbox, label: 'Comunicações' },
      { to: '/admin/aniversariantes', icon: Cake, label: 'Aniversariantes' },
      { to: '/admin/usuarios', icon: ShieldCheck, label: 'Usuários', superOnly: true },
      { to: '/admin/logs', icon: ScrollText, label: 'Logs', superOnly: true },
      { to: '/admin/configuracoes', icon: Settings, label: 'Configurações' },
    ],
  },
]

/** Evento global para sincronizar o contador de pendentes entre telas. */
export const PENDING_CHANGED_EVENT = 'idibra:pending-changed'

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { logout, adminUser } = useAuth()
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)

  const loadPending = useCallback(async () => {
    try {
      const res = await fetchCorretores({ status: 'pendente', limit: 1 })
      setPendingCount(res.meta.total)
    } catch {
      setPendingCount(0)
    }
  }, [])

  useEffect(() => {
    loadPending()
    window.addEventListener(PENDING_CHANGED_EVENT, loadPending)
    return () => window.removeEventListener(PENDING_CHANGED_EVENT, loadPending)
  }, [loadPending])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full sidebar-scroll overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center px-5 py-5">
        <img src={idibraLogo} alt="IDIBRA" className="h-10 w-auto object-contain" />
      </div>

      {/* Divider */}
      <div className="mx-5 mb-4 border-t border-slate-700/60" />

      {/* Nav groups */}
      <nav className="flex-1 px-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest uppercase text-slate-500 select-none">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items
                .filter((item) => !('superOnly' in item && item.superOnly) || adminUser?.nivel === 'super')
                .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-green-500/15 text-green-400 nav-active-glow'
                        : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-100'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150',
                          isActive
                            ? 'bg-green-500/20 text-green-400'
                            : 'text-slate-500 group-hover:text-slate-300'
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {item.to === '/admin/aprovacoes' && pendingCount > 0 && (
                        <span className="min-w-[18px] h-[18px] bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                          {pendingCount}
                        </span>
                      )}
                      {isActive && !(item.to === '/admin/aprovacoes' && pendingCount > 0) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="p-3 mt-4">
        <div className="bg-slate-700/40 rounded-2xl p-3 border border-slate-600/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow flex-shrink-0">
              {adminUser?.nome.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate leading-tight">
                {adminUser?.nome?.split(' ')[0] || 'Administrador'}
              </p>
              <p className="text-slate-400 text-[11px] truncate">{adminUser?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair da conta
            <ChevronRight className="w-3 h-3 ml-auto" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminSidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-slate-900 z-50 transform transition-transform duration-300 ease-in-out lg:hidden border-r border-slate-700/50',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent onClose={onClose} />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-60 flex-shrink-0 bg-slate-900 h-screen sticky top-0 flex-col border-r border-slate-700/50">
        <SidebarContent />
      </div>
    </>
  )
}
