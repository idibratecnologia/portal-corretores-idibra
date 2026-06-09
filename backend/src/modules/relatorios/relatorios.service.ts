/**
 * Agregações para o Dashboard e a página de Relatórios.
 * As agregações mais simples usam o Prisma; as que envolvem janelas de tempo
 * ou junções por imobiliária são feitas em memória (volume pequeno).
 */
import { prisma } from '@/lib/prisma'

export type Periodo = '7d' | '30d' | '90d' | '365d' | 'all'

export function sinceDate(periodo: Periodo): Date | null {
  if (periodo === 'all') return null
  const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[periodo]
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

// ─── Dashboard ────────────────────────────────────────────────────

export async function getDashboard() {
  const [
    total_corretores,
    corretores_pendentes,
    eventos_ativos,
    inscricoes_abertas,
    participacoes_confirmadas,
    consideradas,
  ] = await Promise.all([
    prisma.corretor.count(),
    prisma.corretor.count({ where: { status: 'pendente' } }),
    prisma.evento.count({ where: { status: 'publicado' } }),
    prisma.inscricao.count({ where: { status: 'inscrito' } }),
    prisma.inscricao.count({ where: { status: 'presente' } }),
    prisma.inscricao.count({ where: { status: { in: ['presente', 'ausente'] } } }),
  ])

  const taxa_media_presenca = consideradas > 0
    ? Math.round((participacoes_confirmadas / consideradas) * 100)
    : 0

  // Participação por evento (últimos 6 publicados/encerrados)
  const eventos = await prisma.evento.findMany({
    where:   { status: { in: ['publicado', 'encerrado'] } },
    orderBy: { data_evento: 'desc' },
    take:    6,
    include: { inscricoes: { select: { status: true } } },
  })
  const participacao_eventos = eventos
    .map((e) => ({
      evento:    e.titulo.length > 18 ? e.titulo.slice(0, 18) + '…' : e.titulo,
      inscritos: e.inscricoes.filter((i) => i.status !== 'cancelado').length,
      presentes: e.inscricoes.filter((i) => i.status === 'presente').length,
    }))
    .reverse()

  // Top corretores por presenças
  const presentes = await prisma.inscricao.findMany({
    where:   { status: 'presente' },
    include: { corretor: { select: { nome: true, imobiliaria: { select: { nome: true } } } } },
  })

  const corretorMap = new Map<string, number>()
  const imobMap = new Map<string, number>()
  for (const p of presentes) {
    const nome = p.corretor?.nome ?? '—'
    corretorMap.set(nome, (corretorMap.get(nome) ?? 0) + 1)
    const imob = p.corretor?.imobiliaria?.nome ?? 'Sem imobiliária'
    imobMap.set(imob, (imobMap.get(imob) ?? 0) + 1)
  }

  const top_corretores = [...corretorMap.entries()]
    .map(([nome, participacoes]) => ({ nome, participacoes }))
    .sort((a, b) => b.participacoes - a.participacoes)
    .slice(0, 5)

  const participacao_imobiliaria = [...imobMap.entries()]
    .map(([imobiliaria, participacoes]) => ({ imobiliaria, participacoes }))
    .sort((a, b) => b.participacoes - a.participacoes)
    .slice(0, 5)

  // Inscrições por mês (últimos 6 meses)
  const inscricoes_mes = await inscricoesPorMes(6)

  return {
    stats: {
      total_corretores,
      eventos_ativos,
      inscricoes_abertas,
      participacoes_confirmadas,
      corretores_pendentes,
      taxa_media_presenca,
    },
    participacao_eventos,
    inscricoes_mes,
    top_corretores,
    participacao_imobiliaria,
  }
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

async function inscricoesPorMes(qtdMeses: number) {
  const now = new Date()
  const inicio = new Date(now.getFullYear(), now.getMonth() - (qtdMeses - 1), 1)

  const inscricoes = await prisma.inscricao.findMany({
    where:  { created_at: { gte: inicio } },
    select: { created_at: true },
  })

  // Inicializa os buckets dos últimos N meses
  const buckets: { key: string; mes: string; inscricoes: number }[] = []
  for (let i = 0; i < qtdMeses; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (qtdMeses - 1) + i, 1)
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, mes: MESES[d.getMonth()], inscricoes: 0 })
  }

  for (const ins of inscricoes) {
    const d = new Date(ins.created_at)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = buckets.find((b) => b.key === key)
    if (bucket) bucket.inscricoes++
  }

  return buckets.map(({ mes, inscricoes }) => ({ mes, inscricoes }))
}

// ─── Relatório de eventos ────────────────────────────────────────

export async function getRelatorioEventos(periodo: Periodo) {
  const since = sinceDate(periodo)
  const eventos = await prisma.evento.findMany({
    where: {
      status: { in: ['publicado', 'encerrado'] },
      ...(since ? { data_evento: { gte: since } } : {}),
    },
    orderBy: { data_evento: 'desc' },
    include: { inscricoes: { select: { status: true } } },
  })

  return eventos.map((e) => {
    const total     = e.inscricoes.filter((i) => i.status !== 'cancelado').length
    const presentes = e.inscricoes.filter((i) => i.status === 'presente').length
    const ausentes  = e.inscricoes.filter((i) => i.status === 'ausente').length
    const taxa      = total > 0 ? Math.round((presentes / total) * 100) : 0
    return {
      id: e.id, titulo: e.titulo, data_evento: e.data_evento, tipo: e.tipo,
      status: e.status, total, presentes, ausentes, taxa,
    }
  })
}

// ─── Relatório de corretores ─────────────────────────────────────

export async function getRelatorioCorretores(periodo: Periodo) {
  const since = sinceDate(periodo)
  const corretores = await prisma.corretor.findMany({
    include: {
      imobiliaria: { select: { nome: true } },
      inscricoes: {
        where: since ? { created_at: { gte: since } } : undefined,
        select: { status: true },
      },
    },
    orderBy: { nome: 'asc' },
  })

  return corretores
    .map((c) => {
      const total     = c.inscricoes.length
      const presentes = c.inscricoes.filter((i) => i.status === 'presente').length
      const taxa      = total > 0 ? Math.round((presentes / total) * 100) : 0
      return {
        id: c.id, nome: c.nome, creci: c.creci,
        imobiliaria: c.imobiliaria ? { nome: c.imobiliaria.nome } : null,
        cidade: c.cidade, uf: c.uf, total, presentes, taxa,
      }
    })
    .filter((c) => periodo === 'all' || c.total > 0)
    .sort((a, b) => b.presentes - a.presentes)
}

// ─── Relatório de participações ──────────────────────────────────

export async function getRelatorioParticipacoes(periodo: Periodo) {
  const since = sinceDate(periodo)
  const inscricoes = await prisma.inscricao.findMany({
    where:   since ? { created_at: { gte: since } } : undefined,
    orderBy: { created_at: 'desc' },
    include: {
      corretor: { select: { nome: true } },
      evento:   { select: { titulo: true, data_evento: true } },
    },
  })

  return inscricoes.map((i) => ({
    id: i.id,
    corretor: i.corretor ? { nome: i.corretor.nome } : null,
    evento:   i.evento ? { titulo: i.evento.titulo, data_evento: i.evento.data_evento } : null,
    status:   i.status,
    checkin_at: i.checkin_at,
  }))
}
