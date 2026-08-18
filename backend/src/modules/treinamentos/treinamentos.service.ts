/**
 * Lógica de negócio dos Treinamentos.
 *
 *  - Treinamento = trilha/curso (container). Os vídeos ficam nas AULAS.
 *  - Upload de vídeo por aula (stream → disco) + processamento FFmpeg via FILA.
 *  - Liberação por data (cada aula) OU sequencial (libera ao concluir a anterior).
 *  - Progresso por aula; conclusão automática aos 90%.
 *  - Vídeos/documentos em storage PRIVADO (servidos por rota protegida).
 */
import { join, resolve, extname } from 'path'
import { rm } from 'fs/promises'
import { randomUUID } from 'crypto'
import type { Readable } from 'stream'
import type { TreinamentoAula, StatusProgresso } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { config } from '@/config'
import { NotFoundError, BadRequestError, ForbiddenError } from '@/lib/errors'
import { emitAdminRefresh } from '@/lib/events'
import {
  caminhoAbsoluto, salvarStream, removerArquivo, removerPastaTreinamento, removerPastaRel, existeArquivo,
} from '@/lib/treinamento-storage'
import { enfileirarProcessamento } from '@/lib/video-queue'
import { saveImage, deleteImage } from '@/lib/storage'
import { gerarCertificadoTreinamentoPdf, pngParaPdf } from '@/lib/certificado'
import { renderModeloPng } from '@/lib/modelo-render'
import { notifyDocument } from '@/lib/notifications'

// ─── Caminhos ────────────────────────────────────────────────────
const relAulaOriginal = (tid: string, aid: string, fn: string) => `treinamentos/${tid}/aulas/${aid}/original/${fn}`
const relAulaPasta = (tid: string, aid: string) => `treinamentos/${tid}/aulas/${aid}`
const relDoc = (tid: string, fn: string) => `treinamentos/${tid}/documentos/${fn}`
const thumbPublicoAulaDir = (tid: string, aid: string) => join(resolve(config.upload.dir), 'treinamentos', tid, 'aulas', aid)

// ─── Tipos de input ──────────────────────────────────────────────
export interface CreateTreinamentoInput {
  titulo: string; descricao?: string; obrigatorio?: boolean; liberacao_sequencial?: boolean; avulso?: boolean
  certificado_habilitado?: boolean; carga_horaria?: number | null; certificado_auto_enviar?: boolean
  certificado_modelo_id?: string | null
}
export type UpdateTreinamentoInput = Partial<CreateTreinamentoInput> & { ativo?: boolean }

export interface AulaInput {
  titulo: string
  descricao?: string
  data_liberacao?: Date | null
  data_encerramento?: Date | null
  excluir_video_automaticamente?: boolean
  dias_para_exclusao?: number | null
}

// ─── Helpers de regra ────────────────────────────────────────────
export function dataLiberada(d: Date | null): boolean { return !d || d.getTime() <= Date.now() }
export function dataEncerrada(d: Date | null): boolean { return !!d && d.getTime() < Date.now() }

async function ensureTreinamento(id: string) {
  const t = await prisma.treinamento.findUnique({ where: { id }, select: { id: true } })
  if (!t) throw new NotFoundError('Treinamento não encontrado')
}

async function recalcularExclusaoAula(aulaId: string) {
  const a = await prisma.treinamentoAula.findUnique({
    where: { id: aulaId },
    select: { data_encerramento: true, dias_para_exclusao: true, excluir_video_automaticamente: true },
  })
  if (!a) return
  let data: Date | null = null
  if (a.excluir_video_automaticamente && a.data_encerramento && a.dias_para_exclusao != null) {
    data = new Date(a.data_encerramento.getTime() + a.dias_para_exclusao * 86_400_000)
  }
  await prisma.treinamentoAula.update({ where: { id: aulaId }, data: { data_exclusao_video: data } })
}

// ════════════════════════════════════════════════════════════════
//  TREINAMENTO (container) — CRUD admin
// ════════════════════════════════════════════════════════════════

export function listTreinamentos(filtros: { search?: string; ativo?: 'true' | 'false' }) {
  return prisma.treinamento.findMany({
    where: {
      ...(filtros.ativo ? { ativo: filtros.ativo === 'true' } : {}),
      ...(filtros.search ? { titulo: { contains: filtros.search, mode: 'insensitive' } } : {}),
    },
    orderBy: { created_at: 'desc' },
    include: {
      _count: { select: { aulas: true, eventos: true, documentos: true } },
      aulas: { orderBy: { ordem: 'asc' }, select: { thumbnail_url: true, status_video: true } },
    },
  })
}

export async function getTreinamento(id: string) {
  const t = await prisma.treinamento.findUnique({
    where: { id },
    include: {
      aulas: { orderBy: { ordem: 'asc' } },
      documentos: { orderBy: { created_at: 'asc' } },
      eventos: { include: { evento: { select: { id: true, titulo: true } } } },
    },
  })
  if (!t) throw new NotFoundError('Treinamento não encontrado')
  return t
}

export async function createTreinamento(input: CreateTreinamentoInput) {
  const t = await prisma.treinamento.create({
    data: {
      titulo: input.titulo,
      descricao: input.descricao ?? '',
      obrigatorio: input.obrigatorio ?? false,
      liberacao_sequencial: input.liberacao_sequencial ?? false,
      avulso: input.avulso ?? false,
    },
  })
  emitAdminRefresh('treinamento-criado')
  return t
}

export async function updateTreinamento(id: string, input: UpdateTreinamentoInput) {
  await ensureTreinamento(id)
  const t = await prisma.treinamento.update({ where: { id }, data: { ...input } })
  emitAdminRefresh('treinamento-atualizado')
  return t
}

export async function setAtivo(id: string, ativo: boolean) {
  await ensureTreinamento(id)
  const t = await prisma.treinamento.update({ where: { id }, data: { ativo } })
  emitAdminRefresh('treinamento-status')
  return t
}

/** Define a capa do curso (imagem própria). Remove a anterior se houver. */
export async function setCapa(id: string, buffer: Buffer) {
  const atual = await prisma.treinamento.findUnique({ where: { id }, select: { capa_url: true } })
  if (!atual) throw new NotFoundError('Treinamento não encontrado')
  const capa_url = await saveImage('banners', buffer)
  if (atual.capa_url) await deleteImage(atual.capa_url)
  const t = await prisma.treinamento.update({ where: { id }, data: { capa_url } })
  emitAdminRefresh('treinamento-atualizado')
  return t
}

export async function removerCapa(id: string) {
  const atual = await prisma.treinamento.findUnique({ where: { id }, select: { capa_url: true } })
  if (!atual) throw new NotFoundError('Treinamento não encontrado')
  if (atual.capa_url) await deleteImage(atual.capa_url)
  const t = await prisma.treinamento.update({ where: { id }, data: { capa_url: null } })
  emitAdminRefresh('treinamento-atualizado')
  return t
}

export async function deleteTreinamento(id: string) {
  const t = await prisma.treinamento.findUnique({ where: { id }, select: { titulo: true } })
  if (!t) throw new NotFoundError('Treinamento não encontrado')
  await prisma.treinamento.delete({ where: { id } }) // cascata: aulas, progressos, docs, vínculos
  await removerPastaTreinamento(id)
  await rm(join(resolve(config.upload.dir), 'treinamentos', id), { recursive: true, force: true }).catch(() => {})
  emitAdminRefresh('treinamento-excluido')
  return { titulo: t.titulo }
}

// ════════════════════════════════════════════════════════════════
//  AULAS — CRUD admin
// ════════════════════════════════════════════════════════════════

export async function createAula(treinamentoId: string, input: AulaInput) {
  await ensureTreinamento(treinamentoId)
  const agg = await prisma.treinamentoAula.aggregate({ where: { treinamento_id: treinamentoId }, _max: { ordem: true } })
  const aula = await prisma.treinamentoAula.create({
    data: {
      treinamento_id: treinamentoId,
      titulo: input.titulo,
      descricao: input.descricao ?? '',
      ordem: (agg._max.ordem ?? 0) + 1,
      data_liberacao: input.data_liberacao ?? null,
      data_encerramento: input.data_encerramento ?? null,
      excluir_video_automaticamente: input.excluir_video_automaticamente ?? false,
      dias_para_exclusao: input.dias_para_exclusao ?? null,
    },
  })
  await recalcularExclusaoAula(aula.id)
  emitAdminRefresh('aula-criada')
  return aula
}

export async function updateAula(aulaId: string, input: Partial<AulaInput>) {
  const exists = await prisma.treinamentoAula.findUnique({ where: { id: aulaId }, select: { id: true } })
  if (!exists) throw new NotFoundError('Aula não encontrada')
  const aula = await prisma.treinamentoAula.update({ where: { id: aulaId }, data: { ...input } })
  await recalcularExclusaoAula(aulaId)
  emitAdminRefresh('aula-atualizada')
  return aula
}

export async function deleteAula(aulaId: string) {
  const a = await prisma.treinamentoAula.findUnique({ where: { id: aulaId }, select: { id: true, treinamento_id: true, titulo: true } })
  if (!a) throw new NotFoundError('Aula não encontrada')
  await prisma.treinamentoAula.delete({ where: { id: aulaId } })
  await removerPastaRel(relAulaPasta(a.treinamento_id, aulaId))
  await rm(thumbPublicoAulaDir(a.treinamento_id, aulaId), { recursive: true, force: true }).catch(() => {})
  emitAdminRefresh('aula-excluida')
  return { titulo: a.titulo }
}

export async function reordenarAulas(treinamentoId: string, ordemIds: string[]) {
  await prisma.$transaction(
    ordemIds.map((id, idx) =>
      prisma.treinamentoAula.updateMany({ where: { id, treinamento_id: treinamentoId }, data: { ordem: idx + 1 } }),
    ),
  )
  emitAdminRefresh('aulas-reordenadas')
}

/** Recebe o upload do vídeo de uma aula (stream → disco) e enfileira a conversão. */
export async function receberVideoAula(aulaId: string, stream: Readable, filename: string) {
  const aula = await prisma.treinamentoAula.findUnique({ where: { id: aulaId }, select: { id: true, treinamento_id: true } })
  if (!aula) throw new NotFoundError('Aula não encontrada')

  const fn = `original${extname(filename) || '.mp4'}`
  const origRel = relAulaOriginal(aula.treinamento_id, aulaId, fn)
  await salvarStream(stream, caminhoAbsoluto(origRel))

  if ((stream as { truncated?: boolean }).truncated) {
    await removerArquivo(origRel)
    throw new BadRequestError('Vídeo excede o limite permitido')
  }

  await prisma.treinamentoAula.update({
    where: { id: aulaId },
    data: { status_video: 'upload_recebido', original_path: origRel, video_erro: null, video_excluido: false },
  })
  enfileirarProcessamento({ aulaId, treinamentoId: aula.treinamento_id, origRel })
  emitAdminRefresh('treinamento-video')
  return { status_video: 'upload_recebido' as const }
}

// ════════════════════════════════════════════════════════════════
//  DOCUMENTOS (nível do treinamento)
// ════════════════════════════════════════════════════════════════

export async function addDocumento(treinamentoId: string, stream: Readable, filename: string, titulo?: string) {
  await ensureTreinamento(treinamentoId)
  const fn = `${randomUUID()}${extname(filename).toLowerCase()}`
  const rel = relDoc(treinamentoId, fn)
  await salvarStream(stream, caminhoAbsoluto(rel))
  return prisma.treinamentoDocumento.create({ data: { treinamento_id: treinamentoId, titulo: titulo || filename, path: rel } })
}

export async function removerDocumento(docId: string) {
  const d = await prisma.treinamentoDocumento.findUnique({ where: { id: docId } })
  if (!d) throw new NotFoundError('Documento não encontrado')
  await prisma.treinamentoDocumento.delete({ where: { id: docId } })
  await removerArquivo(d.path)
}

// ════════════════════════════════════════════════════════════════
//  VÍNCULO COM EVENTOS
// ════════════════════════════════════════════════════════════════

export async function vincularEvento(treinamentoId: string, eventoId: string, obrigatorio?: boolean) {
  await ensureTreinamento(treinamentoId)
  const ev = await prisma.evento.findUnique({ where: { id: eventoId }, select: { id: true } })
  if (!ev) throw new NotFoundError('Evento não encontrado')
  const agg = await prisma.treinamentoEvento.aggregate({ where: { evento_id: eventoId }, _max: { ordem: true } })
  return prisma.treinamentoEvento.upsert({
    where: { treinamento_id_evento_id: { treinamento_id: treinamentoId, evento_id: eventoId } },
    update: { obrigatorio: obrigatorio ?? null },
    create: { treinamento_id: treinamentoId, evento_id: eventoId, obrigatorio: obrigatorio ?? null, ordem: (agg._max.ordem ?? 0) + 1 },
  })
}

export async function desvincularEvento(vinculoId: string) {
  const v = await prisma.treinamentoEvento.findUnique({ where: { id: vinculoId } })
  if (!v) throw new NotFoundError('Vínculo não encontrado')
  await prisma.treinamentoEvento.delete({ where: { id: vinculoId } })
}

export async function ordenarEvento(eventoId: string, ordemIds: string[]) {
  await prisma.$transaction(
    ordemIds.map((id, idx) =>
      prisma.treinamentoEvento.updateMany({ where: { id, evento_id: eventoId }, data: { ordem: idx + 1 } }),
    ),
  )
}

export function listTreinamentosDoEvento(eventoId: string) {
  return prisma.treinamentoEvento.findMany({
    where: { evento_id: eventoId },
    orderBy: { ordem: 'asc' },
    include: { treinamento: { include: { _count: { select: { aulas: true } }, aulas: { orderBy: { ordem: 'asc' }, select: { thumbnail_url: true, status_video: true, video_duracao: true } } } } },
  })
}

// ════════════════════════════════════════════════════════════════
//  VISÃO DO CORRETOR (com progresso e liberação)
// ════════════════════════════════════════════════════════════════

type AulaComProgresso = TreinamentoAula
type ProgressoMap = Map<string, { status: StatusProgresso; percentual: number; segundos_assistidos: number; concluido_em: Date | null }>

/** Uma aula está liberada para o corretor? (data OU sequencial). */
function aulaLiberada(aula: AulaComProgresso, sequencial: boolean, aulasOrdenadas: AulaComProgresso[], prog: ProgressoMap): boolean {
  if (sequencial) {
    const idx = aulasOrdenadas.findIndex((a) => a.id === aula.id)
    if (idx <= 0) return true
    const anterior = aulasOrdenadas[idx - 1]
    return prog.get(anterior.id)?.status === 'concluido'
  }
  return dataLiberada(aula.data_liberacao)
}

function motivoBloqueio(aula: AulaComProgresso, sequencial: boolean): string | null {
  if (sequencial) return 'Conclua a aula anterior para liberar'
  if (!dataLiberada(aula.data_liberacao) && aula.data_liberacao) {
    return `Disponível em ${aula.data_liberacao.toLocaleDateString('pt-BR')}`
  }
  return null
}

function montarAulaCorretor(aula: AulaComProgresso, liberada: boolean, sequencial: boolean, prog: ProgressoMap) {
  const p = prog.get(aula.id)
  return {
    id: aula.id,
    titulo: aula.titulo,
    descricao: aula.descricao,
    ordem: aula.ordem,
    video_duracao: aula.video_duracao,
    thumbnail_url: aula.thumbnail_url,
    video_disponivel: aula.status_video === 'disponivel' && !aula.video_excluido,
    data_liberacao: aula.data_liberacao,
    data_encerramento: aula.data_encerramento,
    liberada,
    motivo_bloqueio: liberada ? null : motivoBloqueio(aula, sequencial),
    encerrada: dataEncerrada(aula.data_encerramento),
    progresso: p
      ? { status: p.status, percentual: p.percentual, segundos_assistidos: p.segundos_assistidos, concluido_em: p.concluido_em }
      : { status: 'nao_iniciado' as StatusProgresso, percentual: 0, segundos_assistidos: 0, concluido_em: null },
  }
}

async function progressoDoCorretor(aulaIds: string[], corretorId: string): Promise<ProgressoMap> {
  if (aulaIds.length === 0) return new Map()
  const list = await prisma.aulaProgresso.findMany({ where: { corretor_id: corretorId, aula_id: { in: aulaIds } } })
  return new Map(list.map((p) => [p.aula_id, p]))
}

/** Resumo (card) de um treinamento para o corretor. */
function montarResumo(
  t: { id: string; titulo: string; descricao: string; obrigatorio: boolean; capa_url?: string | null },
  aulas: AulaComProgresso[],
  prog: ProgressoMap,
  vinculoObrigatorio?: boolean | null,
) {
  const total = aulas.length
  const concluidas = aulas.filter((a) => prog.get(a.id)?.status === 'concluido').length
  const iniciou = aulas.some((a) => (prog.get(a.id)?.status ?? 'nao_iniciado') !== 'nao_iniciado')
  const status: StatusProgresso = total > 0 && concluidas === total ? 'concluido' : iniciou ? 'em_andamento' : 'nao_iniciado'
  const thumb = aulas.find((a) => a.thumbnail_url)?.thumbnail_url ?? null
  return {
    id: t.id,
    titulo: t.titulo,
    descricao: t.descricao,
    obrigatorio: vinculoObrigatorio ?? t.obrigatorio,
    capa_url: t.capa_url ?? null,
    // capa própria tem prioridade; senão usa a miniatura do 1º vídeo
    thumbnail_url: t.capa_url ?? thumb,
    total_aulas: total,
    aulas_concluidas: concluidas,
    percentual: total ? Math.round((concluidas / total) * 100) : 0,
    status,
  }
}

/** Treinamentos de um evento visíveis ao corretor (só ativos). */
export async function listTreinamentosEventoCorretor(eventoId: string, corretorId: string) {
  const vinculos = await prisma.treinamentoEvento.findMany({
    where: { evento_id: eventoId, treinamento: { ativo: true } },
    orderBy: { ordem: 'asc' },
    include: { treinamento: { include: { aulas: { orderBy: { ordem: 'asc' } } } } },
  })
  const aulaIds = vinculos.flatMap((v) => v.treinamento.aulas.map((a) => a.id))
  const prog = await progressoDoCorretor(aulaIds, corretorId)
  return vinculos.map((v) => montarResumo(v.treinamento, v.treinamento.aulas, prog, v.obrigatorio))
}

/** Todos os treinamentos do corretor (de eventos em que está inscrito). */
export async function meusTreinamentos(corretorId: string) {
  const vinculos = await prisma.treinamentoEvento.findMany({
    where: {
      treinamento: { ativo: true },
      evento: { inscricoes: { some: { corretor_id: corretorId, status: { not: 'cancelado' } } } },
    },
    orderBy: { ordem: 'asc' },
    include: { treinamento: { include: { aulas: { orderBy: { ordem: 'asc' } } } }, evento: { select: { id: true, titulo: true } } },
  })

  // Treinamentos avulsos: disponíveis a todos os corretores, sem depender de evento.
  const avulsos = await prisma.treinamento.findMany({
    where: { ativo: true, avulso: true },
    orderBy: { created_at: 'desc' },
    include: { aulas: { orderBy: { ordem: 'asc' } } },
  })

  const aulaIds = [
    ...vinculos.flatMap((v) => v.treinamento.aulas.map((a) => a.id)),
    ...avulsos.flatMap((t) => t.aulas.map((a) => a.id)),
  ]
  const prog = await progressoDoCorretor(aulaIds, corretorId)

  const vistos = new Set<string>()
  const out: Array<ReturnType<typeof montarResumo> & { evento: { id: string; titulo: string } | null }> = []
  for (const v of vinculos) {
    if (vistos.has(v.treinamento_id)) continue
    vistos.add(v.treinamento_id)
    out.push({ ...montarResumo(v.treinamento, v.treinamento.aulas, prog, v.obrigatorio), evento: v.evento })
  }
  for (const t of avulsos) {
    if (vistos.has(t.id)) continue
    vistos.add(t.id)
    out.push({ ...montarResumo(t, t.aulas, prog), evento: null })
  }
  return out
}

/** Detalhe do treinamento p/ o corretor: playlist de aulas + documentos. */
export async function getTreinamentoCorretor(id: string, corretorId: string) {
  const t = await prisma.treinamento.findUnique({
    where: { id },
    include: { aulas: { orderBy: { ordem: 'asc' } }, documentos: { orderBy: { created_at: 'asc' } } },
  })
  if (!t || !t.ativo) throw new NotFoundError('Treinamento não encontrado')
  if (!(await corretorTemAcesso(id, corretorId))) throw new ForbiddenError('Você não tem acesso a este treinamento')

  const prog = await progressoDoCorretor(t.aulas.map((a) => a.id), corretorId)
  const aulas = t.aulas.map((a) => montarAulaCorretor(a, aulaLiberada(a, t.liberacao_sequencial, t.aulas, prog), t.liberacao_sequencial, prog))
  const concluidas = aulas.filter((a) => a.progresso.status === 'concluido').length
  const cursoConcluido = aulas.length > 0 && concluidas === aulas.length

  // Certificado: disponível quando habilitado E o curso está 100% concluído.
  const cert = t.certificado_habilitado && cursoConcluido
    ? await prisma.certificadoTreinamento.findUnique({
        where: { treinamento_id_corretor_id: { treinamento_id: t.id, corretor_id: corretorId } },
        select: { codigo: true },
      })
    : null

  return {
    id: t.id,
    titulo: t.titulo,
    descricao: t.descricao,
    obrigatorio: t.obrigatorio,
    liberacao_sequencial: t.liberacao_sequencial,
    total_aulas: aulas.length,
    aulas_concluidas: concluidas,
    percentual: aulas.length ? Math.round((concluidas / aulas.length) * 100) : 0,
    aulas,
    documentos: t.documentos.map((d) => ({ id: d.id, titulo: d.titulo })),
    certificado_habilitado: t.certificado_habilitado,
    carga_horaria: t.carga_horaria,
    certificado_disponivel: t.certificado_habilitado && cursoConcluido,
    certificado_codigo: cert?.codigo ?? null,
  }
}

// ════════════════════════════════════════════════════════════════
//  ACESSO / MÍDIA
// ════════════════════════════════════════════════════════════════

async function corretorTemAcesso(treinamentoId: string, corretorId: string): Promise<boolean> {
  // Treinamento avulso (ativo): disponível a todos os corretores, sem evento.
  const t = await prisma.treinamento.findUnique({
    where: { id: treinamentoId }, select: { avulso: true, ativo: true },
  })
  if (t?.avulso && t.ativo) return true

  const n = await prisma.treinamentoEvento.count({
    where: {
      treinamento_id: treinamentoId,
      evento: { inscricoes: { some: { corretor_id: corretorId, status: { not: 'cancelado' } } } },
    },
  })
  return n > 0
}

/** Valida acesso e devolve o caminho absoluto do vídeo de uma aula (streaming Range). */
export async function resolverVideoAula(aulaId: string, corretorId: string | null, isAdmin: boolean): Promise<string> {
  const aula = await prisma.treinamentoAula.findUnique({ where: { id: aulaId }, include: { treinamento: { include: { aulas: { orderBy: { ordem: 'asc' } } } } } })
  if (!aula) throw new NotFoundError('Aula não encontrada')

  if (!isAdmin) {
    if (!aula.treinamento.ativo) throw new ForbiddenError('Treinamento indisponível')
    if (!corretorId || !(await corretorTemAcesso(aula.treinamento_id, corretorId))) throw new ForbiddenError('Sem acesso a este treinamento')
    const prog = await progressoDoCorretor(aula.treinamento.aulas.map((a) => a.id), corretorId)
    if (!aulaLiberada(aula, aula.treinamento.liberacao_sequencial, aula.treinamento.aulas, prog)) {
      throw new ForbiddenError('Esta aula ainda não foi liberada')
    }
  }
  if (aula.status_video !== 'disponivel' || !aula.video_path || aula.video_excluido) throw new NotFoundError('Vídeo indisponível')
  if (!(await existeArquivo(aula.video_path))) throw new NotFoundError('Vídeo não encontrado no servidor')
  return caminhoAbsoluto(aula.video_path)
}

/** Valida acesso e devolve o caminho absoluto de um documento de apoio. */
export async function resolverDocumento(docId: string, corretorId: string | null, isAdmin: boolean) {
  const d = await prisma.treinamentoDocumento.findUnique({ where: { id: docId }, include: { treinamento: true } })
  if (!d) throw new NotFoundError('Documento não encontrado')
  if (!isAdmin) {
    if (!d.treinamento.ativo) throw new ForbiddenError('Documento indisponível')
    if (!corretorId || !(await corretorTemAcesso(d.treinamento_id, corretorId))) throw new ForbiddenError('Sem acesso')
  }
  if (!(await existeArquivo(d.path))) throw new NotFoundError('Arquivo não encontrado')
  return { abs: caminhoAbsoluto(d.path), filename: d.titulo + extname(d.path) }
}

// ════════════════════════════════════════════════════════════════
//  PROGRESSO (por aula)
// ════════════════════════════════════════════════════════════════

export async function salvarProgressoAula(aulaId: string, corretorId: string, segundos: number) {
  const aula = await prisma.treinamentoAula.findUnique({ where: { id: aulaId }, include: { treinamento: { include: { aulas: { orderBy: { ordem: 'asc' } } } } } })
  if (!aula || !aula.treinamento.ativo) throw new NotFoundError('Aula não encontrada')
  if (!(await corretorTemAcesso(aula.treinamento_id, corretorId))) throw new ForbiddenError('Sem acesso a este treinamento')

  const progAntes = await progressoDoCorretor(aula.treinamento.aulas.map((a) => a.id), corretorId)
  if (!aulaLiberada(aula, aula.treinamento.liberacao_sequencial, aula.treinamento.aulas, progAntes)) {
    throw new BadRequestError('Esta aula ainda não foi liberada')
  }

  const dur = aula.video_duracao ?? 0
  const seg = dur > 0 ? Math.min(Math.max(0, segundos), dur) : Math.max(0, segundos)
  const percentual = dur > 0 ? Math.min(100, Math.round((seg / dur) * 100)) : 0
  const concluido = percentual >= 90
  const status: StatusProgresso = concluido ? 'concluido' : seg > 0 ? 'em_andamento' : 'nao_iniciado'

  const existente = await prisma.aulaProgresso.findUnique({ where: { aula_id_corretor_id: { aula_id: aulaId, corretor_id: corretorId } } })
  const concluido_em = concluido ? existente?.concluido_em ?? new Date() : null

  const p = await prisma.aulaProgresso.upsert({
    where: { aula_id_corretor_id: { aula_id: aulaId, corretor_id: corretorId } },
    update: { segundos_assistidos: seg, percentual, status, ultimo_acesso: new Date(), concluido_em },
    create: { aula_id: aulaId, corretor_id: corretorId, segundos_assistidos: seg, percentual, status, concluido_em },
  })

  // Em modo sequencial, concluir uma aula libera a próxima → avisa o front p/ refazer fetch
  const concluiuAgora = concluido && existente?.status !== 'concluido'

  // Ao concluir uma aula, se isso fechou o curso e o certificado está habilitado,
  // emite (idempotente) e dispara o envio automático (se configurado). Best-effort:
  // uma falha aqui nunca deve derrubar o salvamento do progresso.
  let certificadoEmitido = false
  if (concluiuAgora) {
    try {
      const emit = await emitirCertificadoSeConcluido(aula.treinamento_id, corretorId)
      if (emit) {
        certificadoEmitido = true
        if (emit.novo && aula.treinamento.certificado_auto_enviar) {
          await enviarCertificadoTreinamento(aula.treinamento_id, corretorId).catch(() => {})
        }
      }
    } catch { /* não bloqueia o progresso */ }
  }

  return {
    status: p.status,
    percentual: p.percentual,
    segundos_assistidos: p.segundos_assistidos,
    concluido_em: p.concluido_em,
    liberou_proxima: concluiuAgora && aula.treinamento.liberacao_sequencial,
    certificado_emitido: certificadoEmitido,
  }
}

// ════════════════════════════════════════════════════════════════
//  CERTIFICADO DE CONCLUSÃO
// ════════════════════════════════════════════════════════════════

function slugArquivo(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'certificado'
}

/** true se o corretor concluiu TODAS as aulas do treinamento (curso 100%). */
async function cursoConcluido(treinamentoId: string, corretorId: string): Promise<boolean> {
  const aulas = await prisma.treinamentoAula.findMany({ where: { treinamento_id: treinamentoId }, select: { id: true } })
  if (aulas.length === 0) return false
  const concluidas = await prisma.aulaProgresso.count({
    where: { corretor_id: corretorId, status: 'concluido', aula_id: { in: aulas.map((a) => a.id) } },
  })
  return concluidas === aulas.length
}

/**
 * Garante o certificado de (curso, corretor) quando o curso tem certificado
 * habilitado e o corretor concluiu 100%. Idempotente (1 por curso+corretor).
 * Retorna o certificado e se foi criado agora, ou null se ainda não elegível.
 */
export async function emitirCertificadoSeConcluido(treinamentoId: string, corretorId: string) {
  const t = await prisma.treinamento.findUnique({
    where: { id: treinamentoId },
    select: { id: true, certificado_habilitado: true, carga_horaria: true },
  })
  if (!t || !t.certificado_habilitado) return null
  if (!(await cursoConcluido(treinamentoId, corretorId))) return null

  const existente = await prisma.certificadoTreinamento.findUnique({
    where: { treinamento_id_corretor_id: { treinamento_id: treinamentoId, corretor_id: corretorId } },
  })
  if (existente) return { certificado: existente, novo: false }

  // upsert evita corrida (duas aulas concluídas quase juntas)
  const certificado = await prisma.certificadoTreinamento.upsert({
    where: { treinamento_id_corretor_id: { treinamento_id: treinamentoId, corretor_id: corretorId } },
    update: {},
    create: { treinamento_id: treinamentoId, corretor_id: corretorId, carga_horaria: t.carga_horaria },
  })
  return { certificado, novo: certificado.emitido_em.getTime() > Date.now() - 5_000 }
}

function fmtCargaCert(h?: number | null): string {
  if (!h || h <= 0) return ''
  const H = Math.floor(h); const m = Math.round((h - H) * 60)
  return m > 0 ? `${H}h${String(m).padStart(2, '0')}` : `${H}h`
}
function fmtDataCert(d: Date): string {
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Mapa de variáveis do certificado de curso — usa as MESMAS chaves dos modelos
 * de evento (nome_corretor, nome_evento, carga_horaria, qr_code…) para que uma
 * arte de "certificado" já existente funcione tanto para evento quanto curso.
 */
function montarDadosCertTreinamento(cert: {
  codigo: string; emitido_em: Date; carga_horaria: number | null
  treinamento: { titulo: string; carga_horaria: number | null }
  corretor: { nome: string; creci: string; email: string; cpf: string; telefone: string | null; foto_url: string | null; imobiliaria: { nome: string } | null }
}): Record<string, string> {
  const c = cert.corretor
  const url_validacao = `${config.portalUrl}/validar/${cert.codigo}`
  return {
    nome_corretor: c.nome,
    email_corretor: c.email,
    cpf_corretor: c.cpf,
    creci_corretor: c.creci,
    telefone_corretor: c.telefone ?? '',
    empresa_corretor: c.imobiliaria?.nome ?? '',
    categoria_participante: 'Corretor',
    foto_participante: c.foto_url ?? '',
    nome_evento: cert.treinamento.titulo, // o "evento" aqui é o curso
    data_evento: fmtDataCert(cert.emitido_em),
    hora_evento: '',
    local_evento: '',
    empreendimento: '',
    cidade_evento: '',
    descricao_evento: '',
    status_presenca: 'CONCLUÍDO',
    codigo_validacao: cert.codigo,
    numero_inscricao: cert.codigo.slice(0, 8).toUpperCase(),
    url_validacao,
    url_checkin: url_validacao,
    qr_code: url_validacao,
    data_emissao: fmtDataCert(cert.emitido_em),
    carga_horaria: fmtCargaCert(cert.carga_horaria ?? cert.treinamento.carga_horaria),
    nome_instrutor: '',
  }
}

/** Monta o PDF do certificado a partir do registro emitido (modelo visual ou padrão). */
async function montarCertificadoTreinamentoPdf(codigo: string): Promise<{ pdf: Buffer; fileName: string }> {
  const cert = await prisma.certificadoTreinamento.findUnique({
    where: { codigo },
    include: {
      treinamento: {
        select: {
          titulo: true, carga_horaria: true,
          certificado_modelo: { select: { canvas_json: true, largura: true, altura: true, ativo: true } },
        },
      },
      corretor: {
        select: {
          nome: true, creci: true, email: true, cpf: true, telefone: true, foto_url: true,
          imobiliaria: { select: { nome: true } },
        },
      },
    },
  })
  if (!cert) throw new NotFoundError('Certificado não encontrado')
  const fileName = `certificado-${slugArquivo(cert.treinamento.titulo)}.pdf`

  // Modelo Visual vinculado (ativo + com layout) → renderiza a arte; senão, padrão pdfkit.
  const modelo = cert.treinamento.certificado_modelo
  if (modelo && modelo.ativo && modelo.canvas_json) {
    const dados = montarDadosCertTreinamento(cert)
    const png = await renderModeloPng(modelo.canvas_json, modelo.largura, modelo.altura, dados)
    return { pdf: await pngParaPdf(png, modelo.largura, modelo.altura), fileName }
  }

  const pdf = await gerarCertificadoTreinamentoPdf({
    nome: cert.corretor.nome,
    creci: cert.corretor.creci,
    cursoTitulo: cert.treinamento.titulo,
    concluidoEm: cert.emitido_em,
    cargaHoraria: cert.carga_horaria ?? cert.treinamento.carga_horaria,
    codigo: cert.codigo,
    urlValidacao: `${config.portalUrl}/validar/${cert.codigo}`,
  })
  return { pdf, fileName }
}

/** Gera o PDF do certificado do curso para o corretor logado, se elegível. */
export async function baixarCertificadoTreinamento(
  treinamentoId: string, corretorId: string,
): Promise<{ pdf: Buffer; fileName: string }> {
  const t = await prisma.treinamento.findUnique({
    where: { id: treinamentoId },
    select: { ativo: true, certificado_habilitado: true },
  })
  if (!t || !t.ativo) throw new NotFoundError('Treinamento não encontrado')
  if (!(await corretorTemAcesso(treinamentoId, corretorId))) throw new ForbiddenError('Sem acesso a este treinamento')
  if (!t.certificado_habilitado) throw new BadRequestError('O certificado deste curso ainda não foi liberado.')

  const emit = await emitirCertificadoSeConcluido(treinamentoId, corretorId)
  if (!emit) throw new BadRequestError('Conclua todas as aulas do curso para emitir o certificado.')
  return montarCertificadoTreinamentoPdf(emit.certificado.codigo)
}

/** Envia o certificado (e-mail + WhatsApp, respeitando opt-in) e carimba enviado_em. */
export async function enviarCertificadoTreinamento(treinamentoId: string, corretorId: string): Promise<void> {
  const cert = await prisma.certificadoTreinamento.findUnique({
    where: { treinamento_id_corretor_id: { treinamento_id: treinamentoId, corretor_id: corretorId } },
    include: {
      treinamento: { select: { titulo: true } },
      corretor: { select: { nome: true, whatsapp: true, whatsapp_opt_in: true } },
    },
  })
  if (!cert) throw new NotFoundError('Certificado não encontrado')

  const { pdf, fileName } = await montarCertificadoTreinamentoPdf(cert.codigo)
  const c = cert.corretor
  await notifyDocument({
    corretorId,
    tipo: 'certificado',
    whatsapp: c.whatsapp,
    optIn: c.whatsapp_opt_in && !!c.whatsapp,
    base64: pdf.toString('base64'),
    fileName,
    caption: `🎓 Parabéns, ${c.nome}! Você concluiu o curso "${cert.treinamento.titulo}". Segue o seu certificado de conclusão. — IDIBRA`,
  })
  await prisma.certificadoTreinamento.update({ where: { id: cert.id }, data: { enviado_em: new Date() } })
}

// ════════════════════════════════════════════════════════════════
//  RELATÓRIO (admin)
// ════════════════════════════════════════════════════════════════

export async function relatorioTreinamento(id: string) {
  const t = await prisma.treinamento.findUnique({
    where: { id },
    select: { id: true, titulo: true, aulas: { select: { id: true } } },
  })
  if (!t) throw new NotFoundError('Treinamento não encontrado')
  const totalAulas = t.aulas.length
  const aulaIds = t.aulas.map((a) => a.id)

  const vinc = await prisma.treinamentoEvento.findMany({ where: { treinamento_id: id }, select: { evento_id: true, evento: { select: { titulo: true } } } })
  const eventoIds = vinc.map((v) => v.evento_id)

  const inscritos = eventoIds.length
    ? await prisma.inscricao.findMany({
        where: { evento_id: { in: eventoIds }, status: { not: 'cancelado' } },
        select: { corretor_id: true, corretor: { select: { nome: true } }, evento: { select: { titulo: true } } },
      })
    : []
  const elegiveis = new Map<string, { nome: string; evento: string }>()
  inscritos.forEach((i) => { if (!elegiveis.has(i.corretor_id)) elegiveis.set(i.corretor_id, { nome: i.corretor.nome, evento: i.evento.titulo }) })

  const progressos = aulaIds.length
    ? await prisma.aulaProgresso.findMany({ where: { aula_id: { in: aulaIds } }, include: { corretor: { select: { nome: true } } } })
    : []

  // agrega por corretor
  const porCorretor = new Map<string, { nome: string; concluidas: number; iniciou: boolean; ultimo: Date | null }>()
  for (const p of progressos) {
    const cur = porCorretor.get(p.corretor_id) ?? { nome: p.corretor.nome, concluidas: 0, iniciou: false, ultimo: null }
    if (p.status === 'concluido') cur.concluidas++
    if (p.status !== 'nao_iniciado') cur.iniciou = true
    if (!cur.ultimo || (p.ultimo_acesso && p.ultimo_acesso > cur.ultimo)) cur.ultimo = p.ultimo_acesso
    porCorretor.set(p.corretor_id, cur)
  }

  const corretorIds = new Set<string>([...elegiveis.keys(), ...porCorretor.keys()])
  const linhas = [...corretorIds].map((cid) => {
    const agg = porCorretor.get(cid)
    const e = elegiveis.get(cid)
    const concluidas = agg?.concluidas ?? 0
    const status: StatusProgresso = totalAulas > 0 && concluidas === totalAulas ? 'concluido' : (agg?.iniciou ? 'em_andamento' : 'nao_iniciado')
    return {
      corretor_id: cid,
      nome: agg?.nome ?? e?.nome ?? '—',
      evento: e?.evento ?? null,
      status,
      aulas_concluidas: concluidas,
      total_aulas: totalAulas,
      percentual: totalAulas ? Math.round((concluidas / totalAulas) * 100) : 0,
      ultimo_acesso: agg?.ultimo ?? null,
    }
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  const total = linhas.length
  const iniciou = linhas.filter((l) => l.status !== 'nao_iniciado').length
  const concluiu = linhas.filter((l) => l.status === 'concluido').length

  return {
    treinamento: { id: t.id, titulo: t.titulo },
    total_aulas: totalAulas,
    eventos: vinc.map((v) => v.evento.titulo),
    indicadores: { total, iniciou, concluiu, pendentes: total - iniciou, percentualConclusao: total ? Math.round((concluiu / total) * 100) : 0 },
    linhas,
  }
}

// ════════════════════════════════════════════════════════════════
//  LIMPEZA DE VÍDEOS EXPIRADOS (cron)
// ════════════════════════════════════════════════════════════════

export async function limparVideosExpirados(): Promise<{ removidos: number; ids: string[] }> {
  const expiradas = await prisma.treinamentoAula.findMany({
    where: {
      excluir_video_automaticamente: true,
      video_excluido: false,
      video_path: { not: null },
      data_exclusao_video: { not: null, lte: new Date() },
    },
    select: { id: true, treinamento_id: true, video_path: true },
  })

  const ids: string[] = []
  for (const a of expiradas) {
    await removerArquivo(a.video_path)
    await removerPastaRel(`${relAulaPasta(a.treinamento_id, a.id)}/video`)
    await removerPastaRel(`${relAulaPasta(a.treinamento_id, a.id)}/original`)
    await rm(thumbPublicoAulaDir(a.treinamento_id, a.id), { recursive: true, force: true }).catch(() => {})
    await prisma.treinamentoAula.update({
      where: { id: a.id },
      data: { video_excluido: true, status_video: 'excluido', video_path: null, thumbnail_url: null },
    })
    ids.push(a.id)
    console.log(`[limpeza-videos] vídeo da aula ${a.id} removido (expirado)`)
  }
  if (ids.length) emitAdminRefresh('treinamento-video-expirado')
  return { removidos: ids.length, ids }
}
