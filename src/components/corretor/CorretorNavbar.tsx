import { NavLink, useNavigate } from 'react-router-dom'
import idibraLogo from '@/assets/idibra_logo_preta.png'
import { Home, Calendar, ClipboardList, History, User, Menu, X, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { to: '/portal/home',      icon: Home,          label: 'Início' },
  { to: '/portal/eventos',   icon: Calendar,      label: 'Eventos' },
  { to: '/portal/inscricoes',icon: ClipboardList, label: 'Inscrições' },
  { to: '/portal/historico', icon: History,       label: 'Histórico' },
  { to: '/portal/perfil',    icon: User,          label: 'Perfil' },
]

export function CorretorNavbar() {
  const { logout, corretor } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      <header className="glass-navbar sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <img src={idibraLogo} alt="IDIBRA" className="h-9 w-auto object-contain" />
            </div>

            {/* Desktop nav — pill style */}
            <nav className="hidden md:flex items-center bg-gray-100/70 rounded-2xl p-1 gap-0.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200',
                      isActive
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'
                    )
                  }
                >
                  <item.icon className="w-3.5 h-3.5" />
                  <span className="hidden lg:block">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* User dropdown */}
            <div className="hidden md:block relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
                  {corretor?.nome.charAt(0) || 'C'}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-semibold text-gray-900 leading-tight">{corretor?.nome.split(' ')[0]}</p>
                  <p className="text-[10px] text-gray-400 leading-tight">Corretor</p>
                </div>
                <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', userMenuOpen && 'rotate-180')} />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 py-1.5 z-20">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-xs font-bold text-gray-900">{corretor?.nome}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{corretor?.email}</p>
                    </div>
                    <NavLink
                      to="/portal/perfil"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      <User className="w-3.5 h-3.5" /> Meu Perfil
                    </NavLink>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sair da conta
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute top-16 left-3 right-3 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* User info */}
            <div className="flex items-center gap-3 px-4 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold shadow-sm">
                {corretor?.nome.charAt(0) || 'C'}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{corretor?.nome}</p>
                <p className="text-xs text-gray-500">{corretor?.creci}</p>
              </div>
            </div>

            <nav className="p-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="p-2 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sair da conta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
