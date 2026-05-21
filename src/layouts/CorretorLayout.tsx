import { Outlet, Navigate } from 'react-router-dom'
import { CorretorNavbar } from '@/components/corretor/CorretorNavbar'
import { useAuth } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/toaster'

export function CorretorLayout() {
  const { role } = useAuth()

  if (role !== 'corretor') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CorretorNavbar />
      <main className="max-w-7xl mx-auto px-4 py-5 sm:py-6 pb-10">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
