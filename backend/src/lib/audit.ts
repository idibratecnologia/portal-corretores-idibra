/**
 * Auditoria — registra ações dos administradores (criar/editar/excluir…).
 *
 * É "fire-and-forget": não bloqueia a resposta nem quebra o fluxo se falhar.
 * O ator é extraído do JWT (req.user). Veja a tela de Logs (super-admin).
 */
import type { FastifyRequest } from 'fastify'
import { prisma } from '@/lib/prisma'

export type AuditAcao = 'criou' | 'editou' | 'excluiu' | 'status' | 'enviou' | 'importou' | 'aprovou'
export type AuditEntidade =
  | 'corretor' | 'imobiliaria' | 'evento' | 'usuario' | 'inscricao' | 'certificado' | 'importacao'

/** Registra um evento de auditoria a partir da requisição (ator vem do JWT). */
export function audit(
  req: FastifyRequest,
  acao: AuditAcao,
  entidade: AuditEntidade,
  entidadeId?: string | null,
  label?: string | null,
  detalhe?: string | null,
): void {
  prisma.auditLog.create({
    data: {
      admin_id:    req.user?.sub ?? null,
      admin_nome:  req.user?.nome ?? 'sistema',
      acao,
      entidade,
      entidade_id: entidadeId ?? null,
      label:       label ?? null,
      detalhe:     detalhe ?? null,
    },
  }).catch((err) => {
    console.error('[audit] falha ao registrar log:', err instanceof Error ? err.message : err)
  })
}

interface ListLogsParams {
  page?:     number
  limit?:    number
  entidade?: string
  acao?:     string
  search?:   string
}

/** Lista paginada dos logs (mais recentes primeiro), com filtros opcionais. */
export async function listAuditLogs(params: ListLogsParams) {
  const page  = Math.max(1, params.page ?? 1)
  const limit = Math.min(100, Math.max(1, params.limit ?? 30))
  const skip  = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (params.entidade) where.entidade = params.entidade
  if (params.acao)     where.acao = params.acao
  if (params.search) {
    where.OR = [
      { label:      { contains: params.search, mode: 'insensitive' } },
      { admin_nome: { contains: params.search, mode: 'insensitive' } },
      { detalhe:    { contains: params.search, mode: 'insensitive' } },
    ]
  }

  const [total, data] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { created_at: 'desc' }, skip, take: limit }),
  ])

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
}
