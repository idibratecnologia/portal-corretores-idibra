import { lazy, Suspense, useEffect, type ComponentType, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { RouteFallback } from '@/components/shared/RouteFallback'
import { useAuth } from '@/contexts/AuthContext'

// Layouts (carregados no shell — import direto)
import { AdminLayout } from '@/layouts/AdminLayout'
import { CorretorLayout } from '@/layouts/CorretorLayout'

// Login (primeira tela — import direto para abrir rápido)
import { LoginPage } from '@/pages/LoginPage'

/** Fábricas de import registradas para pré-carregamento em segundo plano. */
const prefetchers: Array<() => Promise<unknown>> = []

/** Helper: transforma um export nomeado em módulo lazy (default). */
const lazyNamed = <T,>(
  factory: () => Promise<T>,
  name: keyof T,
) => {
  prefetchers.push(factory)
  return lazy(() => factory().then((m) => ({ default: m[name] as ComponentType })))
}

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void) => number
  cancelIdleCallback?: (id: number) => void
}

/** Baixa os chunks das páginas em segundo plano, sem travar a navegação. */
function prefetchRoutes() {
  prefetchers.forEach((load) => { void load().catch(() => {}) })
}

// Auth pages
const CadastroPage = lazyNamed(() => import('@/pages/CadastroPage'), 'CadastroPage')
const EsqueciSenhaPage = lazyNamed(() => import('@/pages/EsqueciSenhaPage'), 'EsqueciSenhaPage')
const ResetarSenhaPage = lazyNamed(() => import('@/pages/ResetarSenhaPage'), 'ResetarSenhaPage')
const PublicEventoPage = lazyNamed(() => import('@/pages/PublicEventoPage'), 'PublicEventoPage')

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
const AdminUsuarios = lazyNamed(() => import('@/pages/admin/AdminUsuarios'), 'AdminUsuarios')
const AdminLogs = lazyNamed(() => import('@/pages/admin/AdminLogs'), 'AdminLogs')
const AdminDisparos = lazyNamed(() => import('@/pages/admin/AdminDisparos'), 'AdminDisparos')
const AdminCheckinKiosk = lazyNamed(() => import('@/pages/admin/AdminCheckinKiosk'), 'AdminCheckinKiosk')
const AdminCredenciamento = lazyNamed(() => import('@/pages/admin/AdminCredenciamento'), 'AdminCredenciamento')
const AdminAprovacoes = lazyNamed(() => import('@/pages/admin/AdminAprovacoes'), 'AdminAprovacoes')
const AdminTreinamentos = lazyNamed(() => import('@/pages/admin/AdminTreinamentos'), 'AdminTreinamentos')
const AdminTreinamentoDetalhes = lazyNamed(() => import('@/pages/admin/AdminTreinamentoDetalhes'), 'AdminTreinamentoDetalhes')

// Corretor pages
const CorretorHome = lazyNamed(() => import('@/pages/corretor/CorretorHome'), 'CorretorHome')
const CorretorEventos = lazyNamed(() => import('@/pages/corretor/CorretorEventos'), 'CorretorEventos')
const CorretorEventoDetalhes = lazyNamed(() => import('@/pages/corretor/CorretorEventoDetalhes'), 'CorretorEventoDetalhes')
const CorretorInscricoes = lazyNamed(() => import('@/pages/corretor/CorretorInscricoes'), 'CorretorInscricoes')
const CorretorHistorico = lazyNamed(() => import('@/pages/corretor/CorretorHistorico'), 'CorretorHistorico')
const CorretorPerfil = lazyNamed(() => import('@/pages/corretor/CorretorPerfil'), 'CorretorPerfil')
const CorretorTreinamentos = lazyNamed(() => import('@/pages/corretor/CorretorTreinamentos'), 'CorretorTreinamentos')
const CorretorTreinamentoPlayer = lazyNamed(() => import('@/pages/corretor/CorretorTreinamentoPlayer'), 'CorretorTreinamentoPlayer')

/** Restringe rotas a admins 'super' (dono). Operador é redirecionado. */
function SuperRoute({ children }: { children: ReactNode }) {
  const { adminUser } = useAuth()
  if (adminUser?.nivel !== 'super') return <Navigate to="/admin/dashboard" replace />
  return <>{children}</>
}

/**
 * Componente interno que usa useAuth — deve estar dentro de AuthProvider.
 * Exibe LoadingScreen enquanto o auth restaura a sessão do localStorage.
 */
function AppRoutes() {
  const { loading } = useAuth()

  // Após o app abrir, pré-carrega as páginas em segundo plano (quando ocioso)
  // para que as navegações seguintes sejam praticamente instantâneas.
  useEffect(() => {
    if (loading) return
    const w = window as IdleWindow
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(prefetchRoutes)
      return () => w.cancelIdleCallback?.(id)
    }
    const t = setTimeout(prefetchRoutes, 1500)
    return () => clearTimeout(t)
  }, [loading])

  if (loading) return <LoadingScreen />

  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* Root = página de entrada/login (canônica p/ SEO; sem redirect) */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />
      <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      <Route path="/resetar-senha" element={<ResetarSenhaPage />} />
      <Route path="/evento/:id" element={<PublicEventoPage />} />

      {/* Redireciona variações de login para a raiz (consolida o canônico) */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/admin/login" element={<Navigate to="/" replace />} />
      <Route path="/portal/login" element={<Navigate to="/" replace />} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="eventos" element={<AdminEventos />} />
        <Route path="eventos/:id" element={<AdminEventoDetalhes />} />
        <Route path="treinamentos" element={<AdminTreinamentos />} />
        <Route path="treinamentos/:id" element={<AdminTreinamentoDetalhes />} />
        <Route path="corretores" element={<AdminCorretores />} />
        <Route path="corretores/:id" element={<AdminCorretorPerfil />} />
        <Route path="aprovacoes" element={<AdminAprovacoes />} />
        <Route path="imobiliarias" element={<AdminImobiliarias />} />
        <Route path="relatorios" element={<AdminRelatorios />} />
        <Route path="notificacoes" element={<AdminNotificacoes />} />
        <Route path="disparos" element={<AdminDisparos />} />
        <Route path="usuarios" element={<SuperRoute><AdminUsuarios /></SuperRoute>} />
        <Route path="logs" element={<SuperRoute><AdminLogs /></SuperRoute>} />
        <Route path="configuracoes" element={<AdminConfiguracoes />} />
      </Route>

      {/* Corretor routes */}
      <Route path="/portal" element={<CorretorLayout />}>
        <Route index element={<Navigate to="/portal/home" replace />} />
        <Route path="home" element={<CorretorHome />} />
        <Route path="eventos" element={<CorretorEventos />} />
        <Route path="eventos/:id" element={<CorretorEventoDetalhes />} />
        <Route path="treinamentos" element={<CorretorTreinamentos />} />
        <Route path="treinamentos/:id" element={<CorretorTreinamentoPlayer />} />
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
