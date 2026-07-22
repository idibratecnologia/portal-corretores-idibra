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
import { authenticate, requireAdmin, requireSuperAdmin, requireCorretor } from '@/middlewares/auth.middleware'
import { readImageUpload } from '@/lib/upload'
import { ForbiddenError } from '@/lib/errors'
import { audit } from '@/lib/audit'

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

  // Lista enxuta de TODOS os corretores ativos (para seletores, sem paginação)
  app.get('/opcoes', { preHandler: [authenticate, requireAdmin] }, async (_req, reply) => {
    return reply.send(await service.listCorretoresOpcoes())
  })

  app.get('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    return reply.send(await service.getCorretorById(id))
  })

  app.post('/', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const body = createCorretorSchema.parse(req.body)
    const c = await service.createCorretor(body)
    audit(req, 'criou', 'corretor', c.id, c.nome)
    return reply.status(201).send(c)
  })

  app.patch('/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const body = updateCorretorSchema.parse(req.body)
    const c = await service.updateCorretor(id, body)
    audit(req, 'editou', 'corretor', id, c.nome)
    return reply.send(c)
  })

  app.patch('/:id/status', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const { status } = statusCorretorSchema.parse(req.body)
    const c = await service.setStatus(id, status)
    audit(req, status === 'ativo' ? 'aprovou' : 'status', 'corretor', id, c.nome, `status: ${status}`)
    return reply.send(c)
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

  // ── Excluir corretor (somente super-admin) ─────────────────────
  app.delete('/:id', { preHandler: [authenticate, requireSuperAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const { nome } = await service.deleteCorretor(id)
    audit(req, 'excluiu', 'corretor', id, nome)
    return reply.status(204).send()
  })
}
