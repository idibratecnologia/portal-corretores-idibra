/**
 * Limpeza automática de vídeos de treinamento expirados.
 *
 * Roda diariamente às 03:30 (America/Sao_Paulo). A regra (excluir após
 * data_encerramento + dias_para_exclusao) está em `limparVideosExpirados`.
 *
 * Também pode ser executado manualmente:
 *   node dist/jobs/videos.js
 */
import cron from 'node-cron'
import { limparVideosExpirados } from '@/modules/treinamentos/treinamentos.service'

export function agendarLimpezaVideos() {
  cron.schedule(
    '30 3 * * *',
    () => {
      limparVideosExpirados()
        .then(({ removidos }) => console.log(`[cron:videos] ${removidos} vídeo(s) expirado(s) removido(s)`))
        .catch((err) => console.error('[cron:videos] erro:', err))
    },
    { timezone: 'America/Sao_Paulo' },
  )
  console.log('⏰ Cron de limpeza de vídeos agendado (03:30 diário)')
}

// Execução direta (CLI / cron do sistema)
if (require.main === module) {
  limparVideosExpirados()
    .then(({ removidos, ids }) => {
      console.log(`[limpeza-videos] concluído: ${removidos} removido(s)`, ids)
      process.exit(0)
    })
    .catch((err) => {
      console.error('[limpeza-videos] erro:', err)
      process.exit(1)
    })
}
