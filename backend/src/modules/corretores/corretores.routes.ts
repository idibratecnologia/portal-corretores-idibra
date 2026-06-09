/**
 * Rotas de corretores.
 *
 *   GET   /corretores/me           → perfil do corretor logado (corretor)
 *   PATCH /corretores/me/opt-in    → corretor altera o próprio opt-in (corretor)
 *
 *   GET    /corretores             → listar paginado (admin)
 *   GET    /corretores/:id         → detalhe (admin)
 *   POST   /corretores             → criar (admin)
 *   PATCH  /corretores/:id         → editar (admin)
 *   PATCH  /corretores/:id/status  → aprovar/bloquear (admin)
 *   PATCH  /corretores/:id/opt-in  → alterar opt-in (admin)
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as service from './corretores.service'
import {
  listCorretoresSchema, createCorretorSchema, updateCorretorSchema,
  updateMeuPerfilSchema, statusCorretorSchema, optInSchema,
} from './corretores.schema'
import { authenticate, requireAdmin, requireCorretor } from '@/middlewares/auth.middleware'
import { readImageUpload } from '@/lib/upload'
import { ForbiddenError } from '@/lib/errors'

const idParam = z.object({ id: z.string().uuid('ID inválido') })

export async function corretoresRoutes(app: FastifyInstance) {
  // ── Rotas do corretor logado ───────────────────────────────────
  app.get('/me', { preHandler: [authenticate, requireCorretor] }, async (req, reply) => {
    return reply.send(await service.getMeuPerfil(req.user!.sub))
  })

  app.patch('/me/opt-in', { preHandler: [authenticate, requireCorretor] }, async (req, reply) => {
    const { whatsapp_opt_in } = optInSchema.parse(req.body)
    await service.setOptIn(req.user!.sub, whatsapp_opt_in)
    return reply.send({ message: 'Preferência atualizada' })
  })

  // Corretor edita o próprio perfil (sem campos administrativos)
  app.patch('/me', { preHandler: [authenticate, requireCorretor] }, async (req, reply) => {
    const body = updateMeuPerfilSchema.parse(req.body)
    return reply.send(await service.updateCorretor(req.user!.sub, body))
  })

  // ── Foto de perfil (corretor dono ou admin) ────────────────────
  app.post('/:id/foto', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    if (req.user!.role !== 'admin' && req.user!.sub !== id) {
      throw new ForbiddenError('Você só pode alterar a sua própria foto')
    }
    const buffer = await readImageUpload(req)
    return reply.send(await service.updateFoto(id, buffer))
  })

  app.delete('/:id/foto', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    if (req.user!.role !== 'admin' && req.user!.sub !== id) {
      throw new ForbiddenError('Você só pode alterar a sua própria foto')
    }
    await service.removeFoto(id)
    return reply.status(204).send()
  })

  // ── Rotas administrativas ──────────────────────────────────────
  app.get('/', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const filters = listCorretoresSchema.parse(req.query)
    return reply.send(await service.listCorretores(filters))
  })

  app.get('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    return reply.send(await service.getCorretorById(id))
  })

  app.post('/', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const body = createCorretorSchema.parse(req.body)
    return reply.status(201).send(await service.createCorretor(body))
  })

  app.patch('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const body = updateCorretorSchema.parse(req.body)
    return reply.send(await service.updateCorretor(id, body))
  })

  app.patch('/:id/status', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const { status } = statusCorretorSchema.parse(req.body)
    return reply.send(await service.setStatus(id, status))
  })

  app.patch('/:id/opt-in', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const { whatsapp_opt_in } = optInSchema.parse(req.body)
    await service.setOptIn(id, whatsapp_opt_in)
    return reply.send({ message: 'Preferência atualizada' })
  })

  // ── Admin reseta a senha do corretor (gera senha temporária) ────
  app.post('/:id/resetar-senha', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    return reply.send(await service.resetSenhaAdmin(id))
  })
}
