import { api, apiBaseUrl, getToken } from '@/lib/api'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

// ─── Tipos ────────────────────────────────────────────────────────

export type StatusVideo =
  | 'pendente' | 'upload_recebido' | 'processando'
  | 'disponivel' | 'erro_processamento' | 'expirado' | 'excluido'

export type StatusProgresso = 'nao_iniciado' | 'em_andamento' | 'concluido'

/** Aula (vídeo) — visão admin. */
export interface Aula {
  id: string
  treinamento_id: string
  titulo: string
  descricao: string
  ordem: number
  video_path: string | null
  video_duracao: number | null
  thumbnail_url: string | null
  status_video: StatusVideo
  video_erro: string | null
  data_liberacao: string | null
  data_encerramento: string | null
  excluir_video_automaticamente: boolean
  dias_para_exclusao: number | null
  data_exclusao_video: string | null
  video_excluido: boolean
  created_at: string
  updated_at: string
}

export interface Treinamento {
  id: string
  titulo: string
  descricao: string
  ativo: boolean
  obrigatorio: boolean
  liberacao_sequencial: boolean
  avulso: boolean
  created_at: string
  updated_at: string
  _count?: { aulas: number; eventos: number; documentos: number }
  aulas?: Array<{ thumbnail_url: string | null; status_video: StatusVideo }>
}

export interface DocumentoApoio { id: string; titulo: string }

export interface VinculoEventoInfo {
  id: string
  treinamento_id: string
  evento_id: string
  ordem: number
  obrigatorio: boolean | null
  evento: { id: string; titulo: string }
}

export interface TreinamentoDetalhe extends Treinamento {
  aulas: Aula[]
  documentos: DocumentoApoio[]
  eventos: VinculoEventoInfo[]
}

export interface ProgressoCorretor {
  status: StatusProgresso
  percentual: number
  segundos_assistidos: number
  concluido_em: string | null
}

/** Resumo de um treinamento (card do corretor). */
export interface TreinamentoResumo {
  id: string
  titulo: string
  descricao: string
  obrigatorio: boolean
  thumbnail_url: string | null
  total_aulas: number
  aulas_concluidas: number
  percentual: number
  status: StatusProgresso
}

export interface MeuTreinamento extends TreinamentoResumo {
  evento: { id: string; titulo: string } | null
}

/** Aula na visão do corretor (playlist). */
export interface AulaCorretor {
  id: string
  titulo: string
  descricao: string
  ordem: number
  video_duracao: number | null
  thumbnail_url: string | null
  video_disponivel: boolean
  data_liberacao: string | null
  data_encerramento: string | null
  liberada: boolean
  motivo_bloqueio: string | null
  encerrada: boolean
  progresso: ProgressoCorretor
}

export interface TreinamentoCorretorDetalhe {
  id: string
  titulo: string
  descricao: string
  liberacao_sequencial: boolean
  total_aulas: number
  aulas_concluidas: number
  percentual: number
  aulas: AulaCorretor[]
  documentos: DocumentoApoio[]
}

export interface VinculoTreinamento {
  id: string
  treinamento_id: string
  evento_id: string
  ordem: number
  obrigatorio: boolean | null
  treinamento: Treinamento & { _count?: { aulas: number } }
}

export interface RelatorioTreinamento {
  treinamento: { id: string; titulo: string }
  total_aulas: number
  eventos: string[]
  indicadores: { total: number; iniciou: number; concluiu: number; pendentes: number; percentualConclusao: number }
  linhas: Array<{
    corretor_id: string
    nome: string
    evento: string | null
    status: StatusProgresso
    aulas_concluidas: number
    total_aulas: number
    percentual: number
    ultimo_acesso: string | null
  }>
}

export interface TreinamentoPayload {
  titulo: string
  descricao?: string
  obrigatorio?: boolean
  liberacao_sequencial?: boolean
  avulso?: boolean
}

export interface AulaPayload {
  titulo: string
  descricao?: string
  data_liberacao?: string | null
  data_encerramento?: string | null
  excluir_video_automaticamente?: boolean
  dias_para_exclusao?: number | null
}

// ─── Admin: CRUD treinamento ──────────────────────────────────────

export async function fetchTreinamentos(filtros?: { search?: string; ativo?: 'true' | 'false' }): Promise<Treinamento[]> {
  if (USE_MOCK) return []
  return api.get<Treinamento[]>('/treinamentos', filtros)
}

export async function fetchTreinamento(id: string): Promise<TreinamentoDetalhe> {
  return api.get<TreinamentoDetalhe>(`/treinamentos/${id}`)
}

export async function createTreinamento(payload: TreinamentoPayload): Promise<Treinamento> {
  return api.post<Treinamento>('/treinamentos', payload)
}

export async function updateTreinamento(id: string, payload: Partial<TreinamentoPayload> & { ativo?: boolean }): Promise<Treinamento> {
  return api.patch<Treinamento>(`/treinamentos/${id}`, payload)
}

export async function setAtivoTreinamento(id: string, ativo: boolean): Promise<Treinamento> {
  return api.patch<Treinamento>(`/treinamentos/${id}`, { ativo })
}

export async function deleteTreinamento(id: string): Promise<void> {
  await api.delete(`/treinamentos/${id}`)
}

export async function fetchRelatorioTreinamento(id: string): Promise<RelatorioTreinamento> {
  return api.get<RelatorioTreinamento>(`/treinamentos/${id}/relatorio`)
}

// ─── Admin: aulas ─────────────────────────────────────────────────

export async function createAula(treinamentoId: string, payload: AulaPayload): Promise<Aula> {
  return api.post<Aula>(`/treinamentos/${treinamentoId}/aulas`, payload)
}

export async function updateAula(aulaId: string, payload: Partial<AulaPayload>): Promise<Aula> {
  return api.patch<Aula>(`/treinamentos/aulas/${aulaId}`, payload)
}

export async function deleteAula(aulaId: string): Promise<void> {
  await api.delete(`/treinamentos/aulas/${aulaId}`)
}

export async function reordenarAulas(treinamentoId: string, ordem: string[]): Promise<void> {
  await api.patch(`/treinamentos/${treinamentoId}/aulas/ordenar`, { ordem })
}

export function uploadVideoAula(
  aulaId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ status_video: StatusVideo }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const form = new FormData()
    form.append('file', file)
    xhr.open('POST', `${apiBaseUrl}/treinamentos/aulas/${aulaId}/video`)
    const token = getToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)) } catch { resolve({ status_video: 'upload_recebido' }) }
      } else {
        let msg = 'Falha no upload do vídeo'
        try { msg = JSON.parse(xhr.responseText).message || msg } catch { /* texto cru */ }
        reject(new Error(msg))
      }
    }
    xhr.onerror = () => reject(new Error('Erro de rede durante o upload'))
    xhr.send(form)
  })
}

// ─── Documentos de apoio (nível do treinamento) ───────────────────

export async function uploadDocumentoTreinamento(id: string, file: File, titulo?: string): Promise<DocumentoApoio> {
  const form = new FormData()
  form.append('file', file)
  const qs = titulo ? `?titulo=${encodeURIComponent(titulo)}` : ''
  return api.upload<DocumentoApoio>(`/treinamentos/${id}/documentos${qs}`, form)
}

export async function deleteDocumentoTreinamento(docId: string): Promise<void> {
  await api.delete(`/treinamentos/documentos/${docId}`)
}

// ─── Vínculo com eventos ──────────────────────────────────────────

export async function fetchTreinamentosDoEvento(eventoId: string): Promise<VinculoTreinamento[]> {
  if (USE_MOCK) return []
  return api.get<VinculoTreinamento[]>(`/eventos/${eventoId}/treinamentos`)
}

export async function vincularTreinamento(eventoId: string, treinamentoId: string, obrigatorio?: boolean): Promise<VinculoTreinamento> {
  return api.post<VinculoTreinamento>(`/eventos/${eventoId}/treinamentos`, { treinamento_id: treinamentoId, obrigatorio })
}

export async function desvincularTreinamento(vinculoId: string): Promise<void> {
  await api.delete(`/treinamentos/vinculos/${vinculoId}`)
}

export async function ordenarTreinamentosEvento(eventoId: string, ordem: string[]): Promise<void> {
  await api.patch(`/eventos/${eventoId}/treinamentos/ordenar`, { ordem })
}

// ─── Corretor ─────────────────────────────────────────────────────

export async function fetchMeusTreinamentos(): Promise<MeuTreinamento[]> {
  if (USE_MOCK) return []
  return api.get<MeuTreinamento[]>('/meus-treinamentos')
}

export async function fetchTreinamentosEventoCorretor(eventoId: string): Promise<TreinamentoResumo[]> {
  if (USE_MOCK) return []
  return api.get<TreinamentoResumo[]>(`/eventos/${eventoId}/treinamentos`)
}

export async function fetchTreinamentoCorretor(id: string): Promise<TreinamentoCorretorDetalhe> {
  return api.get<TreinamentoCorretorDetalhe>(`/treinamentos/${id}`)
}

export async function salvarProgressoAula(
  aulaId: string,
  segundos: number,
): Promise<ProgressoCorretor & { liberou_proxima: boolean }> {
  return api.post(`/treinamentos/aulas/${aulaId}/progresso`, { segundos })
}

// ─── URLs de mídia protegida (token na query, p/ <video> e <a download>) ──

export function videoAulaUrl(aulaId: string): string {
  return `${apiBaseUrl}/treinamentos/aulas/${aulaId}/video?token=${encodeURIComponent(getToken() ?? '')}`
}

export function documentoTreinamentoUrl(docId: string): string {
  return `${apiBaseUrl}/treinamentos/documentos/${docId}/download?token=${encodeURIComponent(getToken() ?? '')}`
}
