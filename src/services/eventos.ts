import { api, apiBaseUrl } from '@/lib/api'
import type { Paginated } from '@/lib/api'
import { mockEventos } from '@/data/mockData'
import type { Evento } from '@/types'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export interface EventoPublico {
  id: string
  titulo: string
  descricao: string
  tipo: string
  empreendimento?: string | null
  banner_url?: string | null
  data_evento: string
  hora_inicio: string
  hora_fim: string
  local: string
  endereco: string
  link_maps?: string | null
}

/** Busca os dados públicos de um evento (sem login) para a página de compartilhamento. */
export async function fetchEventoPublico(id: string): Promise<EventoPublico> {
  const res = await fetch(`${apiBaseUrl}/public/eventos/${id}`)
  if (!res.ok) throw new Error('Evento não encontrado')
  return res.json()
}

// ─── Types ───────────────────────────────────────────────────────

export interface EventoFilters {
  search?:  string
  status?:  Evento['status'] | ''
  tipo?:    string
  page?:    number
  limit?:   number
  sort?:    string
  order?:   'asc' | 'desc'
}

// ─── Listagem ────────────────────────────────────────────────────

export async function fetchEventos(
  filters: EventoFilters = {},
): Promise<Paginated<Evento>> {
  if (USE_MOCK) {
    const { search = '', status, tipo, page = 1, limit = 10 } = filters
    const filtered = mockEventos.filter((e) => {
      const q = search.toLowerCase()
      return (
        (!q || e.titulo.toLowerCase().includes(q) || e.local.toLowerCase().includes(q)) &&
        (!status || e.status === status) &&
        (!tipo || e.tipo === tipo)
      )
    })
    const total = filtered.length
    const data  = filtered.slice((page - 1) * limit, page * limit)
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } }
  }

  return api.get<Paginated<Evento>>('/eventos', filters as Record<string, string>)
}

/** Apenas eventos publicados + inscrições abertas (visão do corretor) */
export async function fetchEventosPublicados(): Promise<Evento[]> {
  if (USE_MOCK) {
    return mockEventos.filter((e) => e.status === 'publicado' && e.inscricoes_abertas)
  }

  const res = await api.get<Paginated<Evento>>('/eventos', { status: 'publicado', limit: 100 })
  return res.data
}

export async function fetchEventoById(id: string): Promise<Evento> {
  if (USE_MOCK) {
    const e = mockEventos.find((e) => e.id === id)
    if (!e) throw new Error('Evento não encontrado')
    return e
  }

  return api.get<Evento>(`/eventos/${id}`)
}

// ─── Mutações ────────────────────────────────────────────────────

export async function createEvento(
  data: Omit<Evento, 'id' | 'created_at' | 'updated_at' | 'total_inscritos' | 'total_presentes' | 'status'> & { convidados?: string[] },
): Promise<Evento> {
  if (USE_MOCK) {
    const now = new Date().toISOString()
    return { ...data, id: String(Date.now()), status: 'rascunho', total_inscritos: 0, total_presentes: 0, created_at: now, updated_at: now }
  }

  return api.post<Evento>('/eventos', data)
}

export async function updateEvento(id: string, data: Partial<Evento> & { convidados?: string[] }): Promise<Evento> {
  if (USE_MOCK) {
    console.log('[mock] updateEvento', id, data)
    const e = mockEventos.find((e) => e.id === id)!
    return { ...e, ...data }
  }

  return api.patch<Evento>(`/eventos/${id}`, data)
}

export async function setEventoStatus(
  id: string,
  status: Evento['status'],
): Promise<void> {
  if (USE_MOCK) {
    console.log('[mock] setEventoStatus', id, status)
    return
  }

  await api.patch(`/eventos/${id}/status`, { status })
}

/** Exclui um evento (somente super-admin). */
export async function deleteEvento(id: string): Promise<void> {
  if (USE_MOCK) { console.log('[mock] deleteEvento', id); return }
  await api.delete(`/eventos/${id}`)
}

/** Upload de banner do evento */
export async function uploadBannerEvento(
  id: string,
  file: File,
): Promise<{ banner_url: string }> {
  if (USE_MOCK) {
    return { banner_url: URL.createObjectURL(file) }
  }

  const form = new FormData()
  form.append('banner', file)
  return api.upload<{ banner_url: string }>(`/eventos/${id}/banner`, form)
}
