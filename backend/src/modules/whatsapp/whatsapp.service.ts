/**
 * Lógica de mensagens de WhatsApp (montagem de textos ricos + envio de teste).
 */
import { prisma } from '@/lib/prisma'
import { config } from '@/config'
import { sendText, sendMedia } from '@/lib/evolution'
import { resolveMediaForSend } from '@/lib/storage'
import { formatDataEvento } from '@/lib/format'
import { renderMensagem } from '@/modules/templates/templates.service'
import { NotFoundError, BadRequestError } from '@/lib/errors'

/** Normaliza um número BR para o formato internacional 55DDDNUMERO. */
function formatNumero(raw: string): string {
  const d = raw.replace(/\D/g, '')
  return d.startsWith('55') ? d : `55${d}`
}

/**
 * Envia uma notificação de TESTE de um evento para um número específico,
 * usando o template editável 'evento_novo'. Anexa o banner quando disponível.
 */
export async function enviarTesteEvento(
  numero: string,
  eventoId: string,
  imagemUrl?: string,
): Promise<{ comImagem: boolean }> {
  if (!config.evolution.enabled) {
    throw new BadRequestError('WhatsApp não está configurado no servidor.')
  }

  const evento = await prisma.evento.findUnique({ where: { id: eventoId } })
  if (!evento) throw new NotFoundError('Evento não encontrado')

  const msg = await renderMensagem('evento_novo', {
    nome: 'corretor', evento: evento.titulo, descricao: evento.descricao,
    data: formatDataEvento(evento.data_evento), hora: evento.hora_inicio, hora_fim: evento.hora_fim,
    local: evento.local, endereco: evento.endereco, empreendimento: evento.empreendimento ?? '',
    vagas: evento.capacidade, link: `${config.portalUrl}/portal/eventos/${evento.id}`,
  })
  const mensagem = msg?.texto ?? `*${evento.titulo}*`

  const numeroFmt = formatNumero(numero)
  const imagem    = imagemUrl || evento.banner_url || null

  if (imagem) {
    await sendMedia(numeroFmt, await resolveMediaForSend(imagem), mensagem)
    return { comImagem: true }
  }

  await sendText(numeroFmt, mensagem)
  return { comImagem: false }
}

/** Envia uma mensagem de texto livre de teste para um número. */
export async function enviarTesteTexto(numero: string, texto: string): Promise<void> {
  if (!config.evolution.enabled) {
    throw new BadRequestError('WhatsApp não está configurado no servidor.')
  }
  await sendText(formatNumero(numero), texto)
}
