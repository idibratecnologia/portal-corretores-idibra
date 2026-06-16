/**
 * Rotas de eventos.
 *
 *   GET   /eventos          → listar (corretor vê só publicados; admin vê todos)
 *   GET   /eventos/:id      → detalhe
 *   POST  /eventos          → criar (admin)
 *   PATCH /eventos/:id      → editar (admin)
 *   PATCH /eventos/:id/status → publicar/encerrar/cancelar (admin)
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as service from './eventos.service'
import { listEventosSchema, createEventoSchema, updateEventoSchema, statusEventoSchema } from './eventos.schema'
import { authenticate, requireAdmin, requireSuperAdmin } from '@/middlewares/auth.middleware'
import { readImageUpload } from '@/lib/upload'
import { audit } from '@/lib/audit'

const idParam = z.object({ id: z.string().uuid('ID inválido') })

export async function eventosRoutes(app: FastifyInstance) {
  // ── Listagem (qualquer usuário autenticado) ───────────────────
  // Corretor recebe só publicados; admin recebe todos com filtros.
  app.get('/', { preHandler: [authenticate] }, async (req, reply) => {
    const filters = listEventosSchema.parse(req.query)
    const isCorretor = req.user!.role !== 'admin'
    return reply.send(await service.listEventos(filters, {
      onlyPublished: isCorretor,
      corretorId: isCorretor ? req.user!.sub : undefined,
    }))
  })

  app.get('/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const corretorId = req.user!.role === 'corretor' ? req.user!.sub : undefined
    return reply.send(await service.getEventoById(id, corretorId))
  })

  // ── Mutações (admin) ──────────────────────────────────────────
  app.post('/', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const body = createEventoSchema.parse(req.body)
    const ev = await service.createEvento(body)
    audit(req, 'criou', 'evento', ev.id, ev.titulo)
    return reply.status(201).send(ev)
  })

  app.patch('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const body = updateEventoSchema.parse(req.body)
    const ev = await service.updateEvento(id, body)
    audit(req, 'editou', 'evento', id, ev.titulo)
    return reply.send(ev)
  })

  app.patch('/:id/status', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const { status } = statusEventoSchema.parse(req.body)
    const ev = await service.setStatus(id, status)
    audit(req, 'status', 'evento', id, ev.titulo, `status: ${status}`)
    return reply.send(ev)
  })

  // ── Banner (admin) ────────────────────────────────────────────
  app.post('/:id/banner', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const buffer = await readImageUpload(req)
    return reply.send(await service.updateBanner(id, buffer))
  })

  app.delete('/:id/banner', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    await service.removeBanner(id)
    return reply.status(204).send()
  })

  // ── Excluir evento (somente super-admin) ───────────────────────
  app.delete('/:id', { preHandler: [authenticate, requireSuperAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const { titulo } = await service.deleteEvento(id)
    audit(req, 'excluiu', 'evento', id, titulo)
    return reply.status(204).send()
  })
}
