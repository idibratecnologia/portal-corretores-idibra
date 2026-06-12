/**
 * Cliente da Evolution API (WhatsApp).
 *
 * A Evolution roda como container Docker e conecta a um número de WhatsApp via
 * QR Code. Uma vez conectada, a sessão persiste no volume do container — o
 * número permanece sincronizado entre reinícios.
 *
 * Docs: https://doc.evolution-api.com
 */
import { config } from '@/config'

const BASE     = config.evolution.url
const KEY      = config.evolution.apiKey
const INSTANCE = config.evolution.instance

export type ConnectionState = 'open' | 'connecting' | 'close' | 'desconhecido'

function headers() {
  return { apikey: KEY, 'Content-Type': 'application/json' }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) {
    // A Evolution costuma aninhar o detalhe em response.message (array) — extrai tudo.
    const detalhe =
      data?.response?.message ??
      data?.message ??
      data?.error ??
      `Evolution erro ${res.status}`
    const msg = typeof detalhe === 'string' ? detalhe : JSON.stringify(detalhe)
    throw new Error(msg)
  }
  return data as T
}

/** Lista instâncias e diz se a nossa já existe. */
async function instanceExists(): Promise<boolean> {
  try {
    const list = await call<Array<{ name?: string; instance?: { instanceName?: string } }>>('GET', '/instance/fetchInstances')
    return list.some((i) => i.name === INSTANCE || i.instance?.instanceName === INSTANCE)
  } catch {
    return false
  }
}

/** Cria a instância se ainda não existir (idempotente). */
export async function ensureInstance(): Promise<void> {
  if (await instanceExists()) return
  await call('POST', '/instance/create', {
    instanceName: INSTANCE,
    qrcode:       true,
    integration:  'WHATSAPP-BAILEYS',
  })
}

/** Estado da conexão da instância. */
export async function getConnectionState(): Promise<ConnectionState> {
  try {
    const data = await call<{ instance?: { state?: string }; state?: string }>(
      'GET', `/instance/connectionState/${INSTANCE}`,
    )
    const state = data.instance?.state ?? data.state
    if (state === 'open' || state === 'connecting' || state === 'close') return state
    return 'desconhecido'
  } catch {
    return 'desconhecido'
  }
}

/** Inicia a conexão e retorna o QR Code em base64 (para o admin escanear). */
export async function connect(): Promise<{ qrcode: string | null; state: ConnectionState }> {
  await ensureInstance()
  const data = await call<{ base64?: string; code?: string; instance?: { state?: string } }>(
    'GET', `/instance/connect/${INSTANCE}`,
  )
  const state = await getConnectionState()
  return { qrcode: data.base64 ?? null, state }
}

/** Desconecta a instância (logout). */
export async function logout(): Promise<void> {
  await call('DELETE', `/instance/logout/${INSTANCE}`)
}

/** Envia uma mensagem de texto. Número no formato internacional (5511999999999). */
export async function sendText(numero: string, texto: string): Promise<void> {
  await call('POST', `/message/sendText/${INSTANCE}`, {
    number: numero,
    text:   texto,
  })
}

/**
 * Envia uma imagem com legenda. `media` pode ser uma URL pública OU base64.
 * Para imagens do nosso storage, prefira base64 (o container Evolution não
 * alcança `localhost` do backend).
 */
export async function sendMedia(
  numero: string,
  media: string,
  caption: string,
  fileName = 'banner.webp',
): Promise<void> {
  await call('POST', `/message/sendMedia/${INSTANCE}`, {
    number:    numero,
    mediatype: 'image',
    mimetype:  'image/webp',
    media,
    caption,
    fileName,
  })
}

/** Envia um documento (ex.: PDF em base64) com legenda opcional. */
export async function sendDocument(
  numero: string,
  base64: string,
  fileName: string,
  caption = '',
  mimetype = 'application/pdf',
): Promise<void> {
  await call('POST', `/message/sendMedia/${INSTANCE}`, {
    number:    numero,
    mediatype: 'document',
    mimetype,
    media:     base64,
    fileName,
    caption,
  })
}
