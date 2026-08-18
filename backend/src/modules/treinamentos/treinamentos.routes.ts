/**
 * Treinamentos (trilha/curso) + Aulas (vídeos).
 *
 *  Admin (authenticate + requireAdmin; excluir treinamento = requireSuperAdmin):
 *   GET    /treinamentos                          lista
 *   POST   /treinamentos                          cria treinamento
 *   GET    /treinamentos/:id                       detalhe (admin = completo; corretor = visão própria)
 *   PATCH  /treinamentos/:id                       edita (inclui ativo)
 *   DELETE /treinamentos/:id                       exclui (super)
 *   GET    /treinamentos/:id/relatorio             relatório de progresso
 *
 *   POST   /treinamentos/:id/aulas                 cria aula
 *   PATCH  /treinamentos/:id/aulas/ordenar         reordena aulas
 *   PATCH  /treinamentos/aulas/:aulaId             edita aula
 *   DELETE /treinamentos/aulas/:aulaId             exclui aula
 *   POST   /treinamentos/aulas/:aulaId/video       upload do vídeo (stream → fila)
 *
 *   POST   /treinamentos/:id/documentos            upload de documento de apoio
 *   DELETE /treinamentos/documentos/:docId         remove documento
 *
 *  Vínculo com evento:
 *   GET    /eventos/:eventoId/treinamentos         lista (admin = vínculos; corretor = visão própria)
 *   POST   /eventos/:eventoId/treinamentos         vincula treinamento
 *   PATCH  /eventos/:eventoId/treinamentos/ordenar reordena
 *   DELETE /treinamentos/vinculos/:vinculoId       desvincula
 *
 *  Corretor:
 *   GET    /meus-treinamentos                       lista do corretor
 *   POST   /treinamentos/aulas/:aulaId/progresso    salva progresso
 *
 *  Mídia protegida (header OU ?token= p/ <video>/<a>):
 *   GET    /treinamentos/aulas/:aulaId/video        streaming com Range
 *   GET    /treinamentos/documentos/:docId/download
 */
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { extname } from 'path'
import { z } from 'zod'
import * as service from './treinamentos.service'
import {
  createTreinamentoSchema, updateTreinamentoSchema, listTreinamentosSchema,
  createAulaSchema, updateAulaSchema, ordenarSchema, progressoSchema,
} from './treinamentos.schema'
import { authenticate, requireAdmin, requireSuperAdmin, requireCorretor } from '@/middlewares/auth.middleware'
import { readImageUpload } from '@/lib/upload'
import { verifyToken } from '@/lib/jwt'
import type { JWTPayload } from '@/lib/jwt'
import { BadRequestError, UnauthorizedError } from '@/lib/errors'
import { MATERIAL_EXTENSOES } from '@/lib/storage'
import { ensureInscrito } from '@/modules/materiais/materiais.service'
import { config } from '@/config'

const idParam = z.object({ id: z.string().uuid('ID inválido') })
const aulaParam = z.object({ aulaId: z.string().uuid('ID inválido') })
const VIDEO_EXT = ['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi', '.wmv', '.flv', '.3gp', '.mpeg', '.mpg']

function userFromRequest(req: FastifyRequest): JWTPayload | null {
  const header = req.headers.authorization
  let token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  const q = req.query as Record<string, unknown> | undefined
  if (!token && typeof q?.token === 'string') token = q.token
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

export async function treinamentosRoutes(app: FastifyInstance) {
  // ─── Treinamento: CRUD ─────────────────────────────────────────
  app.get('/treinamentos', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    return reply.send(await service.listTreinamentos(listTreinamentosSchema.parse(req.query)))
  })

  app.post('/treinamentos', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    return reply.status(201).send(await service.createTreinamento(createTreinamentoSchema.parse(req.body)))
  })

  app.get('/treinamentos/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    if (req.user!.role === 'admin') return reply.send(await service.getTreinamento(id))
    return reply.send(await service.getTreinamentoCorretor(id, req.user!.sub))
  })

  app.patch('/treinamentos/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    return reply.send(await service.updateTreinamento(id, updateTreinamentoSchema.parse(req.body)))
  })

  app.delete('/treinamentos/:id', { preHandler: [authenticate, requireSuperAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    await service.deleteTreinamento(id)
    return reply.status(204).send()
  })

  // Capa do curso (imagem própria)
  app.post('/treinamentos/:id/capa', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const buffer = await readImageUpload(req, { maxSizeMB: 25 })
    return reply.send(await service.setCapa(id, buffer))
  })

  app.delete('/treinamentos/:id/capa', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    return reply.send(await service.removerCapa(id))
  })

  app.get('/treinamentos/:id/relatorio', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    return reply.send(await service.relatorioTreinamento(id))
  })

  // ─── Aulas ─────────────────────────────────────────────────────
  app.post('/treinamentos/:id/aulas', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    return reply.status(201).send(await service.createAula(id, createAulaSchema.parse(req.body)))
  })

  app.patch('/treinamentos/:id/aulas/ordenar', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const { ordem } = ordenarSchema.parse(req.body)
    await service.reordenarAulas(id, ordem)
    return reply.status(204).send()
  })

  app.patch('/treinamentos/aulas/:aulaId', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { aulaId } = aulaParam.parse(req.params)
    return reply.send(await service.updateAula(aulaId, updateAulaSchema.parse(req.body)))
  })

  app.delete('/treinamentos/aulas/:aulaId', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { aulaId } = aulaParam.parse(req.params)
    await service.deleteAula(aulaId)
    return reply.status(204).send()
  })

  app.post('/treinamentos/aulas/:aulaId/video', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { aulaId } = aulaParam.parse(req.params)
    if (!req.isMultipart()) throw new BadRequestError('Envie o vídeo como multipart/form-data')
    const data = await req.file({ limits: { fileSize: config.storage.videoMaxSizeMB * 1024 * 1024 } })
    if (!data) throw new BadRequestError('Vídeo obrigatório')
    const ext = extname(data.filename || '').toLowerCase()
    if (!VIDEO_EXT.includes(ext)) throw new BadRequestError(`Formato de vídeo não suportado (${ext || 'sem extensão'}).`)
    const result = await service.receberVideoAula(aulaId, data.file, data.filename)
    return reply.status(202).send(result)
  })

  // ─── Documentos de apoio (nível do treinamento) ────────────────
  app.post('/treinamentos/:id/documentos', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    if (!req.isMultipart()) throw new BadRequestError('Envie o documento como multipart/form-data')
    const data = await req.file()
    if (!data) throw new BadRequestError('Documento obrigatório')
    const ext = extname(data.filename || '').toLowerCase()
    if (!MATERIAL_EXTENSOES.includes(ext)) throw new BadRequestError(`Tipo de arquivo não permitido (${ext || 'sem extensão'}).`)
    const { titulo } = z.object({ titulo: z.string().trim().min(1).optional() }).parse(req.query)
    const doc = await service.addDocumento(id, data.file, data.filename, titulo)
    if ((data.file as { truncated?: boolean }).truncated) {
      await service.removerDocumento(doc.id)
      throw new BadRequestError(`Arquivo muito grande. Máximo ${config.upload.maxSizeMB} MB.`)
    }
    return reply.status(201).send({ id: doc.id, titulo: doc.titulo })
  })

  app.delete('/treinamentos/documentos/:docId', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { docId } = z.object({ docId: z.string().uuid('ID inválido') }).parse(req.params)
    await service.removerDocumento(docId)
    return reply.status(204).send()
  })

  // ─── Vínculo treinamento ↔ evento ──────────────────────────────
  app.get('/eventos/:eventoId/treinamentos', { preHandler: [authenticate] }, async (req, reply) => {
    const { eventoId } = z.object({ eventoId: z.string().uuid('ID inválido') }).parse(req.params)
    if (req.user!.role === 'admin') return reply.send(await service.listTreinamentosDoEvento(eventoId))
    await ensureInscrito(eventoId, req.user!.sub)
    return reply.send(await service.listTreinamentosEventoCorretor(eventoId, req.user!.sub))
  })

  app.post('/eventos/:eventoId/treinamentos', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { eventoId } = z.object({ eventoId: z.string().uuid('ID inválido') }).parse(req.params)
    const body = z.object({ treinamento_id: z.string().uuid('treinamento_id inválido'), obrigatorio: z.boolean().optional() }).parse(req.body)
    return reply.status(201).send(await service.vincularEvento(body.treinamento_id, eventoId, body.obrigatorio))
  })

  app.patch('/eventos/:eventoId/treinamentos/ordenar', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { eventoId } = z.object({ eventoId: z.string().uuid('ID inválido') }).parse(req.params)
    const { ordem } = ordenarSchema.parse(req.body)
    await service.ordenarEvento(eventoId, ordem)
    return reply.status(204).send()
  })

  app.delete('/treinamentos/vinculos/:vinculoId', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { vinculoId } = z.object({ vinculoId: z.string().uuid('ID inválido') }).parse(req.params)
    await service.desvincularEvento(vinculoId)
    return reply.status(204).send()
  })

  // ─── Corretor ──────────────────────────────────────────────────
  app.get('/meus-treinamentos', { preHandler: [authenticate, requireCorretor] }, async (req, reply) => {
    return reply.send(await service.meusTreinamentos(req.user!.sub))
  })

  app.post('/treinamentos/aulas/:aulaId/progresso', { preHandler: [authenticate, requireCorretor] }, async (req, reply) => {
    const { aulaId } = aulaParam.parse(req.params)
    const { segundos } = progressoSchema.parse(req.body)
    return reply.send(await service.salvarProgressoAula(aulaId, req.user!.sub, segundos))
  })

  // ─── Mídia protegida ───────────────────────────────────────────
  app.get('/treinamentos/aulas/:aulaId/video', {
    config: { rateLimit: { max: 600, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const { aulaId } = aulaParam.parse(req.params)
    const user = userFromRequest(req)
    if (!user) throw new UnauthorizedError('Não autenticado')
    const isAdmin = user.role === 'admin'
    const abs = await service.resolverVideoAula(aulaId, isAdmin ? null : user.sub, isAdmin)

    const { size } = await stat(abs)
    reply.header('Accept-Ranges', 'bytes')
    reply.header('Content-Type', 'video/mp4')
    reply.header('Cache-Control', 'private, max-age=0')

    const range = req.headers.range
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range)
      let start = m && m[1] ? parseInt(m[1], 10) : 0
      let end = m && m[2] ? parseInt(m[2], 10) : size - 1
      if (Number.isNaN(start)) start = 0
      if (Number.isNaN(end) || end >= size) end = size - 1
      if (start > end || start >= size) {
        reply.header('Content-Range', `bytes */${size}`)
        return reply.status(416).send()
      }
      reply.status(206)
      reply.header('Content-Range', `bytes ${start}-${end}/${size}`)
      reply.header('Content-Length', end - start + 1)
      return reply.send(createReadStream(abs, { start, end }))
    }

    reply.header('Content-Length', size)
    return reply.send(createReadStream(abs))
  })

  app.get('/treinamentos/documentos/:docId/download', async (req, reply) => {
    const { docId } = z.object({ docId: z.string().uuid('ID inválido') }).parse(req.params)
    const user = userFromRequest(req)
    if (!user) throw new UnauthorizedError('Não autenticado')
    const isAdmin = user.role === 'admin'
    const { abs, filename } = await service.resolverDocumento(docId, isAdmin ? null : user.sub, isAdmin)
    reply.header('Content-Type', 'application/octet-stream')
    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    return reply.send(createReadStream(abs))
  })

  // Certificado de conclusão (corretor) — gera o PDF sob demanda (token no header ou ?token=)
  app.get('/treinamentos/:id/certificado', async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const user = userFromRequest(req)
    if (!user) throw new UnauthorizedError('Não autenticado')
    if (user.role === 'admin') throw new BadRequestError('O certificado é emitido para o corretor que concluiu o curso.')
    const { pdf, fileName } = await service.baixarCertificadoTreinamento(id, user.sub)
    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
    return reply.send(pdf)
  })
}
