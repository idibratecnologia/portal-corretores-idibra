import { api } from '@/lib/api'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export type WhatsappState = 'open' | 'connecting' | 'close' | 'desconhecido'

export interface WhatsappStatus {
  configurado: boolean
  state: WhatsappState
  conectado: boolean
  fila: number   // mensagens aguardando na fila de envio
}

export async function getWhatsappStatus(): Promise<WhatsappStatus> {
  if (USE_MOCK) {
    return { configurado: false, state: 'desconhecido', conectado: false, fila: 0 }
  }
  return api.get<WhatsappStatus>('/whatsapp/status')
}

export async function conectarWhatsapp(): Promise<{ qrcode: string | null; state: WhatsappState; conectado: boolean }> {
  if (USE_MOCK) {
    return { qrcode: null, state: 'connecting', conectado: false }
  }
  return api.post('/whatsapp/conectar', {})
}

export async function desconectarWhatsapp(): Promise<void> {
  if (USE_MOCK) return
  await api.post('/whatsapp/desconectar', {})
}

export interface TesteWhatsapp {
  numero: string
  evento_id?: string
  imagem_url?: string
  texto?: string
}

export async function enviarTesteWhatsapp(payload: TesteWhatsapp): Promise<{ message: string; comImagem?: boolean }> {
  if (USE_MOCK) return { message: 'Mock: mensagem de teste enviada' }
  return api.post('/whatsapp/testar', payload)
}

/** Disparo em massa para os corretores selecionados (respeita opt-in e a fila). */
export async function dispararEmMassa(
  mensagem: string,
  corretorIds: string[],
): Promise<{ total: number; enfileirados: number; semOptIn: number }> {
  if (USE_MOCK) return { total: corretorIds.length, enfileirados: corretorIds.length, semOptIn: 0 }
  return api.post('/whatsapp/broadcast', { mensagem, corretor_ids: corretorIds })
}
