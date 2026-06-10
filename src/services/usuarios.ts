import { api } from '@/lib/api'
import type { NivelAdmin } from '@/types'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export interface Usuario {
  id: string
  nome: string
  email: string
  nivel: NivelAdmin
  created_at: string
}

export interface CreateUsuarioInput {
  nome: string
  email: string
  senha: string
  nivel: NivelAdmin
}

export interface UpdateUsuarioInput {
  nome?: string
  email?: string
  nivel?: NivelAdmin
  senha?: string
}

export async function fetchUsuarios(): Promise<Usuario[]> {
  if (USE_MOCK) return []
  return api.get<Usuario[]>('/usuarios')
}

export async function createUsuario(data: CreateUsuarioInput): Promise<Usuario> {
  if (USE_MOCK) return { ...data, id: String(Date.now()), created_at: new Date().toISOString() }
  return api.post<Usuario>('/usuarios', data)
}

export async function updateUsuario(id: string, data: UpdateUsuarioInput): Promise<Usuario> {
  if (USE_MOCK) return { id, nome: data.nome ?? '', email: data.email ?? '', nivel: data.nivel ?? 'operador', created_at: new Date().toISOString() }
  return api.patch<Usuario>(`/usuarios/${id}`, data)
}

export async function deleteUsuario(id: string): Promise<void> {
  if (USE_MOCK) { console.log('[mock] deleteUsuario', id); return }
  await api.delete(`/usuarios/${id}`)
}
