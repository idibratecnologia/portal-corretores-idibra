import { api } from '@/lib/api'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export type TipoModelo = 'credenciamento' | 'cracha' | 'certificado'

export interface ModeloVisual {
  id: string
  nome: string
  descricao: string
  tipo: TipoModelo
  largura: number
  altura: number
  ativo: boolean
  canvas_json?: unknown | null
  created_at: string
  updated_at: string
  _count?: { eventos: number }
}

export interface ModeloPayload {
  nome: string
  descricao?: string
  tipo: TipoModelo
  largura: number
  altura: number
  canvas_json?: unknown
  ativo?: boolean
}

export interface EventoModeloVinculo {
  id: string
  evento_id: string
  modelo_id: string
  tipo: TipoModelo
  modelo: { id: string; nome: string; tipo: TipoModelo; largura: number; altura: number; ativo: boolean }
}

export const TIPO_MODELO_LABEL: Record<TipoModelo, string> = {
  credenciamento: 'Credenciamento',
  cracha: 'Crachá',
  certificado: 'Certificado',
}

// ─── CRUD ─────────────────────────────────────────────────────────

export async function fetchModelos(filtros?: { tipo?: TipoModelo; ativo?: 'true' | 'false'; search?: string }): Promise<ModeloVisual[]> {
  if (USE_MOCK) return []
  return api.get<ModeloVisual[]>('/modelos', filtros)
}

export async function fetchModelo(id: string): Promise<ModeloVisual> {
  return api.get<ModeloVisual>(`/modelos/${id}`)
}

export async function createModelo(payload: ModeloPayload): Promise<ModeloVisual> {
  return api.post<ModeloVisual>('/modelos', payload)
}

export async function updateModelo(id: string, payload: Partial<ModeloPayload>): Promise<ModeloVisual> {
  return api.patch<ModeloVisual>(`/modelos/${id}`, payload)
}

export async function duplicarModelo(id: string): Promise<ModeloVisual> {
  return api.post<ModeloVisual>(`/modelos/${id}/duplicar`)
}

export async function deleteModelo(id: string): Promise<void> {
  await api.delete(`/modelos/${id}`)
}

// ─── Vínculo com eventos ──────────────────────────────────────────

export async function fetchModelosDoEvento(eventoId: string): Promise<EventoModeloVinculo[]> {
  if (USE_MOCK) return []
  return api.get<EventoModeloVinculo[]>(`/eventos/${eventoId}/modelos`)
}

export async function vincularModelo(eventoId: string, modeloId: string): Promise<EventoModeloVinculo> {
  return api.post<EventoModeloVinculo>(`/eventos/${eventoId}/modelos`, { modelo_id: modeloId })
}

export async function desvincularModelo(eventoId: string, tipo: TipoModelo): Promise<void> {
  await api.delete(`/eventos/${eventoId}/modelos/${tipo}`)
}

// ─── Dados reais das variáveis (preview/geração) ──────────────────

export interface InscritoDados { inscricao_id: string; nome: string; status: string; dados: Record<string, string> }

export async function fetchDadosInscricao(eventoId: string, inscricaoId: string, tipo: TipoModelo): Promise<Record<string, string>> {
  return api.get<Record<string, string>>(`/eventos/${eventoId}/inscricoes/${inscricaoId}/dados`, { tipo })
}

export async function fetchInscritosDados(eventoId: string, tipo: TipoModelo, status?: 'inscrito' | 'presente' | 'ausente'): Promise<InscritoDados[]> {
  if (USE_MOCK) return []
  return api.get<InscritoDados[]>(`/eventos/${eventoId}/inscricoes-dados`, { tipo, ...(status ? { status } : {}) })
}

export interface RegistroGeracao {
  modelo_id?: string
  tipo: TipoModelo
  formato: 'png' | 'jpg' | 'pdf' | 'zip'
  itens: Array<{ inscricao_id?: string; corretor_id?: string }>
}

export async function registrarGeracao(eventoId: string, body: RegistroGeracao): Promise<{ registrados: number }> {
  return api.post(`/eventos/${eventoId}/modelos/registrar-geracao`, body)
}

export async function fetchGeracoes(eventoId: string): Promise<Array<{ tipo: TipoModelo; total: number }>> {
  if (USE_MOCK) return []
  return api.get<Array<{ tipo: TipoModelo; total: number }>>(`/eventos/${eventoId}/modelos/geracoes`)
}

export interface ValidacaoResult {
  valido: boolean
  nome?: string; creci?: string; evento?: string; data?: string; local?: string; status?: string; presente?: boolean
}

export async function fetchValidacao(codigo: string): Promise<ValidacaoResult> {
  return api.get<ValidacaoResult>(`/public/validar/${codigo}`)
}
