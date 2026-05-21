import React, { createContext, useContext, useState } from 'react'
import type { AdminUser, Corretor } from '../types'
import { mockAdminUser, mockCorretores } from '../data/mockData'

type UserRole = 'admin' | 'corretor' | null

interface AuthContextType {
  role: UserRole
  adminUser: AdminUser | null
  corretor: Corretor | null
  login: (email: string, password: string) => Promise<UserRole>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock credential store — replace with Supabase auth later
const ADMIN_EMAILS = new Set([mockAdminUser.email])

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>(null)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [corretor, setCorretor] = useState<Corretor | null>(null)

  const login = async (email: string, _password: string): Promise<UserRole> => {
    if (ADMIN_EMAILS.has(email)) {
      setRole('admin')
      setAdminUser(mockAdminUser)
      setCorretor(null)
      return 'admin'
    }

    const found = mockCorretores.find((c) => c.email === email)
    if (found) {
      setRole('corretor')
      setCorretor(found)
      setAdminUser(null)
      return 'corretor'
    }

    return null
  }

  const logout = () => {
    setRole(null)
    setAdminUser(null)
    setCorretor(null)
  }

  return (
    <AuthContext.Provider value={{ role, adminUser, corretor, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
