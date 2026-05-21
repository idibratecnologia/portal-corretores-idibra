import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'

// Layouts
import { AdminLayout } from '@/layouts/AdminLayout'
import { CorretorLayout } from '@/layouts/CorretorLayout'

// Login
import { LoginPage } from '@/pages/LoginPage'
import { CadastroPage } from '@/pages/CadastroPage'

// Admin pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { AdminEventos } from '@/pages/admin/AdminEventos'
import { AdminEventoDetalhes } from '@/pages/admin/AdminEventoDetalhes'
import { AdminCorretores } from '@/pages/admin/AdminCorretores'
import { AdminCorretorPerfil } from '@/pages/admin/AdminCorretorPerfil'
import { AdminImobiliarias } from '@/pages/admin/AdminImobiliarias'
import { AdminRelatorios } from '@/pages/admin/AdminRelatorios'
import { AdminConfiguracoes } from '@/pages/admin/AdminConfiguracoes'
import { AdminCheckinKiosk } from '@/pages/admin/AdminCheckinKiosk'

// Corretor pages
import { CorretorHome } from '@/pages/corretor/CorretorHome'
import { CorretorEventos } from '@/pages/corretor/CorretorEventos'
import { CorretorEventoDetalhes } from '@/pages/corretor/CorretorEventoDetalhes'
import { CorretorInscricoes } from '@/pages/corretor/CorretorInscricoes'
import { CorretorHistorico } from '@/pages/corretor/CorretorHistorico'
import { CorretorPerfil } from '@/pages/corretor/CorretorPerfil'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<CadastroPage />} />

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
            <Route path="imobiliarias" element={<AdminImobiliarias />} />
            <Route path="relatorios" element={<AdminRelatorios />} />
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

          {/* Kiosk mode — sem navbar */}
          <Route path="/admin/checkin/:id" element={<AdminCheckinKiosk />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
