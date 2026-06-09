import React, {
  createContext, useContext, useState,
  useCallback, useEffect, useRef,
} from 'react'
import { api, getToken, setToken, clearToken, setRefreshToken, clearRefreshToken } from '@/lib/api'
import type { AdminUser, Corretor } from '../types'
import { mockAdminUser, mockCorretores } from '../data/mockData'

// ─── Config ──────────────────────────────────────────────────────

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const ADMIN_EMAILS = new Set([mockAdminUser.email])

// ─── Types ───────────────────────────────────────────────────────

export type UserRole = 'admin' | 'corretor' | null

export interface AppSession {
  accessToken: string
  role:        UserRole
  userId:      string
}

interface AuthContextType {
  role:           UserRole
  adminUser:      AdminUser | null
  corretor:       Corretor  | null
  session:        AppSession | null
  loading:        boolean
  authError:      string | null
  login:          (email: string, password: string) => Promise<UserRole>
  logout:         () => Promise<void>
  clearAuthError: () => void
}

// ─── JWT helpers ─────────────────────────────────────────────────

interface JWTPayload {
  sub:  string
  role: 'admin' | 'corretor'
  nome: string
  exp:  number
}

function parseJWT(token: string): JWTPayload | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload as JWTPayload
  } catch {
    return null
  }
}

function isTokenExpired(payload: JWTPayload): boolean {
  return payload.exp * 1000 < Date.now()
}

// ─── Context ─────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role,      setRole]      = useState<UserRole>(null)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [corretor,  setCorretor]  = useState<Corretor  | null>(null)
  const [session,   setSession]   = useState<AppSession | null>(null)
  const [loading,   setLoading]   = useState(!USE_MOCK) // true on mount in real mode (loading from localStorage)
  const [authError, setAuthError] = useState<string | null>(null)
  const initialized = useRef(false)

  // ── Restore session from localStorage on first mount (real mode only) ──
  useEffect(() => {
    if (USE_MOCK || initialized.current) return
    initialized.current = true

    const token = getToken()
    if (!token) { setLoading(false); return }

    const payload = parseJWT(token)
    if (!payload || isTokenExpired(payload)) {
      clearToken()
      setLoading(false)
      return
    }

    const s: AppSession = { accessToken: token, role: payload.role, userId: payload.sub }
    setSession(s)
    setRole(payload.role)

    // Load full profile based on role
    if (payload.role === 'admin') {
      api.get<AdminUser>('/auth/me')
        .then((u) => setAdminUser(u))
        .catch(() => { clearToken(); setRole(null); setSession(null) })
        .finally(() => setLoading(false))
    } else {
      api.get<Corretor>('/corretores/me')
        .then((c) => setCorretor(c))
        .catch(() => { clearToken(); setRole(null); setSession(null) })
        .finally(() => setLoading(false))
    }
  }, [])

  // ── Login ──────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<UserRole> => {
    setLoading(true)
    setAuthError(null)

    // ── Mock mode ──
    if (USE_MOCK) {
      try {
        await new Promise((r) => setTimeout(r, 600))

        if (ADMIN_EMAILS.has(email)) {
          const s: AppSession = { accessToken: 'mock-token-admin', role: 'admin', userId: mockAdminUser.id }
          setSession(s); setRole('admin'); setAdminUser(mockAdminUser); setCorretor(null)
          return 'admin'
        }

        const found = mockCorretores.find((c) => c.email === email)
        if (found) {
          const s: AppSession = { accessToken: `mock-token-${found.id}`, role: 'corretor', userId: found.id }
          setSession(s); setRole('corretor'); setCorretor(found); setAdminUser(null)
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
    }

    // ── Real mode ──
    try {
      const res = await api.post<{
        access_token: string
        refresh_token: string
        user: { id: string; nome: string; role: 'admin' | 'corretor' }
      }>('/auth/login', { email, senha: password })

      setToken(res.access_token)
      if (res.refresh_token) setRefreshToken(res.refresh_token)

      const s: AppSession = {
        accessToken: res.access_token,
        role:        res.user.role,
        userId:      res.user.id,
      }
      setSession(s)
      setRole(res.user.role)

      if (res.user.role === 'admin') {
        const admin = await api.get<AdminUser>('/auth/me')
        setAdminUser(admin)
        setCorretor(null)
      } else {
        const corr = await api.get<Corretor>('/corretores/me')
        setCorretor(corr)
        setAdminUser(null)
      }

      return res.user.role
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha na conexão. Tente novamente.'
      setAuthError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Logout ─────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    if (!USE_MOCK) {
      try { await api.post('/auth/logout', {}) } catch { /* ignora erros de logout */ }
      clearToken()
      clearRefreshToken()
    }
    setRole(null); setAdminUser(null); setCorretor(null)
    setSession(null); setAuthError(null)
  }, [])

  const clearAuthError = useCallback(() => setAuthError(null), [])

  return (
    <AuthContext.Provider value={{
      role, adminUser, corretor, session,
      loading, authError,
      login, logout, clearAuthError,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
