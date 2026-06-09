/**
 * Rota de disparo manual de lembretes (admin) — útil para teste e para
 * reenviar caso o cron tenha falhado.
 *
 *   POST /lembretes/disparar  → roda enviarLembretes(hoje) e retorna a contagem
 */
import type { FastifyInstance } from 'fastify'
import { enviarLembretes } from '@/jobs/lembretes'
import { authenticate, requireAdmin } from '@/middlewares/auth.middleware'

export async function lembretesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireAdmin)

  app.post('/disparar', async (_req, reply) => {
    const resultado = await enviarLembretes()
    return reply.send({
      message: 'Lembretes processados',
      ...resultado, // { d1, d0 }
    })
  })
}
