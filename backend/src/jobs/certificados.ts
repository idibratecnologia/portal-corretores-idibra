/**
 * Envio automático de certificados por WhatsApp ao ENCERRAR o evento.
 *
 * Quando o criador marca `enviar_certificado_auto`, este job — ao detectar que
 * o evento já terminou (data + hora_fim) — libera os certificados e os dispara
 * por WhatsApp a todos os presentes (respeitando o opt-in / fila do WhatsApp).
 *
 * Idempotente: usa `certificados_enviados_em` para nunca reenviar.
 * Roda de hora em hora (America/Sao_Paulo).
 */
import cron from 'node-cron'
import { prisma } from '@/lib/prisma'
import { emitAdminRefresh } from '@/lib/events'
import { enviarCertificadosEvento } from '@/modules/inscricoes/inscricoes.service'

/** Instante de término do evento (dia de data_evento + hora_fim, horário local). */
function fimDoEvento(dataEvento: Date, horaFim: string): Date {
  const [hh, mm] = horaFim.split(':').map(Number)
  // data_evento é gravada como meio-dia UTC do dia escolhido → usamos a data UTC
  // e combinamos com hora_fim no fuso local do servidor (America/Sao_Paulo).
  return new Date(dataEvento.getUTCFullYear(), dataEvento.getUTCMonth(), dataEvento.getUTCDate(),
    Number.isFinite(hh) ? hh : 23, Number.isFinite(mm) ? mm : 59, 0)
}

/**
 * Processa os envios automáticos pendentes, tomando `ref` como "agora".
 * Retorna quantos eventos foram processados e quantos certificados enfileirados.
 */
export async function enviarCertificadosAutomaticos(ref: Date = new Date()): Promise<{ eventos: number; enfileirados: number }> {
  const limiteData = new Date(ref)
  limiteData.setHours(23, 59, 59, 999)

  const candidatos = await prisma.evento.findMany({
    where: {
      enviar_certificado_auto: true,
      certificados_enviados_em: null,
      status: { in: ['publicado', 'encerrado'] },
      data_evento: { lte: limiteData },
    },
    select: { id: true, titulo: true, data_evento: true, hora_fim: true },
  })

  let eventos = 0
  let enfileirados = 0

  for (const ev of candidatos) {
    if (fimDoEvento(ev.data_evento, ev.hora_fim).getTime() > ref.getTime()) continue // ainda não terminou

    try {
      // Libera os certificados (permite o envio e o download no portal) e dispara
      await prisma.evento.update({ where: { id: ev.id }, data: { certificados_habilitados: true } })
      const r = await enviarCertificadosEvento(ev.id)
      // Carimba para nunca reenviar
      await prisma.evento.update({ where: { id: ev.id }, data: { certificados_enviados_em: new Date() } })
      eventos++
      enfileirados += r.enfileirados
      console.log(`[cron:certificados] "${ev.titulo}": ${r.enfileirados}/${r.total} enviado(s) (sem opt-in: ${r.semOptIn})`)
    } catch (err) {
      console.error(`[cron:certificados] erro no evento ${ev.id}:`, err)
      // sem carimbo → tenta de novo na próxima execução
    }
  }

  if (eventos) emitAdminRefresh('certificados-auto')
  return { eventos, enfileirados }
}

/** Agenda o job (de hora em hora, no minuto 5). */
export function agendarCertificadosAutomaticos() {
  cron.schedule(
    '5 * * * *',
    () => {
      enviarCertificadosAutomaticos()
        .then(({ eventos, enfileirados }) => {
          if (eventos) console.log(`[cron:certificados] ${eventos} evento(s), ${enfileirados} certificado(s) enfileirado(s)`)
        })
        .catch((err) => console.error('[cron:certificados] erro:', err))
    },
    { timezone: 'America/Sao_Paulo' },
  )
  console.log('⏰ Cron de certificados automáticos agendado (de hora em hora)')
}
