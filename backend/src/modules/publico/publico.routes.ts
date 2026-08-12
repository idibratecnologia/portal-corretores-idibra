/**
 * Rotas públicas (sem autenticação) — usadas para compartilhamento e LGPD.
 *   GET  /public/eventos/:id        → dados públicos de um evento publicado e não-exclusivo
 *   GET  /public/email/preferencia  → estado do opt-in de e-mail (via token)
 *   POST /public/email/preferencia  → atualiza o opt-in (descadastrar/reinscrever)
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getEventoPublico, getEventoPorLink } from '@/modules/eventos/eventos.service'
import { tokenDescadastroValido } from '@/lib/descadastro'
import { BadRequestError, NotFoundError } from '@/lib/errors'

export async function publicoRoutes(app: FastifyInstance) {
  app.get('/eventos/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid('ID inválido') }).parse(req.params)
    return reply.send(await getEventoPublico(id))
  })

  // Landing do link de convite de evento exclusivo (info mínima, via token)
  app.get('/evento-exclusivo/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid('Link inválido') }).parse(req.params)
    const { t } = z.object({ t: z.string().min(10) }).parse(req.query)
    return reply.send(await getEventoPorLink(id, t))
  })

  // ── Preferência de e-mail (LGPD) ───────────────────────────────
  app.get('/email/preferencia', async (req, reply) => {
    const { c, t } = z.object({ c: z.string().uuid('Link inválido'), t: z.string().min(10) }).parse(req.query)
    if (!tokenDescadastroValido(c, t)) throw new BadRequestError('Link inválido ou expirado')
    const cor = await prisma.corretor.findUnique({ where: { id: c }, select: { nome: true, email: true, email_opt_in: true } })
    if (!cor) throw new NotFoundError('Cadastro não encontrado')
    return reply.send({ nome: cor.nome, email: cor.email, email_opt_in: cor.email_opt_in })
  })

  app.post('/email/preferencia', async (req, reply) => {
    const { corretor_id, token, opt_in } = z.object({
      corretor_id: z.string().uuid('Link inválido'),
      token:       z.string().min(10),
      opt_in:      z.boolean(),
    }).parse(req.body)
    if (!tokenDescadastroValido(corretor_id, token)) throw new BadRequestError('Link inválido ou expirado')
    const cor = await prisma.corretor.update({
      where: { id: corretor_id }, data: { email_opt_in: opt_in }, select: { nome: true, email_opt_in: true },
    })
    return reply.send({ ok: true, nome: cor.nome, email_opt_in: cor.email_opt_in })
  })
}
