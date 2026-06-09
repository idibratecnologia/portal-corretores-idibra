/**
 * Fila de envios de WhatsApp com throttle.
 *
 * Como usamos uma API não oficial (Evolution/Baileys), disparos em massa muito
 * rápidos aumentam o risco de bloqueio do número pela Meta. Esta fila serializa
 * TODOS os envios e aplica um atraso (com jitter) entre cada mensagem, simulando
 * um ritmo mais humano.
 *
 * É uma fila em memória (processo único). Os jobs em espera são perdidos se o
 * servidor reiniciar — aceitável para notificações; se um dia precisar de
 * garantia de entrega, migrar para uma fila persistente (ex.: tabela + worker).
 */
import { config } from '@/config'

type Job = () => Promise<void>

const queue: Job[] = []
let processing = false

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Atraso aleatório entre min e max (jitter) para evitar um padrão fixo. */
function proximoAtraso(): number {
  const { minDelayMs, maxDelayMs } = config.whatsapp
  return Math.floor(minDelayMs + Math.random() * (maxDelayMs - minDelayMs))
}

/**
 * Enfileira um envio. Retorna imediatamente (fire-and-forget): o job roda em
 * segundo plano, respeitando o throttle. Cada job é responsável por tratar e
 * registrar seus próprios erros.
 */
export function enqueueWhatsApp(job: Job): void {
  queue.push(job)
  if (!processing) void processQueue()
}

async function processQueue(): Promise<void> {
  processing = true
  try {
    while (queue.length > 0) {
      const job = queue.shift()!
      try {
        await job()
      } catch (err) {
        console.error('[whatsapp-queue] job falhou:', err)
      }
      // Aguarda antes do próximo envio (não atrasa o último)
      if (queue.length > 0) await sleep(proximoAtraso())
    }
  } finally {
    processing = false
  }
}

/** Quantidade de envios aguardando na fila (para diagnóstico/monitoramento). */
export function whatsappQueueSize(): number {
  return queue.length
}
