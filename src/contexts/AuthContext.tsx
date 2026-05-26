import React, { createContext, useContext, useState, useCallback } from 'react'
import type { AdminUser, Corretor } from '../types'
import { mockAdminUser, mockCorretores } from '../data/mockData'

type UserRole = 'admin' | 'corretor' | null

/**
 * Mirrors a Supabase session shape.
 * Swap the internals of login/logout when integrating:
 *   const { data, error } = await supabase.auth.signInWithPassword({ email, password })
 */
export interface AppSession {
  accessToken: string
  role: UserRole
  userId: string
}

interface AuthContextType {
  role: UserRole
  adminUser: AdminUser | null
  corretor: Corretor | null
  session: AppSession | null
  loading: boolean        // true while an auth request is in-flight
  authError: string | null
  login: (email: string, password: string) => Promise<UserRole>
  logout: () => void
  clearAuthError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ADMIN_EMAILS = new Set([mockAdminUser.email])

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole]           = useState<UserRole>(null)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [corretor, setCorretor]   = useState<Corretor | null>(null)
  const [session, setSession]     = useState<AppSession | null>(null)
  const [loading, setLoading]     = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  /**
   * Mock implementation — swap body with Supabase when ready:
   *
   *   const { data, error } = await supabase.auth.signInWithPassword({ email, password })
   *   if (error) { setAuthError(error.message); return null }
   *   const userRole = data.user?.user_metadata?.role as UserRole
   *   ...
   */
  const login = useCallback(async (email: string, _password: string): Promise<UserRole> => {
    setLoading(true)
    setAuthError(null)

    try {
      await new Promise((r) => setTimeout(r, 600)) // simulates network round-trip

      if (ADMIN_EMAILS.has(email)) {
        const s: AppSession = { accessToken: 'mock-token-admin', role: 'admin', userId: mockAdminUser.id }
        setSession(s)
        setRole('admin')
        setAdminUser(mockAdminUser)
        setCorretor(null)
        return 'admin'
      }

      const found = mockCorretores.find((c) => c.email === email)
      if (found) {
        const s: AppSession = { accessToken: `mock-token-${found.id}`, role: 'corretor', userId: found.id }
        setSession(s)
        setRole('corretor')
        setCorretor(found)
        setAdminUser(null)
        return 'corretor'
      }

      setAuthError('E-mail ou senha inválidos.')
      return null
    } catch {
      setAuthError('Falha na conexão. Tente novamente.')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /** Swap with: await supabase.auth.signOut() */
  const logout = useCallback(() => {
    setRole(null)
    setAdminUser(null)
    setCorretor(null)
    setSession(null)
    setAuthError(null)
  }, [])

  const clearAuthError = useCallback(() => setAuthError(null), [])

  return (
    <AuthContext.Provider value={{ role, adminUser, corretor, session, loading, authError, login, logout, clearAuthError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
