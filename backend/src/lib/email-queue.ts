/**
 * Fila de envios de e-mail (Microsoft Graph) com throttle leve.
 * Serializa os envios e aplica um pequeno atraso entre eles para não estourar
 * os limites de envio do Graph/mailbox em disparos em massa.
 *
 * Fila em memória (processo único): jobs em espera são perdidos no restart —
 * aceitável para notificações best-effort.
 */
type Job = () => Promise<void>

const queue: Job[] = []
let processing = false
const DELAY_MS = 1200 // ~50 e-mails/min

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function enqueueEmail(job: Job): void {
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
        console.error('[email-queue] job falhou:', err)
      }
      if (queue.length > 0) await sleep(DELAY_MS)
    }
  } finally {
    processing = false
  }
}

export function emailQueueSize(): number {
  return queue.length
}
