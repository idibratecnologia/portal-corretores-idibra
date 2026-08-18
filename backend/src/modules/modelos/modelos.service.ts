/**
 * Modelos visuais (editor estilo Canva) — CRUD, duplicação e vínculo a eventos.
 * O layout em si fica em `canvas_json` (serialização do Fabric.js).
 */
import { Prisma } from '@prisma/client'
import type { Inscricao, Corretor, Evento, Imobiliaria } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { config } from '@/config'
import { NotFoundError } from '@/lib/errors'
import { emitAdminRefresh } from '@/lib/events'
import type { CreateModeloInput, UpdateModeloInput } from './modelos.schema'

type TipoModelo = CreateModeloInput['tipo']

// JSON do Prisma: usa JsonNull quando o canvas é nulo (campo opcional/nullable)
function toJson(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return v === undefined || v === null ? Prisma.JsonNull : (v as Prisma.InputJsonValue)
}

export function listModelos(filtros: { tipo?: TipoModelo; ativo?: 'true' | 'false'; search?: string }) {
  return prisma.modeloVisual.findMany({
    where: {
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros.ativo ? { ativo: filtros.ativo === 'true' } : {}),
      ...(filtros.search ? { nome: { contains: filtros.search, mode: 'insensitive' } } : {}),
    },
    orderBy: { updated_at: 'desc' },
    select: {
      id: true, nome: true, descricao: true, tipo: true, largura: true, altura: true,
      ativo: true, created_at: true, updated_at: true,
      _count: { select: { eventos: true } },
    },
  })
}

export async function getModelo(id: string) {
  const m = await prisma.modeloVisual.findUnique({ where: { id } })
  if (!m) throw new NotFoundError('Modelo não encontrado')
  return m
}

export async function createModelo(input: CreateModeloInput) {
  const m = await prisma.modeloVisual.create({
    data: {
      nome: input.nome,
      descricao: input.descricao ?? '',
      tipo: input.tipo,
      largura: input.largura,
      altura: input.altura,
      ativo: input.ativo ?? true,
      canvas_json: toJson(input.canvas_json),
    },
  })
  emitAdminRefresh('modelo-criado')
  return m
}

export async function updateModelo(id: string, input: UpdateModeloInput) {
  await getModelo(id)
  const data: Prisma.ModeloVisualUpdateInput = {}
  if (input.nome !== undefined) data.nome = input.nome
  if (input.descricao !== undefined) data.descricao = input.descricao
  if (input.tipo !== undefined) data.tipo = input.tipo
  if (input.largura !== undefined) data.largura = input.largura
  if (input.altura !== undefined) data.altura = input.altura
  if (input.ativo !== undefined) data.ativo = input.ativo
  if (input.canvas_json !== undefined) data.canvas_json = toJson(input.canvas_json)

  const m = await prisma.modeloVisual.update({ where: { id }, data })
  emitAdminRefresh('modelo-atualizado')
  return m
}

export async function duplicarModelo(id: string) {
  const orig = await getModelo(id)
  const m = await prisma.modeloVisual.create({
    data: {
      nome: `${orig.nome} (cópia)`,
      descricao: orig.descricao,
      tipo: orig.tipo,
      largura: orig.largura,
      altura: orig.altura,
      ativo: orig.ativo,
      canvas_json: toJson(orig.canvas_json),
    },
  })
  emitAdminRefresh('modelo-duplicado')
  return m
}

export async function deleteModelo(id: string) {
  const m = await prisma.modeloVisual.findUnique({ where: { id }, select: { nome: true } })
  if (!m) throw new NotFoundError('Modelo não encontrado')
  await prisma.modeloVisual.delete({ where: { id } }) // cascata: vínculos
  emitAdminRefresh('modelo-excluido')
  return { nome: m.nome }
}

// ─── Vínculo com eventos ─────────────────────────────────────────

export function listModelosDoEvento(eventoId: string) {
  return prisma.eventoModelo.findMany({
    where: { evento_id: eventoId },
    include: { modelo: { select: { id: true, nome: true, tipo: true, largura: true, altura: true, ativo: true } } },
  })
}

export async function vincularModelo(eventoId: string, modeloId: string) {
  const ev = await prisma.evento.findUnique({ where: { id: eventoId }, select: { id: true } })
  if (!ev) throw new NotFoundError('Evento não encontrado')
  const modelo = await prisma.modeloVisual.findUnique({ where: { id: modeloId }, select: { tipo: true } })
  if (!modelo) throw new NotFoundError('Modelo não encontrado')

  return prisma.eventoModelo.upsert({
    where:  { evento_id_tipo: { evento_id: eventoId, tipo: modelo.tipo } },
    update: { modelo_id: modeloId },
    create: { evento_id: eventoId, modelo_id: modeloId, tipo: modelo.tipo },
  })
}

export async function desvincularModeloPorTipo(eventoId: string, tipo: TipoModelo) {
  await prisma.eventoModelo.deleteMany({ where: { evento_id: eventoId, tipo } })
}

/** Modelo vinculado a um evento para um tipo (usado na geração). */
export async function getModeloDoEvento(eventoId: string, tipo: TipoModelo) {
  const link = await prisma.eventoModelo.findUnique({
    where: { evento_id_tipo: { evento_id: eventoId, tipo } },
    include: { modelo: true },
  })
  return link?.modelo ?? null
}

// ─── Dados reais das variáveis (para preview/geração) ────────────

const STATUS_LABEL: Record<string, string> = {
  inscrito: 'INSCRITO', presente: 'PRESENÇA CONFIRMADA', ausente: 'AUSENTE', cancelado: 'CANCELADO',
}

function fmtData(d: Date): string {
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtCarga(h?: number | null): string {
  if (!h || h <= 0) return ''
  const H = Math.floor(h); const m = Math.round((h - H) * 60)
  return m > 0 ? `${H}h${String(m).padStart(2, '0')}` : `${H}h`
}

type InscricaoComDados = Inscricao & {
  corretor: Corretor & { imobiliaria: Pick<Imobiliaria, 'nome'> | null }
  evento: Evento
}

function montarDados(insc: InscricaoComDados, tipo: TipoModelo): Record<string, string> {
  const c = insc.corretor
  const e = insc.evento
  const codigo = insc.qr_code_token
  const portal = config.portalUrl
  const url_validacao = `${portal}/validar/${codigo}`
  const url_checkin = `${portal}/checkin/${codigo}`
  return {
    nome_corretor: c.nome,
    email_corretor: c.email,
    cpf_corretor: c.cpf,
    creci_corretor: c.creci,
    telefone_corretor: c.telefone ?? '',
    empresa_corretor: c.imobiliaria?.nome ?? '',
    categoria_participante: 'Corretor',
    foto_participante: c.foto_url ?? '',
    nome_evento: e.titulo,
    data_evento: fmtData(e.data_evento),
    hora_evento: e.hora_inicio,
    local_evento: e.local,
    empreendimento: e.empreendimento ?? '',
    cidade_evento: '',
    descricao_evento: e.descricao ?? '',
    status_presenca: STATUS_LABEL[insc.status] ?? '',
    codigo_validacao: codigo,
    numero_inscricao: codigo.slice(0, 8).toUpperCase(),
    url_validacao,
    url_checkin,
    // Certificado: URL pública de validação. Credenciamento/crachá: o token de
    // check-in (compatível com o totem de credenciamento, que lê o token).
    qr_code: tipo === 'certificado' ? url_validacao : codigo,
    data_emissao: fmtData(new Date()),
    carga_horaria: fmtCarga(e.carga_horaria),
    nome_instrutor: '',
  }
}

const INCLUDE_DADOS = {
  corretor: { include: { imobiliaria: { select: { nome: true } } } },
  evento: true,
} as const

/** Mapa de variáveis de UMA inscrição (preview/geração individual). */
export async function construirDadosInscricao(inscricaoId: string, tipo: TipoModelo): Promise<Record<string, string>> {
  const insc = await prisma.inscricao.findUnique({ where: { id: inscricaoId }, include: INCLUDE_DADOS })
  if (!insc) throw new NotFoundError('Inscrição não encontrada')
  return montarDados(insc as InscricaoComDados, tipo)
}

/** Lista de inscritos do evento + seus dados (geração em lote — F5). */
export async function listarInscritosParaGeracao(
  eventoId: string, tipo: TipoModelo, status?: 'inscrito' | 'presente' | 'ausente',
): Promise<Array<{ inscricao_id: string; nome: string; status: string; dados: Record<string, string> }>> {
  const inscricoes = await prisma.inscricao.findMany({
    where: { evento_id: eventoId, status: status ?? { not: 'cancelado' } },
    include: INCLUDE_DADOS,
    orderBy: { corretor: { nome: 'asc' } },
  })
  return inscricoes.map((insc) => ({
    inscricao_id: insc.id,
    nome: insc.corretor.nome,
    status: insc.status,
    dados: montarDados(insc as InscricaoComDados, tipo),
  }))
}

// ─── Registro de documentos gerados + validação pública ──────────

export async function registrarGeracao(input: {
  eventoId: string; modeloId?: string | null; tipo: TipoModelo; formato: string
  itens: Array<{ inscricao_id?: string; corretor_id?: string }>; geradoPor?: string
}): Promise<{ registrados: number }> {
  if (input.itens.length === 0) return { registrados: 0 }
  await prisma.documentoVisualGerado.createMany({
    data: input.itens.map((it) => ({
      evento_id: input.eventoId, modelo_id: input.modeloId ?? null,
      inscricao_id: it.inscricao_id ?? null, corretor_id: it.corretor_id ?? null,
      tipo: input.tipo, formato: input.formato, gerado_por: input.geradoPor ?? null,
    })),
  })
  emitAdminRefresh('documentos-gerados')
  return { registrados: input.itens.length }
}

export async function contarGeracoes(eventoId: string): Promise<Array<{ tipo: string; total: number }>> {
  const grupos = await prisma.documentoVisualGerado.groupBy({
    by: ['tipo'], where: { evento_id: eventoId }, _count: { _all: true },
  })
  return grupos.map((g) => ({ tipo: g.tipo, total: g._count._all }))
}

/** Validação pública (QR do certificado) — participação em evento OU conclusão de curso. */
export async function getValidacao(codigo: string) {
  // 1) Participação em evento (token da inscrição)
  const insc = await prisma.inscricao.findUnique({ where: { qr_code_token: codigo }, include: INCLUDE_DADOS })
  if (insc) {
    return {
      valido: true as const,
      tipo: 'evento' as const,
      nome: insc.corretor.nome,
      creci: insc.corretor.creci,
      evento: insc.evento.titulo,
      data: fmtData(insc.evento.data_evento),
      local: insc.evento.local,
      status: STATUS_LABEL[insc.status] ?? insc.status,
      presente: insc.status === 'presente',
    }
  }

  // 2) Conclusão de curso (código do certificado de treinamento)
  const cert = await prisma.certificadoTreinamento.findUnique({
    where: { codigo },
    include: {
      treinamento: { select: { titulo: true, carga_horaria: true } },
      corretor: { select: { nome: true, creci: true } },
    },
  })
  if (cert) {
    return {
      valido: true as const,
      tipo: 'treinamento' as const,
      nome: cert.corretor.nome,
      creci: cert.corretor.creci,
      evento: cert.treinamento.titulo,
      data: fmtData(cert.emitido_em),
      local: null,
      status: 'CURSO CONCLUÍDO',
      presente: true,
      carga_horaria: fmtCarga(cert.carga_horaria ?? cert.treinamento.carga_horaria),
    }
  }

  return { valido: false as const }
}
