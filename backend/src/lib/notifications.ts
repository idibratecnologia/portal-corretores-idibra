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
import { emailEnabled, sendEmail, type EmailAttachment } from '@/lib/email-graph'
import { montarHtmlEmail } from '@/lib/email-template'
import { enqueueEmail } from '@/lib/email-queue'

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

const ASSUNTO_EMAIL: Record<NotificacaoTipo, string> = {
  inscricao_confirmada:  'Inscrição confirmada — IDIBRA',
  lembrete_antecedencia: 'Lembrete do seu evento — IDIBRA',
  lembrete_dia:          'Seu evento é hoje — IDIBRA',
  aprovacao:             'IDIBRA — Sua conta',
  checkin:               'Check-in confirmado — IDIBRA',
  cancelamento_evento:   'Evento cancelado — IDIBRA',
  evento_novo:           'Novo evento — IDIBRA',
  certificado:           'Seu certificado de participação — IDIBRA',
  broadcast:             'IDIBRA — Comunicado',
}

/**
 * Envia o e-mail da notificação (canal paralelo ao WhatsApp), via Microsoft Graph.
 * Best-effort: não bloqueia nem derruba o fluxo se falhar/estiver desativado.
 */
function enviarEmailNotificacao(
  corretorId: string, tipo: NotificacaoTipo, mensagem: string, attachments?: EmailAttachment[], assunto?: string,
): void {
  if (!emailEnabled()) return
  enqueueEmail(async () => {
    const corretor = await prisma.corretor.findUnique({ where: { id: corretorId }, select: { email: true } })
    if (!corretor?.email) return
    await sendEmail({ to: corretor.email, subject: assunto || ASSUNTO_EMAIL[tipo], html: montarHtmlEmail(mensagem), attachments })
    console.log(`[email] (${tipo}) → ${corretor.email}`)
  })
}

/** Canais de uma notificação. Por padrão tenta os dois. */
export interface Canais { whatsapp?: boolean; email?: boolean }

interface NotifyParams {
  corretorId:    string
  eventoId?:     string
  tipo:          NotificacaoTipo
  whatsapp:      string
  optIn:         boolean
  mensagem:      string
  imagemUrl?:    string   // URL (storage ou externa) — enviada como imagem + legenda
  imagemBase64?: string   // imagem já em base64 (ex.: QR gerado) — enviada direto
  canais?:       Canais   // padrão: WhatsApp + e-mail
  assunto?:      string   // assunto do e-mail (sobrescreve o padrão do tipo)
  anexo?:        { base64: string; fileName: string; mimeType: string }  // anexo (e-mail) / documento ou imagem (WhatsApp)
}

/**
 * Envia (ou simula) uma notificação WhatsApp e registra no log.
 * Respeita o opt-in do corretor (LGPD): se não consentiu, não envia.
 */
export async function notify(params: NotifyParams): Promise<void> {
  const { corretorId, eventoId, tipo, whatsapp, optIn, mensagem, imagemUrl, imagemBase64, canais, assunto, anexo } = params

  // E-mail: canal independente (não usa o opt-in de WhatsApp). Best-effort.
  if (canais?.email !== false) {
    const emailAnexos = anexo ? [{ name: anexo.fileName, contentBytes: anexo.base64, contentType: anexo.mimeType }] : undefined
    enviarEmailNotificacao(corretorId, tipo, mensagem, emailAnexos, assunto)
  }

  // WhatsApp: respeita o opt-in (LGPD) e a seleção de canal
  if (canais?.whatsapp === false || !optIn) return

  const temAnexo = Boolean(anexo || imagemUrl || imagemBase64)

  // Sem Evolution (dev/test): stub síncrono — loga e registra como enviado.
  if (!config.evolution.enabled) {
    console.log(`[notify:stub] (${tipo}) → ${whatsapp}${temAnexo ? ' [com anexo]' : ''}\n${mensagem}\n`)
    await prisma.notificacaoLog.create({
      data: { corretor_id: corretorId, evento_id: eventoId, tipo, status: 'enviado', mensagem },
    })
    return
  }

  // Produção: enfileira o envio (throttle anti-bloqueio). O log é gravado quando
  // o job efetivamente roda, refletindo o resultado real do envio.
  enqueueWhatsApp(async () => {
    try {
      if (anexo) {
        const digitos = whatsapp.replace(/\D/g, '')
        const numero = digitos.startsWith('55') ? digitos : `55${digitos}`
        if (anexo.mimeType.startsWith('image/')) await sendMedia(numero, anexo.base64, mensagem)
        else await sendDocument(numero, anexo.base64, anexo.fileName, mensagem)
      } else {
        await sendWhatsApp(whatsapp, mensagem, imagemUrl, imagemBase64)
      }
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
  canais?:    Canais
}

/**
 * Envia (ou simula) um documento (PDF) via WhatsApp e registra no log.
 * Respeita o opt-in do corretor (LGPD).
 */
export async function notifyDocument(params: NotifyDocParams): Promise<void> {
  const { corretorId, eventoId, tipo, whatsapp, optIn, base64, fileName, caption, canais } = params

  // E-mail com o documento em anexo (canal independente do opt-in)
  if (canais?.email !== false) {
    enviarEmailNotificacao(corretorId, tipo, caption, [{ name: fileName, contentBytes: base64, contentType: 'application/pdf' }])
  }

  if (canais?.whatsapp === false || !optIn) return

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
