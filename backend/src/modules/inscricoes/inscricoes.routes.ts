/**
 * Rotas de inscrições.
 *
 *   GET   /inscricoes?evento_id=…   → inscritos de um evento (admin)
 *   GET   /inscricoes?corretor_id=… → inscrições de um corretor (admin)
 *   GET   /inscricoes/me            → inscrições do corretor logado (corretor)
 *   POST  /inscricoes               → inscrever-se em um evento (corretor)
 *   PATCH /inscricoes/:id/cancelar  → cancelar inscrição (corretor dono ou admin)
 *   PATCH /inscricoes/:id/status    → marcar presente/ausente (admin)
 *   POST  /inscricoes/checkin       → check-in por QR token (admin)
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as service from './inscricoes.service'
import { listInscricoesSchema, createInscricaoSchema, checkinSchema } from './inscricoes.schema'
import { authenticate, requireAdmin, requireCorretor } from '@/middlewares/auth.middleware'
import { BadRequestError } from '@/lib/errors'
import { audit } from '@/lib/audit'

const idParam = z.object({ id: z.string().uuid('ID inválido') })
const statusManualSchema = z.object({ status: z.enum(['presente', 'ausente', 'cancelado']) })

export async function inscricoesRoutes(app: FastifyInstance) {
  // ── Corretor logado: suas inscrições ───────────────────────────
  app.get('/me', { preHandler: [authenticate, requireCorretor] }, async (req, reply) => {
    return reply.send(await service.listByCorretor(req.user!.sub))
  })

  // ── Inscrever-se (corretor) ────────────────────────────────────
  app.post('/', { preHandler: [authenticate, requireCorretor] }, async (req, reply) => {
    const { evento_id } = createInscricaoSchema.parse(req.body)
    return reply.status(201).send(await service.createInscricao(req.user!.sub, evento_id))
  })

  // ── Cancelar (corretor dono ou admin) ──────────────────────────
  app.patch('/:id/cancelar', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    await service.cancelarInscricao(id, req.user!.sub, req.user!.role === 'admin')
    return reply.send({ message: 'Inscrição cancelada' })
  })

  // ── Listagem por evento/corretor (admin) ───────────────────────
  app.get('/', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { evento_id, corretor_id } = listInscricoesSchema.parse(req.query)
    if (evento_id)   return reply.send(await service.listByEvento(evento_id))
    if (corretor_id) return reply.send(await service.listByCorretor(corretor_id))
    throw new BadRequestError('Informe evento_id ou corretor_id')
  })

  // ── Exportar lista de presença em CSV (admin) ──────────────────
  app.get('/export', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { evento_id } = z.object({ evento_id: z.string().uuid('evento_id inválido') }).parse(req.query)
    const { csv, titulo } = await service.exportInscricoesCsv(evento_id)
    const slug = titulo.normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'evento'
    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="presenca-${slug}.csv"`)
    return reply.send(csv)
  })

  // ── Check-in por QR token (admin) ──────────────────────────────
  app.post('/checkin', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { qr_token } = checkinSchema.parse(req.body)
    const result = await service.realizarCheckin(qr_token, req.user!.sub)
    return reply.send(result)
  })

  // ── Status manual presente/ausente (admin) ─────────────────────
  app.patch('/:id/status', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const { status } = statusManualSchema.parse(req.body)
    return reply.send(await service.setStatusManual(id, status, req.user!.sub))
  })

  // ── Reenviar QR de check-in no WhatsApp (admin) ────────────────
  app.post('/:id/reenviar-qr', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    await service.reenviarQrCheckin(id)
    return reply.send({ message: 'QR Code reenviado no WhatsApp' })
  })

  // ── Certificado: download da própria inscrição (corretor) ──────
  app.get('/:id/certificado', { preHandler: [authenticate, requireCorretor] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const { pdf, fileName } = await service.gerarCertificadoInscricao(id, req.user!.sub)
    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `attachment; filename="${fileName}"`)
    return reply.send(pdf)
  })

  // ── Certificado: envio em massa por WhatsApp (admin) ───────────
  app.post('/certificados/enviar', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { evento_id } = z.object({ evento_id: z.string().uuid('evento_id inválido') }).parse(req.body)
    const r = await service.enviarCertificadosEvento(evento_id)
    audit(req, 'enviou', 'certificado', evento_id, null, `${r.enfileirados} certificado(s) por WhatsApp`)
    return reply.send(r)
  })
}
