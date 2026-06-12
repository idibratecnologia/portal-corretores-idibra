/**
 * Logs de auditoria — listagem (somente super-admin).
 *   GET /logs?page=&limit=&entidade=&acao=&search=
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { listAuditLogs } from '@/lib/audit'
import { authenticate, requireSuperAdmin } from '@/middlewares/auth.middleware'

const querySchema = z.object({
  page:     z.coerce.number().int().positive().optional(),
  limit:    z.coerce.number().int().positive().optional(),
  entidade: z.string().optional(),
  acao:     z.string().optional(),
  search:   z.string().optional(),
})

export async function logsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireSuperAdmin)

  app.get('/', async (req, reply) => {
    const q = querySchema.parse(req.query)
    return reply.send(await listAuditLogs(q))
  })
}
