/**
 * Executa os disparos em massa agendados quando chega a hora marcada.
 * Roda a cada minuto (America/Sao_Paulo). A execução é protegida contra
 * reentrância e cada item recebe um "claim" atômico (sem envio em duplicidade).
 */
import cron from 'node-cron'
import { executarDisparosPendentes } from '@/modules/disparos-agendados/disparos-agendados.service'
import { emitAdminRefresh } from '@/lib/events'

export function agendarDisparosAgendados() {
  cron.schedule(
    '* * * * *',
    () => {
      executarDisparosPendentes()
        .then((n) => { if (n > 0) emitAdminRefresh('disparos-agendados') })
        .catch((err) => console.error('[cron:disparos-agendados] erro:', err))
    },
    { timezone: 'America/Sao_Paulo' },
  )
  console.log('⏰ Cron de disparos agendados ativo (a cada minuto)')
}
