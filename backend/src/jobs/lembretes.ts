/**
 * Lembretes automáticos de eventos (D-1 e D-0).
 *
 * - `enviarLembretes(ref)` — lógica pura e testável: processa os lembretes
 *   tomando `ref` como "hoje". Idempotente: não reenvia (consulta NotificacaoLog).
 * - `agendarLembretes()` — agenda o cron diário às 08:00 (America/Sao_Paulo).
 *
 * A entrega usa `notify()`, que respeita o opt-in (LGPD) e hoje loga no servidor;
 * quando o Evolution (Bloco 4) estiver ativo, passa a enviar WhatsApp real.
 */
import cron from 'node-cron'
import { prisma } from '@/lib/prisma'
import { notify } from '@/lib/notifications'
import type { NotificacaoTipo } from '@/lib/notifications'
import { renderMensagem, getDiasAntecedencia } from '@/modules/templates/templates.service'
import { formatDataEvento } from '@/lib/format'

/** Janela [00:00 de (ref+offset), 00:00 do dia seguinte). */
function janelaDoDia(ref: Date, offsetDias: number) {
  const inicio = new Date(ref)
  inicio.setHours(0, 0, 0, 0)
  inicio.setDate(inicio.getDate() + offsetDias)
  const fim = new Date(inicio)
  fim.setDate(fim.getDate() + 1)
  return { inicio, fim }
}

/** Processa um dia (D-X ou D-0) e retorna quantos lembretes foram disparados. */
async function processarDia(
  ref: Date,
  offsetDias: number,
  tipo: 'lembrete_antecedencia' | 'lembrete_dia',
): Promise<number> {
  const { inicio, fim } = janelaDoDia(ref, offsetDias)

  const eventos = await prisma.evento.findMany({
    where: { status: 'publicado', data_evento: { gte: inicio, lt: fim } },
    include: {
      inscricoes: {
        where:   { status: 'inscrito' },
        include: { corretor: true },
      },
    },
  })

  let enviados = 0

  for (const evento of eventos) {
    for (const inscricao of evento.inscricoes) {
      const corretor = inscricao.corretor
      if (!corretor.whatsapp_opt_in) continue

      // Idempotência: não reenvia se já houve disparo bem-sucedido deste tipo
      const jaEnviado = await prisma.notificacaoLog.findFirst({
        where: { corretor_id: corretor.id, evento_id: evento.id, tipo, status: 'enviado' },
      })
      if (jaEnviado) continue

      const msg = await renderMensagem(tipo, {
        nome: corretor.nome, evento: evento.titulo,
        data: formatDataEvento(evento.data_evento), hora: evento.hora_inicio,
        local: evento.local, dias: offsetDias,
      })
      if (!msg) return enviados // template inativo → não envia este tipo

      await notify({
        corretorId: corretor.id, eventoId: evento.id, tipo: tipo as NotificacaoTipo,
        whatsapp: corretor.whatsapp, optIn: true, mensagem: msg.texto,
      })
      enviados++
    }
  }

  return enviados
}

/**
 * Dispara os lembretes considerando `ref` como "hoje".
 * Retorna a contagem de cada tipo (antecedência configurável + dia do evento).
 */
export async function enviarLembretes(ref: Date = new Date()): Promise<{ d1: number; d0: number }> {
  const antecedencia = await getDiasAntecedencia()
  const d1 = await processarDia(ref, antecedencia, 'lembrete_antecedencia') // X dias antes
  const d0 = await processarDia(ref, 0, 'lembrete_dia')                      // dia do evento
  return { d1, d0 }
}

/** Agenda o cron diário (08:00, horário de São Paulo). */
export function agendarLembretes() {
  cron.schedule(
    '0 8 * * *',
    () => {
      enviarLembretes()
        .then(({ d1, d0 }) => console.log(`[cron:lembretes] D-1=${d1} D-0=${d0} disparados`))
        .catch((err) => console.error('[cron:lembretes] erro:', err))
    },
    { timezone: 'America/Sao_Paulo' },
  )
  console.log('⏰ Cron de lembretes agendado (08:00 diário)')
}
