import { api } from '@/lib/api'
import {
  mockDashboardStats, mockParticipacaoEventos, mockInscricoesMes,
  mockCorretoresParticipativos, mockParticipacaoImobiliaria,
  mockEventos, mockInscricoes, mockCorretoresComImobiliaria,
} from '@/data/mockData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export type Periodo = '7d' | '30d' | '90d' | '365d' | 'all'

// ─── Tipos de resposta ───────────────────────────────────────────

export interface DashboardData {
  stats: {
    total_corretores: number
    eventos_ativos: number
    inscricoes_abertas: number
    participacoes_confirmadas: number
    corretores_pendentes: number
    taxa_media_presenca: number
  }
  participacao_eventos:     { evento: string; inscritos: number; presentes: number }[]
  inscricoes_mes:           { mes: string; inscricoes: number }[]
  top_corretores:           { nome: string; participacoes: number }[]
  participacao_imobiliaria: { imobiliaria: string; participacoes: number }[]
}

export interface RelatorioEvento {
  id: string; titulo: string; data_evento: string; tipo: string
  status: string; total: number; presentes: number; ausentes: number; taxa: number
}

export interface RelatorioCorretor {
  id: string; nome: string; creci: string
  imobiliaria: { nome: string } | null
  cidade: string; uf: string; total: number; presentes: number; taxa: number
}

export interface RelatorioParticipacao {
  id: string
  corretor: { nome: string } | null
  evento:   { titulo: string; data_evento: string } | null
  status: string
  checkin_at: string | null
}

// ─── Dashboard ────────────────────────────────────────────────────

export async function fetchDashboard(): Promise<DashboardData> {
  if (USE_MOCK) {
    return {
      stats: mockDashboardStats,
      participacao_eventos:     mockParticipacaoEventos,
      inscricoes_mes:           mockInscricoesMes,
      top_corretores:           mockCorretoresParticipativos.map((c) => ({ nome: c.nome, participacoes: c.participacoes })),
      participacao_imobiliaria: mockParticipacaoImobiliaria,
    }
  }

  return api.get<DashboardData>('/relatorios/dashboard')
}

// ─── Relatórios ──────────────────────────────────────────────────

export async function fetchRelatorioEventos(periodo: Periodo): Promise<RelatorioEvento[]> {
  if (USE_MOCK) {
    return mockEventos
      .filter((e) => e.status === 'publicado' || e.status === 'encerrado')
      .map((e) => {
        const insc = mockInscricoes.filter((i) => i.evento_id === e.id)
        const presentes = insc.filter((i) => i.status === 'presente').length
        const ausentes  = insc.filter((i) => i.status === 'ausente').length
        const taxa = insc.length > 0 ? Math.round((presentes / insc.length) * 100) : 0
        return { id: e.id, titulo: e.titulo, data_evento: e.data_evento, tipo: e.tipo, status: e.status, total: insc.length, presentes, ausentes, taxa }
      })
  }

  return api.get<RelatorioEvento[]>('/relatorios/eventos', { periodo })
}

export async function fetchRelatorioCorretores(periodo: Periodo): Promise<RelatorioCorretor[]> {
  if (USE_MOCK) {
    return mockCorretoresComImobiliaria.map((c) => {
      const insc = mockInscricoes.filter((i) => i.corretor_id === c.id)
      const presentes = insc.filter((i) => i.status === 'presente').length
      const taxa = insc.length > 0 ? Math.round((presentes / insc.length) * 100) : 0
      return { id: c.id, nome: c.nome, creci: c.creci, imobiliaria: c.imobiliaria ? { nome: c.imobiliaria.nome } : null, cidade: c.cidade, uf: c.uf, total: insc.length, presentes, taxa }
    }).sort((a, b) => b.presentes - a.presentes)
  }

  return api.get<RelatorioCorretor[]>('/relatorios/corretores', { periodo })
}

export async function fetchRelatorioParticipacoes(periodo: Periodo): Promise<RelatorioParticipacao[]> {
  if (USE_MOCK) {
    return mockInscricoes.map((i) => ({
      id: i.id,
      corretor: (() => { const c = mockCorretoresComImobiliaria.find((x) => x.id === i.corretor_id); return c ? { nome: c.nome } : null })(),
      evento:   (() => { const e = mockEventos.find((x) => x.id === i.evento_id); return e ? { titulo: e.titulo, data_evento: e.data_evento } : null })(),
      status: i.status,
      checkin_at: i.checkin_at ?? null,
    }))
  }

  return api.get<RelatorioParticipacao[]>('/relatorios/participacoes', { periodo })
}
