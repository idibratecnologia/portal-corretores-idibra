/**
 * Modelos visuais (editor estilo Canva).
 *
 *  Admin/Operador (authenticate + requireAdmin; excluir = requireSuperAdmin):
 *   GET    /modelos                         lista (filtros: tipo, ativo, search)
 *   POST   /modelos                         cria
 *   GET    /modelos/:id                     detalhe (com canvas_json)
 *   PATCH  /modelos/:id                     edita (inclui canvas_json / ativo)
 *   POST   /modelos/:id/duplicar            duplica
 *   DELETE /modelos/:id                     exclui (super)
 *
 *  Vínculo com evento:
 *   GET    /eventos/:eventoId/modelos       lista vínculos
 *   POST   /eventos/:eventoId/modelos       vincula { modelo_id } (tipo vem do modelo)
 *   DELETE /eventos/:eventoId/modelos/:tipo desvincula por tipo
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as service from './modelos.service'
import { createModeloSchema, updateModeloSchema, listModelosSchema, vincularModeloSchema, tipoModelo } from './modelos.schema'
import { authenticate, requireAdmin, requireSuperAdmin } from '@/middlewares/auth.middleware'

const idParam = z.object({ id: z.string().uuid('ID inválido') })

export async function modelosRoutes(app: FastifyInstance) {
  app.get('/modelos', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    return reply.send(await service.listModelos(listModelosSchema.parse(req.query)))
  })

  app.post('/modelos', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    return reply.status(201).send(await service.createModelo(createModeloSchema.parse(req.body)))
  })

  app.get('/modelos/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    return reply.send(await service.getModelo(id))
  })

  app.patch('/modelos/:id', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    return reply.send(await service.updateModelo(id, updateModeloSchema.parse(req.body)))
  })

  app.post('/modelos/:id/duplicar', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    return reply.status(201).send(await service.duplicarModelo(id))
  })

  app.delete('/modelos/:id', { preHandler: [authenticate, requireSuperAdmin] }, async (req, reply) => {
    const { id } = idParam.parse(req.params)
    await service.deleteModelo(id)
    return reply.status(204).send()
  })

  // ─── Vínculo com evento ────────────────────────────────────────
  app.get('/eventos/:eventoId/modelos', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { eventoId } = z.object({ eventoId: z.string().uuid('ID inválido') }).parse(req.params)
    return reply.send(await service.listModelosDoEvento(eventoId))
  })

  app.post('/eventos/:eventoId/modelos', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { eventoId } = z.object({ eventoId: z.string().uuid('ID inválido') }).parse(req.params)
    const { modelo_id } = vincularModeloSchema.parse(req.body)
    return reply.status(201).send(await service.vincularModelo(eventoId, modelo_id))
  })

  app.delete('/eventos/:eventoId/modelos/:tipo', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { eventoId, tipo } = z.object({ eventoId: z.string().uuid('ID inválido'), tipo: tipoModelo }).parse(req.params)
    await service.desvincularModeloPorTipo(eventoId, tipo)
    return reply.status(204).send()
  })

  // ─── Dados reais das variáveis (preview/geração) ───────────────
  app.get('/eventos/:eventoId/inscricoes/:inscricaoId/dados', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { inscricaoId } = z.object({ eventoId: z.string().uuid('ID inválido'), inscricaoId: z.string().uuid('ID inválido') }).parse(req.params)
    const { tipo } = z.object({ tipo: tipoModelo }).parse(req.query)
    return reply.send(await service.construirDadosInscricao(inscricaoId, tipo))
  })

  app.get('/eventos/:eventoId/inscricoes-dados', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { eventoId } = z.object({ eventoId: z.string().uuid('ID inválido') }).parse(req.params)
    const { tipo, status } = z.object({ tipo: tipoModelo, status: z.enum(['inscrito', 'presente', 'ausente']).optional() }).parse(req.query)
    return reply.send(await service.listarInscritosParaGeracao(eventoId, tipo, status))
  })

  // ─── Registro de geração (lote/individual) ─────────────────────
  app.post('/eventos/:eventoId/modelos/registrar-geracao', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { eventoId } = z.object({ eventoId: z.string().uuid('ID inválido') }).parse(req.params)
    const body = z.object({
      modelo_id: z.string().uuid().optional(),
      tipo: tipoModelo,
      formato: z.enum(['png', 'jpg', 'pdf', 'zip']),
      itens: z.array(z.object({ inscricao_id: z.string().uuid().optional(), corretor_id: z.string().uuid().optional() })).default([]),
    }).parse(req.body)
    const r = await service.registrarGeracao({ eventoId, modeloId: body.modelo_id, tipo: body.tipo, formato: body.formato, itens: body.itens, geradoPor: req.user!.sub })
    return reply.status(201).send(r)
  })

  app.get('/eventos/:eventoId/modelos/geracoes', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const { eventoId } = z.object({ eventoId: z.string().uuid('ID inválido') }).parse(req.params)
    return reply.send(await service.contarGeracoes(eventoId))
  })

  // ─── Validação pública do QR (certificado) ─────────────────────
  app.get('/public/validar/:codigo', async (req, reply) => {
    const { codigo } = z.object({ codigo: z.string().min(8) }).parse(req.params)
    return reply.send(await service.getValidacao(codigo))
  })
}
