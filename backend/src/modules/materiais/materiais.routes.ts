/**
 * Materiais de evento.
 *
 *   GET    /eventos/:eventoId/materiais  → lista (admin ou corretor inscrito)
 *   POST   /eventos/:eventoId/materiais  → adiciona link (JSON) ou arquivo (multipart) — admin
 *   DELETE /materiais/:id                → remove (admin)
 */
import type { FastifyInstance } from 'fastify'
import { extname } from 'path'
import { z } from 'zod'
import * as service from './materiais.service'
import { authenticate, requireAdmin } from '@/middlewares/auth.middleware'
import { saveRawFile, MATERIAL_EXTENSOES } from '@/lib/storage'
import { BadRequestError } from '@/lib/errors'

const eventoParam = z.object({ eventoId: z.string().uuid('ID inválido') })
const idParam = z.object({ id: z.string().uuid('ID inválido') })

export async function materiaisRoutes(app: FastifyInstance) {
  // ── Listar (admin OU corretor inscrito) ────────────────────────
  app.get('/eventos/:eventoId/materiais', { preHandler: [authenticate] }, async (req, reply) => {
    const { eventoId } = eventoParam.parse(req.params)
    if (req.user!.role !== 'admin') {
      await service.ensureInscrito(eventoId, req.user!.sub)
    }
    return reply.send(await service.listMateriais(eventoId))
  })

  // ── Adicionar (admin) — link (JSON) ou arquivo (multipart) ─────
  app.post('/eventos/:eventoId/materiais', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { eventoId } = eventoParam.parse(req.params)

    if (req.isMultipart()) {
      const data = await req.file()
      if (!data) throw new BadRequestError('Arquivo obrigatório')
      const ext = extname(data.filename || '').toLowerCase()
      if (!MATERIAL_EXTENSOES.includes(ext)) {
        throw new BadRequestError(`Tipo de arquivo não permitido (${ext || 'sem extensão'}).`)
      }
      const { titulo } = z.object({ titulo: z.string().trim().min(1).optional() }).parse(req.query)
      const buffer = await data.toBuffer()
      const url = await saveRawFile(buffer, data.filename)
      return reply.status(201).send(await service.addArquivo(eventoId, titulo || data.filename, url))
    }

    const { titulo, url } = z.object({
      titulo: z.string().trim().min(1, 'Título obrigatório'),
      url:    z.string().url('Link inválido'),
    }).parse(req.body)
    return reply.status(201).send(await service.addLink(eventoId, titulo, url))
  })

  // ── Remover (admin) ────────────────────────────────────────────
  app.delete('/materiais/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    await service.deleteMaterial(id)
    return reply.status(204).send()
  })
}
