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

export interface DisparoResultado { total: number; whatsapp: number; emails: number; semCanal: number }

/** Disparo em massa (WhatsApp e/ou e-mail) para os corretores selecionados, com anexo opcional. */
export async function dispararEmMassa(
  mensagem: string,
  corretorIds: string[],
  canais: { whatsapp: boolean; email: boolean },
  assunto?: string,
  anexo?: File,
): Promise<DisparoResultado> {
  if (USE_MOCK) return { total: corretorIds.length, whatsapp: canais.whatsapp ? corretorIds.length : 0, emails: canais.email ? corretorIds.length : 0, semCanal: 0 }
  const form = new FormData()
  form.append('mensagem', mensagem)
  form.append('corretor_ids', JSON.stringify(corretorIds))
  form.append('canais', JSON.stringify(canais))
  if (assunto) form.append('assunto', assunto)
  if (anexo) form.append('file', anexo)
  return api.upload<DisparoResultado>('/whatsapp/broadcast', form)
}
