/**
 * Rotas de relatórios (todas restritas a admin).
 *
 *   GET /relatorios/dashboard       → KPIs + dados dos gráficos
 *   GET /relatorios/eventos?periodo=        → estatísticas por evento
 *   GET /relatorios/corretores?periodo=     → ranking de corretores
 *   GET /relatorios/participacoes?periodo=  → histórico de participações
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as service from './relatorios.service'
import { authenticate, requireAdmin } from '@/middlewares/auth.middleware'

const periodoSchema = z.object({
  periodo: z.enum(['7d', '30d', '90d', '365d', 'all']).default('all'),
})

export async function relatoriosRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireAdmin)

  app.get('/dashboard', async (_req, reply) => {
    return reply.send(await service.getDashboard())
  })

  app.get('/eventos', async (req, reply) => {
    const { periodo } = periodoSchema.parse(req.query)
    return reply.send(await service.getRelatorioEventos(periodo))
  })

  app.get('/corretores', async (req, reply) => {
    const { periodo } = periodoSchema.parse(req.query)
    return reply.send(await service.getRelatorioCorretores(periodo))
  })

  app.get('/participacoes', async (req, reply) => {
    const { periodo } = periodoSchema.parse(req.query)
    return reply.send(await service.getRelatorioParticipacoes(periodo))
  })
}
