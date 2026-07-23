/**
 * Lógica de negócio dos corretores.
 */
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { NotFoundError, ConflictError } from '@/lib/errors'
import { hashPassword } from '@/lib/hash'
import { notify } from '@/lib/notifications'
import { saveImage, deleteImage } from '@/lib/storage'
import { resolvePagination, buildPaginated } from '@/lib/pagination'
import { renderMensagem } from '@/modules/templates/templates.service'
import { enviarLinkResetCorretor } from '@/modules/auth/auth.service'
import { getRegras } from '@/modules/configuracoes/configuracoes.service'
import { emitAdminRefresh } from '@/lib/events'
import { config } from '@/config'
import type { ListCorretoresInput, CreateCorretorInput, UpdateCorretorInput } from './corretores.schema'

const portalUrl = () => config.portalUrl

/** Campos seguros para retornar (sem a senha). */
const corretorSelect = {
  id:              true,
  nome:            true,
  cpf:             true,
  creci:           true,
  email:           true,
  telefone:        true,
  whatsapp:        true,
  whatsapp_opt_in: true,
  email_opt_in:    true,
  senha_provisoria: true,
  instagram:       true,
  data_nascimento: true,
  cidade:          true,
  uf:              true,
  status:          true,
  foto_url:        true,
  observacoes_admin: true,
  imobiliaria_id:  true,
  imobiliaria:     { select: { id: true, nome: true } },
  created_at:      true,
  updated_at:      true,
  _count:          { select: { inscricoes: true } },
} satisfies Prisma.CorretorSelect

/** Remove _count e expõe total_eventos (formato do frontend). */
function mapCorretor<T extends { _count: { inscricoes: number } }>(c: T) {
  const { _count, ...rest } = c
  return { ...rest, total_eventos: _count.inscricoes }
}

// ─── Listagem paginada (admin) ───────────────────────────────────

export async function listCorretores(filters: ListCorretoresInput) {
  const { page, limit, skip, take } = resolvePagination(filters)

  // WHERE em SQL (permite ordenar por lower() e buscar CPF ignorando pontuação).
  const conds: Prisma.Sql[] = []
  if (filters.status)         conds.push(Prisma.sql`status = ${filters.status}`)
  if (filters.imobiliaria_id) conds.push(Prisma.sql`imobiliaria_id = ${filters.imobiliaria_id}::uuid`)
  if (filters.search) {
    const like = `%${filters.search}%`
    const partes: Prisma.Sql[] = [
      Prisma.sql`nome ILIKE ${like}`,
      Prisma.sql`creci ILIKE ${like}`,
      Prisma.sql`email ILIKE ${like}`,
      Prisma.sql`cpf ILIKE ${like}`,
    ]
    const digitos = filters.search.replace(/\D/g, '')
    if (digitos.length >= 3) partes.push(Prisma.sql`regexp_replace(cpf, '[^0-9]', '', 'g') LIKE ${'%' + digitos + '%'}`)
    conds.push(Prisma.sql`(${Prisma.join(partes, ' OR ')})`)
  }
  const whereSql = conds.length ? Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}` : Prisma.empty

  // ORDER — texto ordenado por lower() para ficar em ordem alfabética real
  // (independe de MAIÚSCULAS/minúsculas). Demais campos, ordem natural.
  const ORDER_COL: Record<string, Prisma.Sql> = {
    nome:       Prisma.sql`lower(trim(nome))`,
    creci:      Prisma.sql`creci`,
    status:     Prisma.sql`status`,
    cidade:     Prisma.sql`lower(trim(cidade))`,
    created_at: Prisma.sql`created_at`,
  }
  const orderCol = ORDER_COL[filters.sort ?? 'nome'] ?? Prisma.sql`lower(trim(nome))`
  const orderDir = filters.order === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`

  const idRows = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT id FROM corretores ${whereSql} ORDER BY ${orderCol} ${orderDir} LIMIT ${take} OFFSET ${skip}`,
  )
  const countRows = await prisma.$queryRaw<{ count: bigint }[]>(
    Prisma.sql`SELECT count(*)::bigint AS count FROM corretores ${whereSql}`,
  )
  const total = Number(countRows[0]?.count ?? 0)
  const ids = idRows.map((r) => r.id)

  const rows = await prisma.corretor.findMany({ where: { id: { in: ids } }, select: corretorSelect })
  const byId = new Map(rows.map((r) => [r.id, r]))
  const ordenados = ids.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r)

  return buildPaginated(ordenados.map(mapCorretor), total, page, limit)
}

/** Lista (sem paginação) de corretores para seletores — disparos, convidados, etc. */
export async function listCorretoresOpcoes(status?: 'pendente' | 'ativo' | 'bloqueado') {
  const rows = await prisma.corretor.findMany({
    where: status ? { status } : {},
    select: {
      id: true, nome: true, creci: true, cidade: true, uf: true,
      whatsapp: true, whatsapp_opt_in: true, email: true, email_opt_in: true,
      imobiliaria_id: true, status: true,
      imobiliaria: { select: { nome: true } },
    },
  })
  // Ordena em ordem alfabética real (ignora MAIÚSCULAS/acentos/espaços nas pontas).
  return rows.sort((a, b) => a.nome.trim().localeCompare(b.nome.trim(), 'pt-BR', { sensitivity: 'base' }))
}

// ─── Detalhe ──────────────────────────────────────────────────────

export async function getCorretorById(id: string) {
  const corretor = await prisma.corretor.findUnique({ where: { id }, select: corretorSelect })
  if (!corretor) throw new NotFoundError('Corretor não encontrado')
  return mapCorretor(corretor)
}

export async function getMeuPerfil(corretorId: string) {
  return getCorretorById(corretorId)
}

// ─── Criação (admin) ─────────────────────────────────────────────

export async function createCorretor(input: CreateCorretorInput) {
  await ensureUnique(input.email, input.cpf, input.creci)

  // Se admin não informar senha, gera uma temporária (corretor reseta depois)
  const senhaPlana = input.senha ?? Math.random().toString(36).slice(-10)
  const senhaHash  = await hashPassword(senhaPlana)

  // Respeita a aprovação automática: com ela ligada, o corretor já entra ativo
  // (senão o admin teria de aprovar mesmo tendo cadastrado).
  const { auto_approve } = await getRegras()

  const corretor = await prisma.corretor.create({
    data: {
      nome:            input.nome.trim(),
      cpf:             input.cpf,
      creci:           input.creci,
      email:           input.email,
      senha:           senhaHash,
      telefone:        input.telefone || input.whatsapp,
      whatsapp:        input.whatsapp,
      whatsapp_opt_in: input.whatsapp_opt_in ?? false,
      instagram:       input.instagram,
      data_nascimento: input.data_nascimento ?? null,
      cidade:          input.cidade.trim(),
      uf:              input.uf.toUpperCase(),
      imobiliaria_id:  input.imobiliaria_id,
      observacoes_admin: input.observacoes_admin,
      status:          auto_approve ? 'ativo' : 'pendente',
    },
    select: corretorSelect,
  })

  // Novo cadastro pendente → avisa os admins em tempo real
  emitAdminRefresh('corretor-cadastro')
  return mapCorretor(corretor)
}

// ─── Atualização ─────────────────────────────────────────────────

export async function updateCorretor(id: string, input: UpdateCorretorInput) {
  await ensureExists(id)

  // Valida duplicidade se algum identificador único mudou
  if (input.email || input.cpf || input.creci) {
    const dup = await prisma.corretor.findFirst({
      where: {
        NOT: { id },
        OR: [
          ...(input.email ? [{ email: input.email }] : []),
          ...(input.cpf   ? [{ cpf: input.cpf }] : []),
          ...(input.creci ? [{ creci: input.creci }] : []),
        ],
      },
      select: { nome: true, email: true, cpf: true, creci: true, status: true },
    })
    if (dup) {
      const quem = `${dup.nome} (${STATUS_LABEL_CORRETOR[dup.status] ?? dup.status})`
      const campo = input.email && dup.email === input.email ? 'E-mail'
        : input.cpf && dup.cpf === input.cpf ? 'CPF' : 'CRECI'
      throw new ConflictError(`${campo} já cadastrado para ${quem}`)
    }
  }

  const corretor = await prisma.corretor.update({
    where: { id },
    data: {
      ...input,
      nome: input.nome ? input.nome.trim() : undefined,
      cidade: input.cidade ? input.cidade.trim() : undefined,
      uf: input.uf ? input.uf.toUpperCase() : undefined,
      // telefone é legado: mantém sincronizado com o WhatsApp
      telefone: input.telefone || input.whatsapp || undefined,
    },
    select: corretorSelect,
  })

  return mapCorretor(corretor)
}

// ─── Status (aprovar / bloquear) ─────────────────────────────────

export async function setStatus(id: string, status: 'pendente' | 'ativo' | 'bloqueado') {
  const corretor = await prisma.corretor.findUnique({ where: { id } })
  if (!corretor) throw new NotFoundError('Corretor não encontrado')

  const updated = await prisma.corretor.update({
    where: { id },
    data: { status },
    select: corretorSelect,
  })

  // Dispara WhatsApp de aprovação quando vira 'ativo' (template editável)
  if (status === 'ativo' && corretor.status !== 'ativo') {
    const msg = await renderMensagem('aprovacao', { nome: corretor.nome, link: portalUrl() })
    if (msg) {
      await notify({
        corretorId: corretor.id, tipo: 'aprovacao',
        whatsapp: corretor.whatsapp, optIn: corretor.whatsapp_opt_in, mensagem: msg.texto,
      })
    }
  }

  // Mudança de status altera a contagem de pendentes → atualiza o sino
  if (corretor.status !== status) emitAdminRefresh('corretor-status')
  return mapCorretor(updated)
}

// ─── Opt-in WhatsApp (LGPD) ──────────────────────────────────────

export async function setOptIn(id: string, opt_in: boolean) {
  await ensureExists(id)
  await prisma.corretor.update({ where: { id }, data: { whatsapp_opt_in: opt_in } })
}

/**
 * Processa o upload da foto: salva como WebP, remove a foto anterior
 * e atualiza o banco. Retorna a URL pública.
 */
export async function updateFoto(id: string, buffer: Buffer): Promise<{ foto_url: string }> {
  const corretor = await prisma.corretor.findUnique({
    where: { id }, select: { foto_url: true },
  })
  if (!corretor) throw new NotFoundError('Corretor não encontrado')

  const foto_url = await saveImage('fotos', buffer)
  await deleteImage(corretor.foto_url)   // remove a antiga (se houver)

  await prisma.corretor.update({ where: { id }, data: { foto_url } })
  return { foto_url }
}

/**
 * Admin solicita o reset de senha de um corretor: gera um token e envia o
 * LINK de redefinição pelo WhatsApp do corretor (mesmo fluxo do "Esqueci a senha").
 */
export async function resetSenhaAdmin(id: string): Promise<{ enviado: true; whatsapp: string }> {
  const { whatsapp } = await enviarLinkResetCorretor(id)
  return { enviado: true, whatsapp }
}

/** Exclui um corretor (e suas inscrições via cascade). Remove a foto do storage. */
export async function deleteCorretor(id: string): Promise<{ nome: string }> {
  const corretor = await prisma.corretor.findUnique({ where: { id }, select: { nome: true, foto_url: true } })
  if (!corretor) throw new NotFoundError('Corretor não encontrado')

  await prisma.corretor.delete({ where: { id } })
  await deleteImage(corretor.foto_url)
  return { nome: corretor.nome }
}

/** Remove a foto de perfil. */
export async function removeFoto(id: string): Promise<void> {
  const corretor = await prisma.corretor.findUnique({
    where: { id }, select: { foto_url: true },
  })
  if (!corretor) throw new NotFoundError('Corretor não encontrado')

  await deleteImage(corretor.foto_url)
  await prisma.corretor.update({ where: { id }, data: { foto_url: null } })
}

// ─── Helpers ──────────────────────────────────────────────────────

async function ensureExists(id: string) {
  const exists = await prisma.corretor.findUnique({ where: { id }, select: { id: true } })
  if (!exists) throw new NotFoundError('Corretor não encontrado')
}

const STATUS_LABEL_CORRETOR: Record<string, string> = {
  pendente: 'pendente', ativo: 'ativo', bloqueado: 'bloqueado',
}

async function ensureUnique(email: string, cpf: string, creci: string) {
  const existing = await prisma.corretor.findFirst({
    where: { OR: [{ email }, { cpf }, { creci }] },
    select: { nome: true, email: true, cpf: true, creci: true, status: true },
  })
  if (existing) {
    const quem = `${existing.nome} (${STATUS_LABEL_CORRETOR[existing.status] ?? existing.status})`
    if (existing.email === email) throw new ConflictError(`E-mail já cadastrado para ${quem}`)
    if (existing.cpf   === cpf)   throw new ConflictError(`CPF já cadastrado para ${quem}`)
    throw new ConflictError(`CRECI já cadastrado para ${quem}`)
  }
}
