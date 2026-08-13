/**
 * Aniversariantes do mês + felicitação automática no dia.
 * A mensagem é o template editável `aniversario` (Central de Notificações).
 */
import { prisma } from '@/lib/prisma'
import { notify } from '@/lib/notifications'
import { renderMensagem } from '@/modules/templates/templates.service'
import { NotFoundError, BadRequestError } from '@/lib/errors'

/** Mês/dia "de hoje" no fuso de Brasília (1-12 / 1-31). */
function hojeBrasilia(ref: Date = new Date()): { mes: number; dia: number; ano: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  })
  const [ano, mes, dia] = fmt.format(ref).split('-').map(Number)
  return { mes, dia, ano }
}

// data_nascimento é gravada como meio-dia UTC do dia escolhido → usamos UTC.
const mesDe = (d: Date) => d.getUTCMonth() + 1
const diaDe = (d: Date) => d.getUTCDate()

export interface Aniversariante {
  id: string
  nome: string
  data_nascimento: string
  dia: number
  mes: number
  idade: number | null
  cidade: string | null
  uf: string | null
  whatsapp: string
  email: string | null
  whatsapp_opt_in: boolean
  email_opt_in: boolean
}

export async function listarAniversariantes(mes?: number): Promise<Aniversariante[]> {
  const mesAlvo = mes && mes >= 1 && mes <= 12 ? mes : hojeBrasilia().mes
  const anoAtual = hojeBrasilia().ano

  const corretores = await prisma.corretor.findMany({
    where: { status: { not: 'bloqueado' }, data_nascimento: { not: null } },
    select: {
      id: true, nome: true, data_nascimento: true, cidade: true, uf: true,
      whatsapp: true, email: true, whatsapp_opt_in: true, email_opt_in: true,
    },
  })

  return corretores
    .filter((c) => c.data_nascimento && mesDe(c.data_nascimento) === mesAlvo)
    .map((c) => {
      const nasc = c.data_nascimento as Date
      return {
        id: c.id, nome: c.nome, data_nascimento: nasc.toISOString(),
        dia: diaDe(nasc), mes: mesDe(nasc),
        idade: anoAtual - nasc.getUTCFullYear(),
        cidade: c.cidade, uf: c.uf, whatsapp: c.whatsapp, email: c.email,
        whatsapp_opt_in: c.whatsapp_opt_in, email_opt_in: c.email_opt_in,
      }
    })
    .sort((a, b) => a.dia - b.dia || a.nome.localeCompare(b.nome))
}

/** Envia a felicitação a um corretor (WhatsApp respeita opt-in; e-mail respeita email_opt_in). */
export async function enviarParabens(corretorId: string): Promise<boolean> {
  const c = await prisma.corretor.findUnique({
    where: { id: corretorId },
    select: { id: true, nome: true, whatsapp: true, whatsapp_opt_in: true },
  })
  if (!c) throw new NotFoundError('Corretor não encontrado')
  const msg = await renderMensagem('aniversario', { nome: c.nome.split(' ')[0] })
  if (!msg) throw new BadRequestError('O template de aniversário está inativo.')
  await notify({
    corretorId: c.id, tipo: 'aniversario',
    whatsapp: c.whatsapp, optIn: c.whatsapp_opt_in, mensagem: msg.texto,
    imagemUrl: msg.imagemUrl ?? undefined,
  })
  return true
}

/** Executado pelo cron: felicita quem faz aniversário hoje (idempotente no dia). */
export async function enviarAniversariantesDoDia(ref: Date = new Date()): Promise<number> {
  const { mes, dia } = hojeBrasilia(ref)

  const corretores = await prisma.corretor.findMany({
    where: { status: 'ativo', data_nascimento: { not: null } },
    select: { id: true, data_nascimento: true },
  })
  const aniversariantes = corretores.filter(
    (c) => c.data_nascimento && mesDe(c.data_nascimento) === mes && diaDe(c.data_nascimento) === dia,
  )
  if (aniversariantes.length === 0) return 0

  // Evita reenvio no mesmo dia (ex.: restart do servidor)
  const inicioDia = new Date(ref); inicioDia.setHours(0, 0, 0, 0)
  const jaEnviados = await prisma.notificacaoLog.findMany({
    where: { tipo: 'aniversario', enviado_at: { gte: inicioDia }, corretor_id: { in: aniversariantes.map((c) => c.id) } },
    select: { corretor_id: true },
  })
  const enviadosSet = new Set(jaEnviados.map((l) => l.corretor_id))

  let enviados = 0
  for (const c of aniversariantes) {
    if (enviadosSet.has(c.id)) continue
    try {
      await enviarParabens(c.id)
      enviados++
    } catch (err) {
      console.error(`[aniversariantes] falha ao felicitar ${c.id}:`, err instanceof Error ? err.message : err)
    }
  }
  if (enviados) console.log(`[aniversariantes] ${enviados} felicitação(ões) enviada(s)`)
  return enviados
}
