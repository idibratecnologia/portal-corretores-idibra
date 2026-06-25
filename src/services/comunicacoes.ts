import { api, type Paginated } from '@/lib/api'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export type CanalComunicacao = 'whatsapp' | 'email'
export type StatusComunicacao = 'enviado' | 'erro'

export interface Comunicacao {
  id: string
  tipo: string
  canal: CanalComunicacao
  status: StatusComunicacao
  mensagem: string | null
  erro: string | null
  enviado_at: string
  corretor_nome: string
  evento_titulo: string | null
}

export interface ResumoComunicacoes {
  whatsapp: { enviado: number; erro: number }
  email: { enviado: number; erro: number }
}

export const TIPO_NOTIF_LABEL: Record<string, string> = {
  inscricao_confirmada: 'Inscrição confirmada',
  lembrete_antecedencia: 'Lembrete (antecedência)',
  lembrete_dia: 'Lembrete (dia)',
  aprovacao: 'Conta / aprovação',
  checkin: 'Check-in',
  cancelamento_evento: 'Cancelamento de evento',
  evento_novo: 'Novo evento',
  certificado: 'Certificado',
  broadcast: 'Disparo em massa',
  aniversario: 'Aniversário',
}

export interface ComunicacoesFiltros {
  canal?: CanalComunicacao
  status?: StatusComunicacao
  tipo?: string
  q?: string
  page?: number
  limit?: number
}

export async function fetchComunicacoes(filtros: ComunicacoesFiltros): Promise<Paginated<Comunicacao>> {
  if (USE_MOCK) return { data: [], meta: { total: 0, page: 1, limit: 20, pages: 1 } }
  return api.get<Paginated<Comunicacao>>('/comunicacoes', filtros as Record<string, string | number | undefined>)
}

export async function fetchResumoComunicacoes(): Promise<ResumoComunicacoes> {
  if (USE_MOCK) return { whatsapp: { enviado: 0, erro: 0 }, email: { enviado: 0, erro: 0 } }
  return api.get<ResumoComunicacoes>('/comunicacoes/resumo')
}

// ─── Preferência de e-mail (LGPD, público via token) ──────────────

export interface PreferenciaEmail { nome: string; email: string; email_opt_in: boolean }

export async function fetchPreferenciaEmail(c: string, t: string): Promise<PreferenciaEmail> {
  return api.get<PreferenciaEmail>('/public/email/preferencia', { c, t })
}

export async function setPreferenciaEmail(corretorId: string, token: string, optIn: boolean): Promise<{ ok: boolean; nome: string; email_opt_in: boolean }> {
  return api.post('/public/email/preferencia', { corretor_id: corretorId, token, opt_in: optIn })
}
