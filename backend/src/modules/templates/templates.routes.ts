/**
 * Rotas da Central de Notificações (templates de mensagens) — admin.
 *
 *   GET   /templates        → lista todos os templates
 *   PATCH /templates/:tipo  → edita conteúdo / ativo / dias de antecedência
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as service from './templates.service'
import { authenticate, requireAdmin } from '@/middlewares/auth.middleware'
import { readImageUpload } from '@/lib/upload'
import { saveImage, deleteImage } from '@/lib/storage'

const tipoParam = z.object({ tipo: z.string().min(1) })

const updateSchema = z.object({
  conteudo:          z.string().min(1).optional(),
  ativo:             z.boolean().optional(),
  com_imagem:        z.boolean().optional(),
  imagem_url:        z.string().url().nullable().optional(),
  dias_antecedencia: z.number().int().min(1).max(60).nullable().optional(),
})

export async function templatesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireAdmin)

  app.get('/', async (_req, reply) => {
    return reply.send(await service.listTemplates())
  })

  app.patch('/:tipo', async (req, reply) => {
    const { tipo } = tipoParam.parse(req.params)
    const body = updateSchema.parse(req.body)
    return reply.send(await service.updateTemplate(tipo, body))
  })

  // Upload do banner próprio da comunicação (ex.: aniversário, campanha)
  app.post('/:tipo/imagem', async (req, reply) => {
    const { tipo } = tipoParam.parse(req.params)
    const atual = await service.getTemplate(tipo)
    const buffer = await readImageUpload(req, { maxSizeMB: 25 })
    const imagem_url = await saveImage('banners', buffer)
    if (atual.imagem_url) await deleteImage(atual.imagem_url)
    return reply.send(await service.updateTemplate(tipo, { imagem_url }))
  })
}
