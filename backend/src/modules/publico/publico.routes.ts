/**
 * Rotas públicas (sem autenticação) — usadas para compartilhamento.
 *   GET /public/eventos/:id → dados públicos de um evento publicado e não-exclusivo
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getEventoPublico } from '@/modules/eventos/eventos.service'

export async function publicoRoutes(app: FastifyInstance) {
  app.get('/eventos/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid('ID inválido') }).parse(req.params)
    return reply.send(await getEventoPublico(id))
  })
}
