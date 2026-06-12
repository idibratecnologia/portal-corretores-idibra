import { api } from '@/lib/api'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export interface AuditLog {
  id: string
  admin_id: string | null
  admin_nome: string
  acao: string
  entidade: string
  entidade_id: string | null
  label: string | null
  detalhe: string | null
  created_at: string
}

export interface LogsResponse {
  data: AuditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface LogsFilters {
  page?: number
  limit?: number
  entidade?: string
  acao?: string
  search?: string
}

export async function fetchLogs(filters: LogsFilters = {}): Promise<LogsResponse> {
  if (USE_MOCK) return { data: [], total: 0, page: 1, limit: 30, totalPages: 0 }

  const qs = new URLSearchParams()
  if (filters.page) qs.set('page', String(filters.page))
  if (filters.limit) qs.set('limit', String(filters.limit))
  if (filters.entidade) qs.set('entidade', filters.entidade)
  if (filters.acao) qs.set('acao', filters.acao)
  if (filters.search) qs.set('search', filters.search)

  const q = qs.toString()
  return api.get<LogsResponse>(`/logs${q ? `?${q}` : ''}`)
}
