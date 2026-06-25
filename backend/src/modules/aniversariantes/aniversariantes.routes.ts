/**
 * Aniversariantes (admin/operador).
 *   GET  /aniversariantes?mes=6   lista do mês (default: mês atual)
 *   POST /aniversariantes/:id/felicitar   envia a felicitação manualmente
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { audit } from '@/lib/audit'
import { authenticate, requireAdmin } from '@/middlewares/auth.middleware'
import * as service from './aniversariantes.service'

export async function aniversariantesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireAdmin)

  app.get('/', async (req, reply) => {
    const { mes } = z.object({ mes: z.coerce.number().int().min(1).max(12).optional() }).parse(req.query)
    return reply.send(await service.listarAniversariantes(mes))
  })

  app.post('/:id/felicitar', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid('ID inválido') }).parse(req.params)
    await service.enviarParabens(id)
    audit(req, 'enviou', 'corretor', id, 'Felicitação de aniversário')
    return reply.send({ ok: true })
  })
}
