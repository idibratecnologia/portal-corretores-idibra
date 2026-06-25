import { api } from '@/lib/api'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export interface ModeloMensagem {
  id: string
  nome: string
  assunto: string | null
  conteudo: string
  created_at: string
  updated_at: string
}

export interface ModeloMensagemInput {
  nome: string
  assunto?: string
  conteudo: string
}

export async function fetchModelosMensagem(): Promise<ModeloMensagem[]> {
  if (USE_MOCK) return []
  return api.get<ModeloMensagem[]>('/modelos-mensagem')
}

export async function createModeloMensagem(data: ModeloMensagemInput): Promise<ModeloMensagem> {
  return api.post<ModeloMensagem>('/modelos-mensagem', data)
}

export async function updateModeloMensagem(id: string, data: Partial<ModeloMensagemInput>): Promise<ModeloMensagem> {
  return api.patch<ModeloMensagem>(`/modelos-mensagem/${id}`, data)
}

export async function deleteModeloMensagem(id: string): Promise<void> {
  await api.delete(`/modelos-mensagem/${id}`)
}
