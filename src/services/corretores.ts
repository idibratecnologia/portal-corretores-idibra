import { api } from '@/lib/api'
import type { Paginated } from '@/lib/api'
import { mockCorretoresComImobiliaria } from '@/data/mockData'
import type { Corretor } from '@/types'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

// ─── Types ───────────────────────────────────────────────────────

export type CorretorSearchField = 'nome' | 'cpf' | 'creci' | 'email' | 'imobiliaria'

export interface CorretorFilters {
  search?:         string
  campo?:          CorretorSearchField
  status?:         Corretor['status'] | ''
  imobiliaria_id?: string
  page?:           number
  limit?:          number
  sort?:           string
  order?:          'asc' | 'desc'
}

// ─── Listagem ────────────────────────────────────────────────────

export async function fetchCorretores(
  filters: CorretorFilters = {},
): Promise<Paginated<Corretor>> {
  if (USE_MOCK) {
    const { search = '', status, imobiliaria_id, page = 1, limit = 10 } = filters
    const filtered = mockCorretoresComImobiliaria.filter((c) => {
      const q = search.toLowerCase()
      return (
        (!q || c.nome.toLowerCase().includes(q) || c.creci.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) &&
        (!status || c.status === status) &&
        (!imobiliaria_id || c.imobiliaria_id === imobiliaria_id)
      )
    })
    const total = filtered.length
    const data  = filtered.slice((page - 1) * limit, page * limit)
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } }
  }

  return api.get<Paginated<Corretor>>('/corretores', filters as Record<string, string>)
}

export async function fetchCorretorById(id: string): Promise<Corretor> {
  if (USE_MOCK) {
    const c = mockCorretoresComImobiliaria.find((c) => c.id === id)
    if (!c) throw new Error('Corretor não encontrado')
    return c
  }

  return api.get<Corretor>(`/corretores/${id}`)
}

export interface CorretorOpcao {
  id: string
  nome: string
  creci: string
  cidade: string
  uf: string
  whatsapp: string
  whatsapp_opt_in: boolean
  email: string | null
  email_opt_in: boolean
  imobiliaria_id: string | null
  status: Corretor['status']
  imobiliaria: { nome: string } | null
}

/** Lista de corretores para seletores (sem paginação). `status` filtra opcionalmente. */
export async function fetchCorretoresOpcoes(status?: Corretor['status']): Promise<CorretorOpcao[]> {
  if (USE_MOCK) return []
  return api.get<CorretorOpcao[]>('/corretores/opcoes', status ? { status } : undefined)
}

/** Perfil do corretor logado (rota autenticada /corretores/me) */
export async function fetchMeuPerfil(): Promise<Corretor> {
  if (USE_MOCK) {
    return mockCorretoresComImobiliaria[0]
  }

  return api.get<Corretor>('/corretores/me')
}

// ─── Mutações ────────────────────────────────────────────────────

/** Auto-cadastro público de corretor (sem auth). Nasce pendente. */
export interface CadastroData {
  nome: string; cpf: string; creci: string; email: string; senha: string
  telefone?: string; whatsapp: string; instagram?: string
  imobiliaria_id?: string; cidade: string; uf: string
  data_nascimento?: string
  whatsapp_opt_in?: boolean
}

export async function cadastrarCorretor(data: CadastroData): Promise<{ id: string }> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600))
    return { id: String(Date.now()) }
  }

  return api.post<{ id: string }>('/auth/cadastro', data)
}

export async function createCorretor(
  data: Omit<Corretor, 'id' | 'created_at' | 'updated_at' | 'total_eventos' | 'imobiliaria' | 'status'>,
): Promise<Corretor> {
  if (USE_MOCK) {
    const now = new Date().toISOString()
    return { ...data, id: String(Date.now()), status: 'pendente', total_eventos: 0, created_at: now, updated_at: now }
  }

  return api.post<Corretor>('/corretores', data)
}

export async function updateCorretor(id: string, data: Partial<Corretor>): Promise<Corretor> {
  if (USE_MOCK) {
    console.log('[mock] updateCorretor', id, data)
    const c = mockCorretoresComImobiliaria.find((c) => c.id === id)!
    return { ...c, ...data }
  }

  return api.patch<Corretor>(`/corretores/${id}`, data)
}

export async function setCorretorStatus(
  id: string,
  status: Corretor['status'],
): Promise<void> {
  if (USE_MOCK) {
    console.log('[mock] setCorretorStatus', id, status)
    return
  }

  await api.patch(`/corretores/${id}/status`, { status })
}

/** Exclui um corretor (somente super-admin). */
export async function deleteCorretor(id: string): Promise<void> {
  if (USE_MOCK) { console.log('[mock] deleteCorretor', id); return }
  await api.delete(`/corretores/${id}`)
}

/** Upload de foto de perfil */
export async function uploadFotoCorretor(
  id: string,
  file: File,
): Promise<{ foto_url: string }> {
  if (USE_MOCK) {
    return { foto_url: URL.createObjectURL(file) }
  }

  const form = new FormData()
  form.append('foto', file)
  return api.upload<{ foto_url: string }>(`/corretores/${id}/foto`, form)
}

/** Atualizar consentimento de notificações WhatsApp (LGPD) — admin altera de um corretor */
export async function setWhatsappOptIn(id: string, opt_in: boolean): Promise<void> {
  if (USE_MOCK) {
    console.log('[mock] setWhatsappOptIn', id, opt_in)
    return
  }

  await api.patch(`/corretores/${id}/opt-in`, { whatsapp_opt_in: opt_in })
}

/** Corretor logado edita o próprio perfil (rota /corretores/me, sem campos de admin) */
export async function atualizarMeuPerfil(data: Partial<Corretor>): Promise<Corretor> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400))
    return { ...(data as Corretor) }
  }

  return api.patch<Corretor>('/corretores/me', data)
}

/** Corretor logado altera o próprio consentimento de WhatsApp (LGPD) */
export async function atualizarMeuOptIn(opt_in: boolean): Promise<void> {
  if (USE_MOCK) {
    console.log('[mock] atualizarMeuOptIn', opt_in)
    return
  }

  await api.patch('/corretores/me/opt-in', { whatsapp_opt_in: opt_in })
}

/** Corretor logado altera o próprio consentimento de e-mail (LGPD) */
export async function atualizarMeuEmailOptIn(opt_in: boolean): Promise<void> {
  if (USE_MOCK) { console.log('[mock] atualizarMeuEmailOptIn', opt_in); return }
  await api.patch('/corretores/me', { email_opt_in: opt_in })
}
