/**
 * Lógica de negócio dos eventos.
 */
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { NotFoundError, BadRequestError } from '@/lib/errors'
import { notify } from '@/lib/notifications'
import { saveImage, deleteImage } from '@/lib/storage'
import { resolvePagination, buildPaginated } from '@/lib/pagination'
import { renderMensagem } from '@/modules/templates/templates.service'
import { emitAdminRefresh } from '@/lib/events'
import { formatDataEvento } from '@/lib/format'
import { config } from '@/config'
import type { ListEventosInput, CreateEventoInput, UpdateEventoInput } from './eventos.schema'

/** Adiciona total_inscritos e total_presentes a partir das inscrições. */
async function withContagens<T extends { id: string }>(evento: T) {
  const [total_inscritos, total_presentes] = await Promise.all([
    prisma.inscricao.count({ where: { evento_id: evento.id, status: { not: 'cancelado' } } }),
    prisma.inscricao.count({ where: { evento_id: evento.id, status: 'presente' } }),
  ])
  return { ...evento, total_inscritos, total_presentes }
}

// ─── Listagem (admin: todos | corretor: só publicados) ───────────

export async function listEventos(
  filters: ListEventosInput,
  opts: { onlyPublished?: boolean; corretorId?: string } = {},
) {
  const { onlyPublished = false, corretorId } = opts
  const { page, limit, skip, take } = resolvePagination(filters)

  // Condições combináveis (search + visibilidade de exclusivos) via AND
  const and: Prisma.EventoWhereInput[] = []
  if (filters.search) {
    and.push({ OR: [
      { titulo: { contains: filters.search, mode: 'insensitive' } },
      { local:  { contains: filters.search, mode: 'insensitive' } },
    ] })
  }
  // Corretor só vê: eventos não-exclusivos OU exclusivos em que foi convidado
  if (corretorId) {
    and.push({ OR: [
      { exclusivo: false },
      { convidados: { some: { corretor_id: corretorId } } },
    ] })
  }

  const where: Prisma.EventoWhereInput = {
    ...(onlyPublished ? { status: 'publicado' } : (filters.status ? { status: filters.status } : {})),
    ...(filters.tipo ? { tipo: filters.tipo } : {}),
    ...(and.length ? { AND: and } : {}),
  }

  const orderBy: Prisma.EventoOrderByWithRelationInput = filters.sort
    ? { [filters.sort]: filters.order ?? 'asc' }
    : { data_evento: 'desc' }

  const [rows, total] = await Promise.all([
    prisma.evento.findMany({ where, orderBy, skip, take }),
    prisma.evento.count({ where }),
  ])

  const data = await Promise.all(rows.map(withContagens))
  return buildPaginated(data, total, page, limit)
}

// ─── Detalhe ──────────────────────────────────────────────────────

export async function getEventoById(id: string, corretorId?: string) {
  const evento = await prisma.evento.findUnique({
    where:   { id },
    include: { convidados: { select: { corretor_id: true } } },
  })
  if (!evento) throw new NotFoundError('Evento não encontrado')

  // Corretor só acessa evento exclusivo se foi convidado (esconde a existência)
  if (corretorId && evento.exclusivo && !evento.convidados.some((c) => c.corretor_id === corretorId)) {
    throw new NotFoundError('Evento não encontrado')
  }

  const { convidados, ...rest } = evento
  const base = await withContagens(rest)
  // Lista de convidados só é exposta ao admin (corretorId indefinido)
  return corretorId ? base : { ...base, convidados_ids: convidados.map((c) => c.corretor_id) }
}

// ─── Página pública (compartilhamento, sem login) ────────────────

/** Dados públicos de um evento publicado/encerrado e não-exclusivo. */
export async function getEventoPublico(id: string) {
  const ev = await prisma.evento.findUnique({
    where: { id },
    select: {
      id: true, titulo: true, descricao: true, tipo: true, empreendimento: true,
      banner_url: true, data_evento: true, hora_inicio: true, hora_fim: true, carga_horaria: true,
      local: true, endereco: true, link_maps: true, status: true, exclusivo: true,
    },
  })
  // Eventos exclusivos ou não publicados não são divulgados publicamente
  if (!ev || ev.exclusivo || (ev.status !== 'publicado' && ev.status !== 'encerrado')) {
    throw new NotFoundError('Evento não encontrado')
  }
  const { exclusivo: _e, status: _s, ...publico } = ev
  return publico
}

// ─── Criação ──────────────────────────────────────────────────────

export async function createEvento(input: CreateEventoInput) {
  const evento = await prisma.evento.create({
    data: {
      titulo:            input.titulo,
      descricao:         input.descricao ?? '',
      tipo:              input.tipo,
      empreendimento:    input.empreendimento,
      local:             input.local,
      endereco:          input.endereco,
      link_maps:         input.link_maps || null,
      data_evento:       input.data_evento,
      hora_inicio:       input.hora_inicio,
      hora_fim:          input.hora_fim,
      carga_horaria:     input.carga_horaria ?? null,
      capacidade:        input.capacidade,
      inscricoes_abertas: input.inscricoes_abertas ?? true,
      certificados_habilitados: input.certificados_habilitados ?? false,
      enviar_certificado_auto: input.enviar_certificado_auto ?? false,
      exclusivo:         input.exclusivo ?? false,
      status:            'rascunho',
    },
  })
  if (input.exclusivo && input.convidados?.length) {
    await prisma.eventoConvidado.createMany({
      data: input.convidados.map((cid) => ({ evento_id: evento.id, corretor_id: cid })),
      skipDuplicates: true,
    })
  }
  return withContagens(evento)
}

// ─── Atualização ─────────────────────────────────────────────────

export async function updateEvento(id: string, input: UpdateEventoInput) {
  await ensureExists(id)
  const { convidados, ...rest } = input
  const evento = await prisma.evento.update({
    where: { id },
    data: { ...rest, link_maps: rest.link_maps === '' ? null : rest.link_maps },
  })

  // Substitui a lista de convidados quando enviada
  if (convidados !== undefined) {
    await prisma.eventoConvidado.deleteMany({ where: { evento_id: id } })
    if (convidados.length) {
      await prisma.eventoConvidado.createMany({
        data: convidados.map((cid) => ({ evento_id: id, corretor_id: cid })),
        skipDuplicates: true,
      })
    }
  }

  emitAdminRefresh('evento-atualizado')
  return withContagens(evento)
}

// ─── Mudança de status ───────────────────────────────────────────

const TRANSICOES: Record<string, string[]> = {
  rascunho:  ['publicado', 'cancelado'],
  publicado: ['encerrado', 'cancelado'],
  encerrado: [],
  cancelado: [],
}

export async function setStatus(id: string, status: 'rascunho' | 'publicado' | 'encerrado' | 'cancelado') {
  const evento = await prisma.evento.findUnique({ where: { id } })
  if (!evento) throw new NotFoundError('Evento não encontrado')

  // Valida transição
  if (evento.status !== status && !TRANSICOES[evento.status].includes(status)) {
    throw new BadRequestError(`Não é possível mudar de "${evento.status}" para "${status}"`)
  }

  // A transição de publicação é ATÔMICA: só a chamada que de fato mudou
  // rascunho→publicado "vence" e dispara o broadcast. Isso evita mensagens
  // duplicadas quando há clique duplo / requisições concorrentes (race).
  let venceuPublicacao = false
  if (status === 'publicado' && evento.status !== 'publicado') {
    const res = await prisma.evento.updateMany({ where: { id, status: evento.status }, data: { status } })
    venceuPublicacao = res.count === 1
  } else if (evento.status !== status) {
    await prisma.evento.update({ where: { id }, data: { status } })
  }

  const updated = await prisma.evento.findUnique({ where: { id } })
  if (!updated) throw new NotFoundError('Evento não encontrado')

  // Cancelamento → notifica os inscritos (só na transição efetiva)
  if (status === 'cancelado' && evento.status !== 'cancelado') {
    const inscritos = await prisma.inscricao.findMany({
      where:   { evento_id: id, status: { in: ['inscrito', 'presente'] } },
      include: { corretor: true },
    })
    await Promise.all(
      inscritos.map(async (i) => {
        const msg = await renderMensagem('cancelamento_evento', {
          nome: i.corretor.nome, evento: evento.titulo, data: formatDataEvento(evento.data_evento),
        })
        if (msg) {
          await notify({
            corretorId: i.corretor_id, eventoId: id, tipo: 'cancelamento_evento',
            whatsapp: i.corretor.whatsapp, optIn: i.corretor.whatsapp_opt_in, mensagem: msg.texto,
          })
        }
      })
    )
  }

  // Publicação → divulga o novo evento (apenas o "vencedor" da transição)
  if (venceuPublicacao) {
    await broadcastEventoNovo(updated)
  }

  // Mudança de status afeta o sino do admin (eventos próximos publicados)
  emitAdminRefresh('evento-status')
  return withContagens(updated)
}

/** Divulga um evento recém-publicado para todos os corretores ativos com opt-in. */
async function broadcastEventoNovo(evento: Prisma.EventoGetPayload<object>): Promise<void> {
  // Guarda de idempotência: se já houve qualquer divulgação deste evento, não repete.
  const jaDivulgado = await prisma.notificacaoLog.findFirst({
    where: { evento_id: evento.id, tipo: 'evento_novo' },
    select: { id: true },
  })
  if (jaDivulgado) return

  // Exclusivo: divulga só para os convidados (com opt-in). Senão, todos os ativos com opt-in.
  let corretores: Array<{ id: string; nome: string; whatsapp: string }>
  if (evento.exclusivo) {
    const convs = await prisma.eventoConvidado.findMany({
      where:   { evento_id: evento.id },
      include: { corretor: { select: { id: true, nome: true, whatsapp: true, whatsapp_opt_in: true } } },
    })
    corretores = convs.map((c) => c.corretor).filter((c) => c.whatsapp_opt_in)
  } else {
    corretores = await prisma.corretor.findMany({
      where:  { status: 'ativo', whatsapp_opt_in: true },
      select: { id: true, nome: true, whatsapp: true },
    })
  }
  if (corretores.length === 0) return

  for (const c of corretores) {
    const msg = await renderMensagem('evento_novo', {
      nome: c.nome, evento: evento.titulo, descricao: evento.descricao,
      data: formatDataEvento(evento.data_evento), hora: evento.hora_inicio, hora_fim: evento.hora_fim,
      local: evento.local, endereco: evento.endereco, empreendimento: evento.empreendimento ?? '',
      vagas: evento.capacidade, link: `${config.portalUrl}/portal/eventos/${evento.id}`,
    })
    if (!msg) break // template inativo → não envia para ninguém
    await notify({
      corretorId: c.id, eventoId: evento.id, tipo: 'evento_novo',
      whatsapp: c.whatsapp, optIn: true,
      mensagem: msg.texto,
      imagemUrl: msg.comImagem && evento.banner_url ? evento.banner_url : undefined,
    })
  }
}

/**
 * Processa o upload do banner: salva como WebP, remove o anterior
 * e atualiza o banco. Retorna a URL pública.
 */
export async function updateBanner(id: string, buffer: Buffer): Promise<{ banner_url: string }> {
  const evento = await prisma.evento.findUnique({ where: { id }, select: { banner_url: true } })
  if (!evento) throw new NotFoundError('Evento não encontrado')

  const banner_url = await saveImage('banners', buffer)
  await deleteImage(evento.banner_url)

  await prisma.evento.update({ where: { id }, data: { banner_url } })
  return { banner_url }
}

/** Exclui um evento (e suas inscrições via cascade). Remove o banner do storage. */
export async function deleteEvento(id: string): Promise<{ titulo: string }> {
  const evento = await prisma.evento.findUnique({ where: { id }, select: { titulo: true, banner_url: true } })
  if (!evento) throw new NotFoundError('Evento não encontrado')

  await prisma.evento.delete({ where: { id } })
  await deleteImage(evento.banner_url)
  return { titulo: evento.titulo }
}

/** Remove o banner do evento. */
export async function removeBanner(id: string): Promise<void> {
  const evento = await prisma.evento.findUnique({ where: { id }, select: { banner_url: true } })
  if (!evento) throw new NotFoundError('Evento não encontrado')

  await deleteImage(evento.banner_url)
  await prisma.evento.update({ where: { id }, data: { banner_url: null } })
}

// ─── Helpers ──────────────────────────────────────────────────────

async function ensureExists(id: string) {
  const exists = await prisma.evento.findUnique({ where: { id }, select: { id: true } })
  if (!exists) throw new NotFoundError('Evento não encontrado')
}
