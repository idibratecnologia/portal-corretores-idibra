/**
 * Central de Comunicações — histórico unificado de notificações (WhatsApp + e-mail).
 * Lê o NotificacaoLog, que passou a registrar os dois canais com status.
 */
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resolvePagination, buildPaginated } from '@/lib/pagination'

export interface ListComunicacoesInput {
  canal?:  'whatsapp' | 'email'
  status?: 'enviado' | 'erro'
  tipo?:   string
  q?:      string
  page?:   number
  limit?:  number
}

export async function listComunicacoes(f: ListComunicacoesInput) {
  const { skip, take, page, limit } = resolvePagination({ page: f.page, limit: f.limit })

  const where: Prisma.NotificacaoLogWhereInput = {
    ...(f.canal ? { canal: f.canal } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.tipo ? { tipo: f.tipo } : {}),
    ...(f.q
      ? {
          OR: [
            { corretor: { nome: { contains: f.q, mode: 'insensitive' } } },
            { mensagem: { contains: f.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.notificacaoLog.findMany({
      where, orderBy: { enviado_at: 'desc' }, skip, take,
      include: { corretor: { select: { nome: true } }, evento: { select: { titulo: true } } },
    }),
    prisma.notificacaoLog.count({ where }),
  ])

  const data = rows.map((r) => ({
    id: r.id,
    tipo: r.tipo,
    canal: r.canal,
    status: r.status,
    mensagem: r.mensagem,
    erro: r.erro,
    enviado_at: r.enviado_at,
    corretor_nome: r.corretor?.nome ?? '—',
    evento_titulo: r.evento?.titulo ?? null,
  }))
  return buildPaginated(data, total, page, limit)
}

/** Indicadores rápidos (totais gerais por canal/status). */
export async function resumoComunicacoes() {
  const grupos = await prisma.notificacaoLog.groupBy({
    by: ['canal', 'status'], _count: { _all: true },
  })
  const get = (canal: string, status: string) =>
    grupos.find((g) => g.canal === canal && g.status === status)?._count._all ?? 0
  return {
    whatsapp: { enviado: get('whatsapp', 'enviado'), erro: get('whatsapp', 'erro') },
    email:    { enviado: get('email', 'enviado'), erro: get('email', 'erro') },
  }
}
