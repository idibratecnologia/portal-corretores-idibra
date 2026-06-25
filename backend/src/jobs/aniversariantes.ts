/**
 * Felicitação automática de aniversário — roda todo dia às 09:00 (America/Sao_Paulo).
 * Idempotente: não reenvia para quem já recebeu no mesmo dia.
 */
import cron from 'node-cron'
import { enviarAniversariantesDoDia } from '@/modules/aniversariantes/aniversariantes.service'

export function agendarAniversariantes() {
  cron.schedule(
    '0 9 * * *',
    () => {
      enviarAniversariantesDoDia()
        .catch((err) => console.error('[cron:aniversariantes] erro:', err))
    },
    { timezone: 'America/Sao_Paulo' },
  )
  console.log('⏰ Cron de aniversariantes agendado (todo dia às 09:00)')
}
