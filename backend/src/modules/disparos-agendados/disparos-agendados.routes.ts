/**
 * Disparos agendados (admin/operador).
 *   GET    /disparos-agendados        lista (?status=pendente|enviado|erro|cancelado)
 *   POST   /disparos-agendados        agenda (JSON ou multipart com anexo)
 *   DELETE /disparos-agendados/:id    cancela (somente pendentes)
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { config } from '@/config'
import { BadRequestError } from '@/lib/errors'
import { audit } from '@/lib/audit'
import { authenticate, requireAdmin } from '@/middlewares/auth.middleware'
import * as service from './disparos-agendados.service'

export async function disparosAgendadosRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireAdmin)

  app.get('/', async (req, reply) => {
    const { status } = z.object({ status: z.string().optional() }).parse(req.query)
    return reply.send(await service.listarDisparosAgendados(status))
  })

  app.post('/', async (req, reply) => {
    let raw: { mensagem?: string; corretor_ids?: unknown; canais?: unknown; assunto?: string; agendado_para?: string } = {}
    let anexo: { base64: string; fileName: string; mimeType: string } | undefined

    if (req.isMultipart()) {
      for await (const part of req.parts({ limits: { fileSize: config.upload.maxSizeMB * 1024 * 1024 } })) {
        if (part.type === 'file') {
          const buf = await part.toBuffer()
          if ((part.file as { truncated?: boolean }).truncated) throw new BadRequestError(`Anexo muito grande. Máximo ${config.upload.maxSizeMB} MB.`)
          if (buf.length > 0) anexo = { base64: buf.toString('base64'), fileName: part.filename || 'anexo', mimeType: part.mimetype || 'application/octet-stream' }
        } else {
          const v = part.value as string
          if (part.fieldname === 'mensagem') raw.mensagem = v
          else if (part.fieldname === 'corretor_ids') raw.corretor_ids = JSON.parse(v)
          else if (part.fieldname === 'canais') raw.canais = JSON.parse(v)
          else if (part.fieldname === 'assunto') raw.assunto = v
          else if (part.fieldname === 'agendado_para') raw.agendado_para = v
        }
      }
    } else {
      raw = req.body as typeof raw
    }

    const parsed = z.object({
      mensagem:      z.string().trim().min(1, 'Mensagem obrigatória'),
      corretor_ids:  z.array(z.string().uuid()).min(1, 'Selecione ao menos um corretor'),
      canais:        z.object({ whatsapp: z.boolean(), email: z.boolean() }).default({ whatsapp: true, email: false }),
      assunto:       z.string().trim().optional(),
      agendado_para: z.coerce.date(),
    }).refine((v) => v.canais.whatsapp || v.canais.email, { message: 'Selecione ao menos um canal', path: ['canais'] })
      .parse(raw)

    const d = await service.criarDisparoAgendado({
      mensagem: parsed.mensagem, assunto: parsed.assunto,
      canalWhatsapp: parsed.canais.whatsapp, canalEmail: parsed.canais.email,
      corretorIds: parsed.corretor_ids, agendadoPara: parsed.agendado_para, anexo,
    })
    audit(req, 'criou', 'broadcast', d.id, `Disparo agendado · ${parsed.corretor_ids.length} corretor(es)`, parsed.mensagem.slice(0, 120))
    return reply.status(201).send(d)
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid('ID inválido') }).parse(req.params)
    await service.cancelarDisparoAgendado(id)
    audit(req, 'excluiu', 'broadcast', id, 'Agendamento de disparo cancelado')
    return reply.status(204).send()
  })
}
