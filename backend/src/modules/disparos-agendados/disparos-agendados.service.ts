/**
 * Disparos agendados — persistência + execução pelo cron.
 * Reaproveita o broadcast() do módulo WhatsApp (que já trata canais, opt-in e fila).
 */
import { prisma } from '@/lib/prisma'
import { broadcast } from '@/modules/whatsapp/whatsapp.service'
import { BadRequestError, NotFoundError } from '@/lib/errors'

export interface CriarDisparoAgendadoInput {
  mensagem: string
  assunto?: string
  canalWhatsapp: boolean
  canalEmail: boolean
  corretorIds: string[]
  agendadoPara: Date
  anexo?: { base64: string; fileName: string; mimeType: string }
  eventoId?: string
  imagemUrl?: string
}

const selectResumo = {
  id: true, mensagem: true, assunto: true, canal_whatsapp: true, canal_email: true,
  corretor_ids: true, agendado_para: true, status: true, resultado: true, erro: true,
  enviado_at: true, created_at: true, anexo_nome: true, evento_id: true,
} as const

interface RowResumo {
  id: string
  mensagem: string
  assunto: string | null
  canal_whatsapp: boolean
  canal_email: boolean
  corretor_ids: string[]
  agendado_para: Date
  status: string
  resultado: string | null
  erro: string | null
  enviado_at: Date | null
  created_at: Date
  anexo_nome: string | null
  evento_id: string | null
}

function mapResumo(r: RowResumo) {
  const { corretor_ids, anexo_nome, ...rest } = r
  return { ...rest, total_corretores: corretor_ids.length, tem_anexo: !!anexo_nome }
}

export async function criarDisparoAgendado(i: CriarDisparoAgendadoInput) {
  if (i.agendadoPara.getTime() <= Date.now()) throw new BadRequestError('A data/hora do agendamento deve ser no futuro.')
  if (!i.canalWhatsapp && !i.canalEmail) throw new BadRequestError('Selecione ao menos um canal.')
  const row = await prisma.disparoAgendado.create({
    data: {
      mensagem: i.mensagem, assunto: i.assunto ?? null,
      canal_whatsapp: i.canalWhatsapp, canal_email: i.canalEmail,
      corretor_ids: i.corretorIds, agendado_para: i.agendadoPara, evento_id: i.eventoId ?? null, imagem_url: i.imagemUrl ?? null,
      anexo_base64: i.anexo?.base64 ?? null, anexo_nome: i.anexo?.fileName ?? null, anexo_mime: i.anexo?.mimeType ?? null,
    },
    select: selectResumo,
  })
  return mapResumo(row)
}

export async function listarDisparosAgendados(status?: string) {
  const rows = await prisma.disparoAgendado.findMany({
    where: status ? { status } : {},
    orderBy: [{ status: 'asc' }, { agendado_para: 'asc' }],
    select: selectResumo,
    take: 200,
  })
  return rows.map(mapResumo)
}

export async function cancelarDisparoAgendado(id: string) {
  const d = await prisma.disparoAgendado.findUnique({ where: { id }, select: { status: true } })
  if (!d) throw new NotFoundError('Agendamento não encontrado.')
  if (d.status !== 'pendente') throw new BadRequestError('Só é possível cancelar agendamentos pendentes.')
  await prisma.disparoAgendado.update({ where: { id }, data: { status: 'cancelado' } })
}

let executando = false

/** Executado pelo cron: dispara os agendamentos cujo horário já chegou. */
export async function executarDisparosPendentes(): Promise<number> {
  if (executando) return 0
  executando = true
  let processados = 0
  try {
    const pendentes = await prisma.disparoAgendado.findMany({
      where: { status: 'pendente', agendado_para: { lte: new Date() } },
      orderBy: { agendado_para: 'asc' },
    })
    for (const d of pendentes) {
      // "claim" atômico para evitar disparo em duplicidade
      const claim = await prisma.disparoAgendado.updateMany({
        where: { id: d.id, status: 'pendente' }, data: { status: 'processando' },
      })
      if (claim.count === 0) continue
      processados++

      try {
        const anexo = d.anexo_base64 && d.anexo_nome
          ? { base64: d.anexo_base64, fileName: d.anexo_nome, mimeType: d.anexo_mime ?? 'application/octet-stream' }
          : undefined
        const r = await broadcast(d.mensagem, d.corretor_ids, {
          whatsapp: d.canal_whatsapp, email: d.canal_email, assunto: d.assunto ?? undefined, anexo,
          eventoId: d.evento_id ?? undefined, imagemUrl: d.imagem_url ?? undefined,
        })
        const resultado = `WhatsApp ${r.whatsapp} · E-mail ${r.emails}${r.semCanal ? ` · ${r.semCanal} sem canal` : ''}`
        await prisma.disparoAgendado.update({
          where: { id: d.id }, data: { status: 'enviado', enviado_at: new Date(), resultado },
        })
        console.log(`[disparo-agendado] ${d.id} → ${resultado}`)
      } catch (err) {
        await prisma.disparoAgendado.update({
          where: { id: d.id }, data: { status: 'erro', erro: err instanceof Error ? err.message : String(err) },
        })
        console.error(`[disparo-agendado] ${d.id} falhou:`, err instanceof Error ? err.message : err)
      }
    }
  } finally {
    executando = false
  }
  return processados
}
