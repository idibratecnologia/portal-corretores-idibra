/**
 * Lógica de mensagens de WhatsApp (montagem de textos ricos + envio de teste).
 */
import { prisma } from '@/lib/prisma'
import { config } from '@/config'
import { sendText, sendMedia } from '@/lib/evolution'
import { resolveMediaForSend } from '@/lib/storage'
import { formatDataEvento } from '@/lib/format'
import { renderMensagem } from '@/modules/templates/templates.service'
import { notify } from '@/lib/notifications'
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

/**
 * Disparo em massa: envia uma mensagem para os corretores selecionados,
 * respeitando o opt-in (LGPD) e a fila com throttle. `{nome}` é substituído
 * pelo primeiro nome do corretor.
 */
export async function broadcast(
  mensagem: string,
  corretorIds: string[],
  opts: { whatsapp: boolean; email: boolean; assunto?: string } = { whatsapp: true, email: false },
): Promise<{ total: number; whatsapp: number; emails: number; semCanal: number }> {
  const corretores = await prisma.corretor.findMany({
    where:  { id: { in: corretorIds } },
    select: { id: true, nome: true, whatsapp: true, whatsapp_opt_in: true, email: true },
  })

  let whatsappCount = 0
  let emailsCount = 0
  let semCanal = 0
  for (const c of corretores) {
    const podeWhats = opts.whatsapp && !!c.whatsapp_opt_in && !!c.whatsapp
    const podeEmail = opts.email && !!c.email
    if (!podeWhats && !podeEmail) { semCanal++; continue }

    await notify({
      corretorId: c.id,
      tipo:       'broadcast',
      whatsapp:   c.whatsapp,
      optIn:      c.whatsapp_opt_in,
      mensagem:   mensagem.replace(/\{nome\}/g, c.nome.split(' ')[0]),
      canais:     { whatsapp: opts.whatsapp, email: opts.email },
      assunto:    opts.assunto,
    })
    if (podeWhats) whatsappCount++
    if (podeEmail) emailsCount++
  }
  return { total: corretores.length, whatsapp: whatsappCount, emails: emailsCount, semCanal }
}
