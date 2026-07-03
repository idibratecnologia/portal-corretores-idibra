/**
 * Lógica de negócio das inscrições.
 * Concentra as regras: inscrição, cancelamento e check-in.
 */
import { prisma } from '@/lib/prisma'
import { config } from '@/config'
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '@/lib/errors'
import { notify, notifyDocument } from '@/lib/notifications'
import { getConnectionState } from '@/lib/evolution'
import { gerarCertificadoPdf, pngParaPdf } from '@/lib/certificado'
import { renderModeloPng } from '@/lib/modelo-render'
import { getModeloDoEvento, construirDadosInscricao } from '@/modules/modelos/modelos.service'
import { emitAdminRefresh } from '@/lib/events'
import { renderMensagem } from '@/modules/templates/templates.service'
import { gerarQrCheckinBase64 } from '@/lib/qrcode'
import { toCsv } from '@/lib/csv'
import { formatDataEvento } from '@/lib/format'

/** Inclui corretor (+imobiliária) e evento — formato usado nas tabelas do frontend. */
const inscricaoInclude = {
  corretor: {
    select: {
      id: true, nome: true, cpf: true, creci: true, whatsapp: true, email: true,
      imobiliaria: { select: { id: true, nome: true } },
    },
  },
  evento: {
    select: { id: true, titulo: true, data_evento: true, hora_inicio: true, local: true, tipo: true },
  },
} as const

// ─── Listagem (admin: por evento | corretor: as próprias) ────────

export async function listByEvento(eventoId: string) {
  return prisma.inscricao.findMany({
    where:   { evento_id: eventoId },
    include: inscricaoInclude,
    orderBy: { created_at: 'asc' },
  })
}

export async function listByCorretor(corretorId: string) {
  return prisma.inscricao.findMany({
    where:   { corretor_id: corretorId },
    include: inscricaoInclude,
    orderBy: { created_at: 'desc' },
  })
}

// ─── Criar inscrição (corretor) ──────────────────────────────────

export async function createInscricao(corretorId: string, eventoId: string) {
  const evento = await prisma.evento.findUnique({ where: { id: eventoId } })
  if (!evento) throw new NotFoundError('Evento não encontrado')

  // Regras de negócio
  if (evento.status !== 'publicado') {
    throw new BadRequestError('Este evento não está aberto para inscrições')
  }
  if (!evento.inscricoes_abertas) {
    throw new BadRequestError('As inscrições para este evento estão fechadas')
  }

  // Já inscrito?
  const existente = await prisma.inscricao.findUnique({
    where: { corretor_id_evento_id: { corretor_id: corretorId, evento_id: eventoId } },
  })
  if (existente && existente.status !== 'cancelado') {
    throw new ConflictError('Você já está inscrito neste evento')
  }

  // Capacidade
  const inscritosAtivos = await prisma.inscricao.count({
    where: { evento_id: eventoId, status: { in: ['inscrito', 'presente'] } },
  })
  if (inscritosAtivos >= evento.capacidade) {
    throw new BadRequestError('Evento lotado')
  }

  // Reinscrição (caso tenha cancelado antes) ou nova inscrição
  const inscricao = existente
    ? await prisma.inscricao.update({
        where: { id: existente.id },
        data:  { status: 'inscrito', created_at: new Date() },
        include: inscricaoInclude,
      })
    : await prisma.inscricao.create({
        data:    { corretor_id: corretorId, evento_id: eventoId, status: 'inscrito' },
        include: inscricaoInclude,
      })

  // Notifica confirmação usando o template editável, anexando o QR de check-in
  const corretor = inscricao.corretor
  const msg = await renderMensagem('inscricao_confirmada', {
    nome: corretor.nome, evento: evento.titulo,
    data: formatDataEvento(evento.data_evento), hora: evento.hora_inicio, local: evento.local,
  })
  if (msg) {
    // QR codifica o token da inscrição — o mesmo lido no check-in.
    // Falha ao gerar a imagem não deve impedir a confirmação: envia só texto.
    let qrBase64: string | undefined
    try {
      qrBase64 = await gerarQrCheckinBase64(inscricao.qr_code_token)
    } catch {
      qrBase64 = undefined
    }

    await notify({
      corretorId, eventoId, tipo: 'inscricao_confirmada',
      whatsapp: corretor.whatsapp, optIn: await getOptIn(corretorId),
      mensagem: msg.texto, imagemBase64: qrBase64,
    })
  }

  emitAdminRefresh('inscricao-nova')
  return inscricao
}

// ─── Exportação CSV da lista de presença (admin) ─────────────────

const STATUS_LABEL: Record<string, string> = {
  inscrito: 'Inscrito', presente: 'Presente', ausente: 'Ausente', cancelado: 'Cancelado',
}

function fmtDataHora(d: Date | null): string {
  if (!d) return ''
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })
}

/** Gera o CSV (Excel PT-BR) com os inscritos/presentes de um evento. */
export async function exportInscricoesCsv(eventoId: string): Promise<{ csv: string; titulo: string }> {
  const evento = await prisma.evento.findUnique({ where: { id: eventoId }, select: { titulo: true } })
  if (!evento) throw new NotFoundError('Evento não encontrado')

  const inscricoes = await prisma.inscricao.findMany({
    where:   { evento_id: eventoId },
    orderBy: { corretor: { nome: 'asc' } },
    include: {
      corretor: {
        select: {
          nome: true, cpf: true, creci: true, email: true, telefone: true, whatsapp: true,
          imobiliaria: { select: { nome: true } },
        },
      },
    },
  })

  const headers = [
    'Nome', 'CPF', 'CRECI', 'E-mail', 'Telefone', 'WhatsApp',
    'Imobiliária', 'Status', 'Inscrito em', 'Check-in em',
  ]
  const rows = inscricoes.map((i) => [
    i.corretor.nome, i.corretor.cpf, i.corretor.creci, i.corretor.email,
    i.corretor.telefone, i.corretor.whatsapp, i.corretor.imobiliaria?.nome ?? '',
    STATUS_LABEL[i.status] ?? i.status, fmtDataHora(i.created_at), fmtDataHora(i.checkin_at),
  ])

  return { csv: toCsv(headers, rows), titulo: evento.titulo }
}

// ─── Certificado de participação ─────────────────────────────────

function slugArquivo(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'certificado'
}

interface CertFallback { nome: string; creci?: string | null; eventoTitulo: string; dataEvento: Date; local?: string | null }

/**
 * Gera o PDF do certificado: usa o MODELO VISUAL vinculado ao evento (se houver
 * um ativo com layout salvo); caso contrário, cai no certificado padrão.
 */
async function montarCertificadoPdf(inscricaoId: string, eventoId: string, fallback: CertFallback): Promise<Buffer> {
  const modelo = await getModeloDoEvento(eventoId, 'certificado')
  if (modelo && modelo.ativo && modelo.canvas_json) {
    const dados = await construirDadosInscricao(inscricaoId, 'certificado')
    const png = await renderModeloPng(modelo.canvas_json, modelo.largura, modelo.altura, dados)
    return pngParaPdf(png, modelo.largura, modelo.altura)
  }
  return gerarCertificadoPdf(fallback)
}

/** Gera o PDF do certificado de uma inscrição (do corretor logado), se elegível. */
export async function gerarCertificadoInscricao(
  inscricaoId: string,
  corretorId: string,
): Promise<{ pdf: Buffer; fileName: string }> {
  const insc = await prisma.inscricao.findUnique({
    where:   { id: inscricaoId },
    include: {
      corretor: { select: { id: true, nome: true, creci: true } },
      evento:   { select: { titulo: true, data_evento: true, local: true, certificados_habilitados: true } },
    },
  })
  if (!insc) throw new NotFoundError('Inscrição não encontrada')
  if (insc.corretor_id !== corretorId) throw new ForbiddenError('Acesso negado')
  if (insc.status !== 'presente') throw new BadRequestError('Certificado disponível apenas para presença confirmada.')
  if (!insc.evento.certificados_habilitados) throw new BadRequestError('Os certificados deste evento ainda não foram liberados.')

  const pdf = await montarCertificadoPdf(insc.id, insc.evento_id, {
    nome: insc.corretor.nome, creci: insc.corretor.creci,
    eventoTitulo: insc.evento.titulo, dataEvento: insc.evento.data_evento, local: insc.evento.local,
  })
  return { pdf, fileName: `certificado-${slugArquivo(insc.evento.titulo)}.pdf` }
}

/** Admin envia o certificado por WhatsApp a todos os presentes do evento (respeita opt-in). */
export async function enviarCertificadosEvento(
  eventoId: string,
): Promise<{ total: number; enfileirados: number; semOptIn: number }> {
  const evento = await prisma.evento.findUnique({
    where:  { id: eventoId },
    select: { titulo: true, data_evento: true, local: true, certificados_habilitados: true },
  })
  if (!evento) throw new NotFoundError('Evento não encontrado')
  if (!evento.certificados_habilitados) throw new BadRequestError('Habilite os certificados do evento antes de enviar.')

  const presentes = await prisma.inscricao.findMany({
    where:   { evento_id: eventoId, status: 'presente' },
    include: { corretor: { select: { id: true, nome: true, creci: true, whatsapp: true, whatsapp_opt_in: true } } },
  })

  const fileName = `certificado-${slugArquivo(evento.titulo)}.pdf`
  let enfileirados = 0
  let semOptIn = 0

  for (const insc of presentes) {
    const c = insc.corretor
    if (!c.whatsapp_opt_in || !c.whatsapp) { semOptIn++; continue }

    const pdf = await montarCertificadoPdf(insc.id, eventoId, {
      nome: c.nome, creci: c.creci,
      eventoTitulo: evento.titulo, dataEvento: evento.data_evento, local: evento.local,
    })
    await notifyDocument({
      corretorId: c.id, eventoId, tipo: 'certificado',
      whatsapp: c.whatsapp, optIn: true,
      base64: pdf.toString('base64'), fileName,
      caption: `🎓 Olá, ${c.nome}! Segue o seu certificado de participação no evento "${evento.titulo}". Obrigado por participar! — IDIBRA`,
    })
    enfileirados++
  }

  return { total: presentes.length, enfileirados, semOptIn }
}

// ─── Reenviar QR de check-in no WhatsApp (admin) ─────────────────

export async function reenviarQrCheckin(inscricaoId: string): Promise<void> {
  const inscricao = await prisma.inscricao.findUnique({
    where:   { id: inscricaoId },
    include: inscricaoInclude,
  })
  if (!inscricao) throw new NotFoundError('Inscrição não encontrada')
  if (inscricao.status === 'cancelado') {
    throw new BadRequestError('Inscrição cancelada — não há QR para reenviar')
  }

  // Validações que dão feedback claro ao admin antes de tentar enviar
  if (!config.evolution.enabled) {
    throw new BadRequestError('WhatsApp não está configurado no servidor')
  }
  if ((await getConnectionState()) !== 'open') {
    throw new BadRequestError('WhatsApp não está conectado. Sincronize em Configurações.')
  }
  if (!inscricao.corretor.whatsapp) {
    throw new BadRequestError('O corretor não tem WhatsApp cadastrado')
  }
  if (!(await getOptIn(inscricao.corretor_id))) {
    throw new BadRequestError('O corretor não autorizou o recebimento de mensagens no WhatsApp')
  }

  const msg = await renderMensagem('inscricao_confirmada', {
    nome: inscricao.corretor.nome, evento: inscricao.evento.titulo,
    data: formatDataEvento(inscricao.evento.data_evento),
    hora: inscricao.evento.hora_inicio, local: inscricao.evento.local,
  })
  const texto = msg?.texto ?? `Seu QR Code de check-in para *${inscricao.evento.titulo}*. Apresente na entrada.`

  const qrBase64 = await gerarQrCheckinBase64(inscricao.qr_code_token)

  await notify({
    corretorId: inscricao.corretor_id, eventoId: inscricao.evento_id, tipo: 'inscricao_confirmada',
    whatsapp: inscricao.corretor.whatsapp, optIn: true,
    mensagem: texto, imagemBase64: qrBase64,
  })
}

// ─── Cancelar inscrição ──────────────────────────────────────────

export async function cancelarInscricao(inscricaoId: string, requesterId: string, isAdmin: boolean) {
  const inscricao = await prisma.inscricao.findUnique({ where: { id: inscricaoId } })
  if (!inscricao) throw new NotFoundError('Inscrição não encontrada')

  // Corretor só cancela a própria inscrição
  if (!isAdmin && inscricao.corretor_id !== requesterId) {
    throw new ForbiddenError('Você só pode cancelar suas próprias inscrições')
  }
  if (inscricao.status === 'presente') {
    throw new BadRequestError('Não é possível cancelar uma inscrição com presença já confirmada')
  }

  await prisma.inscricao.update({ where: { id: inscricaoId }, data: { status: 'cancelado' } })
  emitAdminRefresh('inscricao-cancelada')
}

// ─── Check-in por QR token ───────────────────────────────────────

export interface CheckinResult {
  ok:        boolean
  erro?:     string
  inscricao?: Awaited<ReturnType<typeof getInscricaoByToken>>
}

export async function realizarCheckin(token: string, adminId: string): Promise<CheckinResult> {
  const inscricao = await getInscricaoByToken(token)

  if (!inscricao)                       return { ok: false, erro: 'QR Code não encontrado ou inválido' }
  if (inscricao.status === 'presente')  return { ok: false, erro: 'Check-in já realizado', inscricao }
  if (inscricao.status === 'cancelado') return { ok: false, erro: 'Inscrição cancelada' }

  const atualizada = await prisma.inscricao.update({
    where:   { id: inscricao.id },
    data:    { status: 'presente', checkin_at: new Date(), checkin_por: adminId },
    include: inscricaoInclude,
  })

  // Notifica presença usando o template editável
  const msgCheckin = await renderMensagem('checkin', {
    nome: atualizada.corretor.nome, evento: atualizada.evento.titulo,
  })
  if (msgCheckin) {
    await notify({
      corretorId: atualizada.corretor_id, eventoId: atualizada.evento_id, tipo: 'checkin',
      whatsapp: atualizada.corretor.whatsapp, optIn: await getOptIn(atualizada.corretor_id),
      mensagem: msgCheckin.texto,
    })
  }

  emitAdminRefresh('checkin')
  return { ok: true, inscricao: atualizada }
}

// ─── Status manual (admin marca presente/ausente) ────────────────

export async function setStatusManual(
  inscricaoId: string,
  status: 'presente' | 'ausente' | 'cancelado',
  adminId: string,
) {
  const inscricao = await prisma.inscricao.findUnique({ where: { id: inscricaoId } })
  if (!inscricao) throw new NotFoundError('Inscrição não encontrada')

  const atualizada = await prisma.inscricao.update({
    where: { id: inscricaoId },
    data: {
      status,
      checkin_at:  status === 'presente' ? new Date() : null,
      checkin_por: status === 'presente' ? adminId : null,
    },
    include: inscricaoInclude,
  })
  emitAdminRefresh('inscricao-status')
  return atualizada
}

// ─── Helpers ──────────────────────────────────────────────────────

async function getInscricaoByToken(token: string) {
  return prisma.inscricao.findUnique({ where: { qr_code_token: token }, include: inscricaoInclude })
}

async function getOptIn(corretorId: string): Promise<boolean> {
  const c = await prisma.corretor.findUnique({
    where: { id: corretorId }, select: { whatsapp_opt_in: true },
  })
  return c?.whatsapp_opt_in ?? false
}
