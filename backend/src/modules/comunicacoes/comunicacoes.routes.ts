/**
 * Central de Comunicações (admin/operador): histórico de notificações enviadas.
 *   GET /comunicacoes        → lista paginada (filtros: canal, status, tipo, q)
 *   GET /comunicacoes/resumo → contadores por canal/status
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as service from './comunicacoes.service'
import { authenticate, requireAdmin } from '@/middlewares/auth.middleware'

export async function comunicacoesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireAdmin)

  app.get('/', async (req, reply) => {
    const q = z.object({
      canal:  z.enum(['whatsapp', 'email']).optional(),
      status: z.enum(['enviado', 'erro']).optional(),
      tipo:   z.string().optional(),
      q:      z.string().optional(),
      page:   z.coerce.number().int().positive().optional(),
      limit:  z.coerce.number().int().positive().optional(),
    }).parse(req.query)
    return reply.send(await service.listComunicacoes(q))
  })

  app.get('/resumo', async (_req, reply) => {
    return reply.send(await service.resumoComunicacoes())
  })
}
