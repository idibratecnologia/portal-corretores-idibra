/**
 * Importação em massa (admin):
 *   GET  /import/modelo/imobiliarias  → baixa planilha modelo (.xlsx)
 *   GET  /import/modelo/corretores    → baixa planilha modelo (.xlsx)
 *   POST /import/imobiliarias?dryRun=&modo=  → importa (multipart: file)
 *   POST /import/corretores?dryRun=&modo=    → importa (multipart: file)
 *
 * dryRun=true (padrão) → só valida e retorna a pré-visualização (não grava).
 * modo=ignorar (padrão) | atualizar → o que fazer com registros já existentes.
 */
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import * as service from './import.service'
import { authenticate, requireAdmin } from '@/middlewares/auth.middleware'
import { BadRequestError } from '@/lib/errors'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const optsSchema = z.object({
  dryRun: z.enum(['true', 'false']).optional().transform((v) => v !== 'false'),
  modo:   z.enum(['ignorar', 'atualizar']).optional().default('ignorar'),
})

async function lerArquivo(req: FastifyRequest): Promise<Buffer> {
  const data = await req.file()
  if (!data) throw new BadRequestError('Nenhum arquivo enviado')
  return data.toBuffer()
}

export async function importRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireAdmin)

  // ── Modelos ────────────────────────────────────────────────────
  app.get('/modelo/imobiliarias', async (_req, reply) => {
    reply.header('Content-Type', XLSX_MIME)
    reply.header('Content-Disposition', 'attachment; filename="modelo-imobiliarias.xlsx"')
    return reply.send(service.modeloImobiliarias())
  })

  app.get('/modelo/corretores', async (_req, reply) => {
    reply.header('Content-Type', XLSX_MIME)
    reply.header('Content-Disposition', 'attachment; filename="modelo-corretores.xlsx"')
    return reply.send(service.modeloCorretores())
  })

  // ── Importação ─────────────────────────────────────────────────
  app.post('/imobiliarias', async (req, reply) => {
    const { dryRun, modo } = optsSchema.parse(req.query)
    const buffer = await lerArquivo(req)
    return reply.send(await service.importImobiliarias(buffer, { dryRun, modo }))
  })

  app.post('/corretores', async (req, reply) => {
    const { dryRun, modo } = optsSchema.parse(req.query)
    const buffer = await lerArquivo(req)
    return reply.send(await service.importCorretores(buffer, { dryRun, modo }))
  })
}
