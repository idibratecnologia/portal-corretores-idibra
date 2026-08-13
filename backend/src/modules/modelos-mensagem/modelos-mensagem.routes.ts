/**
 * Modelos de mensagem salvos (reuso no Disparo em massa). Admin/operador.
 *   GET    /modelos-mensagem        lista
 *   POST   /modelos-mensagem        cria { nome, assunto?, conteudo }
 *   PATCH  /modelos-mensagem/:id    edita
 *   DELETE /modelos-mensagem/:id    remove
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { NotFoundError } from '@/lib/errors'
import { authenticate, requireAdmin } from '@/middlewares/auth.middleware'
import { readImageUpload } from '@/lib/upload'
import { saveImage, deleteImage } from '@/lib/storage'

const idParam = z.object({ id: z.string().uuid('ID inválido') })
const bodySchema = z.object({
  nome:     z.string().trim().min(1, 'Nome obrigatório').max(80),
  assunto:  z.string().trim().max(150).optional(),
  conteudo: z.string().trim().min(1, 'Conteúdo obrigatório'),
})

export async function modelosMensagemRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireAdmin)

  app.get('/', async (_req, reply) => {
    return reply.send(await prisma.modeloMensagem.findMany({ orderBy: { nome: 'asc' } }))
  })

  app.post('/', async (req, reply) => {
    const { nome, assunto, conteudo } = bodySchema.parse(req.body)
    const m = await prisma.modeloMensagem.create({ data: { nome, assunto: assunto || null, conteudo } })
    return reply.status(201).send(m)
  })

  app.patch('/:id', async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const { nome, assunto, conteudo } = bodySchema.partial().parse(req.body)
    const exists = await prisma.modeloMensagem.findUnique({ where: { id }, select: { id: true } })
    if (!exists) throw new NotFoundError('Modelo não encontrado')
    const m = await prisma.modeloMensagem.update({ where: { id }, data: { nome, assunto: assunto === undefined ? undefined : (assunto || null), conteudo } })
    return reply.send(m)
  })

  // Banner do modelo de comunicação (enviado no disparo)
  app.post('/:id/imagem', async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const atual = await prisma.modeloMensagem.findUnique({ where: { id }, select: { imagem_url: true } })
    if (!atual) throw new NotFoundError('Modelo não encontrado')
    const buffer = await readImageUpload(req, { maxSizeMB: 25 })
    const imagem_url = await saveImage('banners', buffer)
    if (atual.imagem_url) await deleteImage(atual.imagem_url)
    return reply.send(await prisma.modeloMensagem.update({ where: { id }, data: { imagem_url } }))
  })

  app.delete('/:id/imagem', async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const atual = await prisma.modeloMensagem.findUnique({ where: { id }, select: { imagem_url: true } })
    if (!atual) throw new NotFoundError('Modelo não encontrado')
    if (atual.imagem_url) await deleteImage(atual.imagem_url)
    return reply.send(await prisma.modeloMensagem.update({ where: { id }, data: { imagem_url: null } }))
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const atual = await prisma.modeloMensagem.findUnique({ where: { id }, select: { imagem_url: true } })
    if (atual?.imagem_url) await deleteImage(atual.imagem_url)
    await prisma.modeloMensagem.deleteMany({ where: { id } })
    return reply.status(204).send()
  })
}
