import { lazy, Suspense, type ComponentType } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { useAuth } from '@/contexts/AuthContext'

// Layouts (carregados no shell — import direto)
import { AdminLayout } from '@/layouts/AdminLayout'
import { CorretorLayout } from '@/layouts/CorretorLayout'

// Login (primeira tela — import direto para abrir rápido)
import { LoginPage } from '@/pages/LoginPage'

/** Helper: transforma um export nomeado em módulo lazy (default). */
const lazyNamed = <T,>(
  factory: () => Promise<T>,
  name: keyof T,
) => lazy(() => factory().then((m) => ({ default: m[name] as ComponentType })))

// Auth pages
const CadastroPage = lazyNamed(() => import('@/pages/CadastroPage'), 'CadastroPage')
const EsqueciSenhaPage = lazyNamed(() => import('@/pages/EsqueciSenhaPage'), 'EsqueciSenhaPage')
const ResetarSenhaPage = lazyNamed(() => import('@/pages/ResetarSenhaPage'), 'ResetarSenhaPage')

// Admin pages
const AdminDashboard = lazyNamed(() => import('@/pages/admin/AdminDashboard'), 'AdminDashboard')
const AdminEventos = lazyNamed(() => import('@/pages/admin/AdminEventos'), 'AdminEventos')
const AdminEventoDetalhes = lazyNamed(() => import('@/pages/admin/AdminEventoDetalhes'), 'AdminEventoDetalhes')
const AdminCorretores = lazyNamed(() => import('@/pages/admin/AdminCorretores'), 'AdminCorretores')
const AdminCorretorPerfil = lazyNamed(() => import('@/pages/admin/AdminCorretorPerfil'), 'AdminCorretorPerfil')
const AdminImobiliarias = lazyNamed(() => import('@/pages/admin/AdminImobiliarias'), 'AdminImobiliarias')
const AdminRelatorios = lazyNamed(() => import('@/pages/admin/AdminRelatorios'), 'AdminRelatorios')
const AdminConfiguracoes = lazyNamed(() => import('@/pages/admin/AdminConfiguracoes'), 'AdminConfiguracoes')
const AdminNotificacoes = lazyNamed(() => import('@/pages/admin/AdminNotificacoes'), 'AdminNotificacoes')
const AdminCheckinKiosk = lazyNamed(() => import('@/pages/admin/AdminCheckinKiosk'), 'AdminCheckinKiosk')
const AdminCredenciamento = lazyNamed(() => import('@/pages/admin/AdminCredenciamento'), 'AdminCredenciamento')
const AdminAprovacoes = lazyNamed(() => import('@/pages/admin/AdminAprovacoes'), 'AdminAprovacoes')

// Corretor pages
const CorretorHome = lazyNamed(() => import('@/pages/corretor/CorretorHome'), 'CorretorHome')
const CorretorEventos = lazyNamed(() => import('@/pages/corretor/CorretorEventos'), 'CorretorEventos')
const CorretorEventoDetalhes = lazyNamed(() => import('@/pages/corretor/CorretorEventoDetalhes'), 'CorretorEventoDetalhes')
const CorretorInscricoes = lazyNamed(() => import('@/pages/corretor/CorretorInscricoes'), 'CorretorInscricoes')
const CorretorHistorico = lazyNamed(() => import('@/pages/corretor/CorretorHistorico'), 'CorretorHistorico')
const CorretorPerfil = lazyNamed(() => import('@/pages/corretor/CorretorPerfil'), 'CorretorPerfil')

/**
 * Componente interno que usa useAuth — deve estar dentro de AuthProvider.
 * Exibe LoadingScreen enquanto o auth restaura a sessão do localStorage.
 */
function AppRoutes() {
  const { loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <Suspense fallback={<LoadingScreen />}>
    <Routes>
      {/* Root */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />
      <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      <Route path="/resetar-senha" element={<ResetarSenhaPage />} />

      {/* Legacy login redirects */}
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/portal/login" element={<Navigate to="/login" replace />} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="eventos" element={<AdminEventos />} />
        <Route path="eventos/:id" element={<AdminEventoDetalhes />} />
        <Route path="corretores" element={<AdminCorretores />} />
        <Route path="corretores/:id" element={<AdminCorretorPerfil />} />
        <Route path="aprovacoes" element={<AdminAprovacoes />} />
        <Route path="imobiliarias" element={<AdminImobiliarias />} />
        <Route path="relatorios" element={<AdminRelatorios />} />
        <Route path="notificacoes" element={<AdminNotificacoes />} />
        <Route path="configuracoes" element={<AdminConfiguracoes />} />
      </Route>

      {/* Corretor routes */}
      <Route path="/portal" element={<CorretorLayout />}>
        <Route index element={<Navigate to="/portal/home" replace />} />
        <Route path="home" element={<CorretorHome />} />
        <Route path="eventos" element={<CorretorEventos />} />
        <Route path="eventos/:id" element={<CorretorEventoDetalhes />} />
        <Route path="inscricoes" element={<CorretorInscricoes />} />
        <Route path="historico" element={<CorretorHistorico />} />
        <Route path="perfil" element={<CorretorPerfil />} />
      </Route>

      {/* Kiosk / credenciamento — sem navbar */}
      <Route path="/admin/checkin/:id" element={<AdminCheckinKiosk />} />
      <Route path="/admin/credenciamento/:id" element={<AdminCredenciamento />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
