/**
 * Rotas de configurações (restritas a admin).
 *
 *   GET   /configuracoes   → lê as configurações
 *   PATCH /configuracoes   → atualiza
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as service from './configuracoes.service'
import { authenticate, requireAdmin } from '@/middlewares/auth.middleware'

const updateSchema = z.object({
  empresa_nome:     z.string().optional(),
  empresa_email:    z.string().email('E-mail inválido').optional().or(z.literal('')),
  empresa_telefone: z.string().optional(),
  empresa_site:     z.string().optional(),
  auto_approve:     z.boolean().optional(),
  notify_inscricao: z.boolean().optional(),
  allow_cancel:     z.boolean().optional(),
})

export async function configuracoesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireAdmin)

  app.get('/', async (_req, reply) => {
    return reply.send(await service.getConfig())
  })

  app.patch('/', async (req, reply) => {
    const body = updateSchema.parse(req.body)
    return reply.send(await service.updateConfig(body))
  })
}
