/**
 * Rotas de imobiliárias (todas restritas a admin).
 *
 *   GET    /imobiliarias        → listar
 *   GET    /imobiliarias/:id    → detalhe + corretores
 *   POST   /imobiliarias        → criar
 *   PATCH  /imobiliarias/:id    → editar
 *   PATCH  /imobiliarias/:id/status → ativar/inativar
 *   DELETE /imobiliarias/:id    → excluir
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as service from './imobiliarias.service'
import {
  createImobiliariaSchema, updateImobiliariaSchema, statusImobiliariaSchema,
} from './imobiliarias.schema'
import { authenticate, requireAdmin, requireSuperAdmin } from '@/middlewares/auth.middleware'
import { readImageUpload } from '@/lib/upload'

const idParam = z.object({ id: z.string().uuid('ID inválido') })

/**
 * Rota pública (sem autenticação) — usada no cadastro de corretores.
 * Registrada separadamente para não herdar o hook de admin.
 */
export async function imobiliariasPublicRoutes(app: FastifyInstance) {
  app.get('/publicas', async (_req, reply) => {
    return reply.send(await service.listImobiliariasPublicas())
  })
}

export async function imobiliariasRoutes(app: FastifyInstance) {
  // Todas as rotas exigem admin
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireAdmin)

  app.get('/', async (_req, reply) => {
    return reply.send(await service.listImobiliarias())
  })

  app.get('/:id', async (req, reply) => {
    const { id } = idParam.parse(req.params)
    return reply.send(await service.getImobiliariaById(id))
  })

  app.post('/', async (req, reply) => {
    const body = createImobiliariaSchema.parse(req.body)
    return reply.status(201).send(await service.createImobiliaria(body))
  })

  app.patch('/:id', async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const body = updateImobiliariaSchema.parse(req.body)
    return reply.send(await service.updateImobiliaria(id, body))
  })

  app.patch('/:id/status', async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const { status } = statusImobiliariaSchema.parse(req.body)
    return reply.send(await service.setStatus(id, status))
  })

  app.delete('/:id', { preHandler: requireSuperAdmin }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    await service.deleteImobiliaria(id)
    return reply.status(204).send()
  })

  // ── Logo ──────────────────────────────────────────────────────
  app.post('/:id/logo', async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const buffer = await readImageUpload(req)
    return reply.send(await service.updateLogo(id, buffer))
  })

  app.delete('/:id/logo', async (req, reply) => {
    const { id } = idParam.parse(req.params)
    await service.removeLogo(id)
    return reply.status(204).send()
  })
}
