/**
 * Gestão de usuários administrativos — TODAS as rotas exigem super-admin.
 *
 *   GET    /usuarios       → lista
 *   POST   /usuarios       → cria (super | operador)
 *   PATCH  /usuarios/:id   → edita (dados, nível, senha)
 *   DELETE /usuarios/:id   → exclui
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as service from './usuarios.service'
import { createUsuarioSchema, updateUsuarioSchema } from './usuarios.schema'
import { authenticate, requireSuperAdmin } from '@/middlewares/auth.middleware'

const idParam = z.object({ id: z.string().uuid('ID inválido') })

export async function usuariosRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireSuperAdmin)

  app.get('/', async (_req, reply) => {
    return reply.send(await service.listUsuarios())
  })

  app.post('/', async (req, reply) => {
    const body = createUsuarioSchema.parse(req.body)
    return reply.status(201).send(await service.createUsuario(body))
  })

  app.patch('/:id', async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const body = updateUsuarioSchema.parse(req.body)
    return reply.send(await service.updateUsuario(id, body))
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = idParam.parse(req.params)
    await service.deleteUsuario(id, req.user!.sub)
    return reply.status(204).send()
  })
}
