/**
 * Camada de notificações WhatsApp.
 *
 * No Bloco 2, é um stub seguro: registra o disparo no NotificacaoLog e loga no
 * console, mas NÃO envia mensagens reais (Evolution API entra no Bloco 4).
 *
 * Os pontos de disparo já estão chamando estas funções nos services — o Bloco 4
 * só precisará preencher a função `sendWhatsApp` com o cliente Evolution real.
 */
import { prisma } from '@/lib/prisma'
import { config } from '@/config'
import { sendText, sendMedia, sendDocument } from '@/lib/evolution'
import { resolveMediaForSend } from '@/lib/storage'
import { enqueueWhatsApp } from '@/lib/whatsapp-queue'

export type NotificacaoTipo =
  | 'inscricao_confirmada'
  | 'lembrete_antecedencia'
  | 'lembrete_dia'
  | 'aprovacao'
  | 'checkin'
  | 'cancelamento_evento'
  | 'evento_novo'
  | 'certificado'
  | 'broadcast'

interface NotifyParams {
  corretorId:    string
  eventoId?:     string
  tipo:          NotificacaoTipo
  whatsapp:      string
  optIn:         boolean
  mensagem:      string
  imagemUrl?:    string   // URL (storage ou externa) — enviada como imagem + legenda
  imagemBase64?: string   // imagem já em base64 (ex.: QR gerado) — enviada direto
}

/**
 * Envia (ou simula) uma notificação WhatsApp e registra no log.
 * Respeita o opt-in do corretor (LGPD): se não consentiu, não envia.
 */
export async function notify(params: NotifyParams): Promise<void> {
  const { corretorId, eventoId, tipo, whatsapp, optIn, mensagem, imagemUrl, imagemBase64 } = params

  // LGPD: só dispara se o corretor consentiu
  if (!optIn) return

  const temImagem = Boolean(imagemUrl || imagemBase64)

  // Sem Evolution (dev/test): stub síncrono — loga e registra como enviado.
  if (!config.evolution.enabled) {
    console.log(`[notify:stub] (${tipo}) → ${whatsapp}${temImagem ? ' [com imagem]' : ''}\n${mensagem}\n`)
    await prisma.notificacaoLog.create({
      data: { corretor_id: corretorId, evento_id: eventoId, tipo, status: 'enviado', mensagem },
    })
    return
  }

  // Produção: enfileira o envio (throttle anti-bloqueio). O log é gravado quando
  // o job efetivamente roda, refletindo o resultado real do envio.
  enqueueWhatsApp(async () => {
    try {
      await sendWhatsApp(whatsapp, mensagem, imagemUrl, imagemBase64)
      await prisma.notificacaoLog.create({
        data: { corretor_id: corretorId, evento_id: eventoId, tipo, status: 'enviado', mensagem },
      })
    } catch (err) {
      await prisma.notificacaoLog.create({
        data: {
          corretor_id: corretorId,
          evento_id:   eventoId,
          tipo,
          status:      'erro',
          mensagem,
          erro:        err instanceof Error ? err.message : String(err),
        },
      })
    }
  })
}

interface NotifyDocParams {
  corretorId: string
  eventoId?:  string
  tipo:       NotificacaoTipo
  whatsapp:   string
  optIn:      boolean
  base64:     string   // documento (ex.: PDF) em base64
  fileName:   string
  caption:    string
}

/**
 * Envia (ou simula) um documento (PDF) via WhatsApp e registra no log.
 * Respeita o opt-in do corretor (LGPD).
 */
export async function notifyDocument(params: NotifyDocParams): Promise<void> {
  const { corretorId, eventoId, tipo, whatsapp, optIn, base64, fileName, caption } = params
  if (!optIn) return

  if (!config.evolution.enabled) {
    console.log(`[notify:stub doc] (${tipo}) → ${whatsapp} [${fileName}]`)
    await prisma.notificacaoLog.create({
      data: { corretor_id: corretorId, evento_id: eventoId, tipo, status: 'enviado', mensagem: caption },
    })
    return
  }

  enqueueWhatsApp(async () => {
    try {
      const digitos = whatsapp.replace(/\D/g, '')
      const numero = digitos.startsWith('55') ? digitos : `55${digitos}`
      await sendDocument(numero, base64, fileName, caption)
      await prisma.notificacaoLog.create({
        data: { corretor_id: corretorId, evento_id: eventoId, tipo, status: 'enviado', mensagem: caption },
      })
    } catch (err) {
      await prisma.notificacaoLog.create({
        data: {
          corretor_id: corretorId, evento_id: eventoId, tipo, status: 'erro', mensagem: caption,
          erro: err instanceof Error ? err.message : String(err),
        },
      })
    }
  })
}

/**
 * Envia a mensagem via Evolution API.
 * Converte o número para o formato internacional (55 + dígitos).
 */
async function sendWhatsApp(
  whatsapp: string,
  mensagem: string,
  imagemUrl?: string,
  imagemBase64?: string,
): Promise<void> {
  const digitos = whatsapp.replace(/\D/g, '')
  // Evita duplicar o DDI se o número já vier com 55
  const numero = digitos.startsWith('55') ? digitos : `55${digitos}`
  if (imagemBase64) {
    await sendMedia(numero, imagemBase64, mensagem)
  } else if (imagemUrl) {
    const media = await resolveMediaForSend(imagemUrl)
    await sendMedia(numero, media, mensagem)
  } else {
    await sendText(numero, mensagem)
  }
}
