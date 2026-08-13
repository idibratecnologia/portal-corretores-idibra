/**
 * Rotas de integração WhatsApp (Evolution) — restritas a admin.
 *
 *   GET  /whatsapp/status       → estado da conexão
 *   POST /whatsapp/conectar     → inicia conexão e retorna o QR Code
 *   POST /whatsapp/desconectar  → faz logout da instância
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { config } from '@/config'
import * as evolution from '@/lib/evolution'
import { whatsappQueueSize } from '@/lib/whatsapp-queue'
import { enviarTesteEvento, enviarTesteTexto, broadcast } from './whatsapp.service'
import { authenticate, requireAdmin } from '@/middlewares/auth.middleware'
import { audit } from '@/lib/audit'
import { BadRequestError } from '@/lib/errors'

const testeSchema = z.object({
  numero:     z.string().min(8, 'Número inválido'),
  evento_id:  z.string().uuid().optional(),
  texto:      z.string().optional(),
  imagem_url: z.string().url().optional(),
})

export async function whatsappRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireAdmin)

  // Estado atual da conexão
  app.get('/status', async (_req, reply) => {
    if (!config.evolution.enabled) {
      return reply.send({ configurado: false, state: 'desconhecido', conectado: false, fila: 0 })
    }
    const state = await evolution.getConnectionState()
    return reply.send({ configurado: true, state, conectado: state === 'open', fila: whatsappQueueSize() })
  })

  // Inicia a sincronização e retorna o QR Code
  app.post('/conectar', async (_req, reply) => {
    if (!config.evolution.enabled) {
      return reply.status(400).send({
        code: 'EVOLUTION_NAO_CONFIGURADO',
        message: 'O servidor Evolution não está configurado (defina EVOLUTION_URL e EVOLUTION_API_KEY no .env).',
      })
    }
    const { qrcode, state } = await evolution.connect()
    return reply.send({ qrcode, state, conectado: state === 'open' })
  })

  // Desconecta
  app.post('/desconectar', async (_req, reply) => {
    if (!config.evolution.enabled) {
      return reply.status(400).send({ code: 'EVOLUTION_NAO_CONFIGURADO', message: 'Evolution não configurado.' })
    }
    await evolution.logout()
    return reply.send({ message: 'WhatsApp desconectado' })
  })

  // Envio de teste (evento rico com imagem, ou texto livre) para um número
  app.post('/testar', async (req, reply) => {
    const { numero, evento_id, texto, imagem_url } = testeSchema.parse(req.body)
    if (evento_id) {
      const r = await enviarTesteEvento(numero, evento_id, imagem_url)
      return reply.send({ message: 'Notificação de evento enviada', comImagem: r.comImagem })
    }
    await enviarTesteTexto(numero, texto || 'Mensagem de teste do Portal IDIBRA ✅')
    return reply.send({ message: 'Mensagem de teste enviada' })
  })

  // Disparo em massa (respeita opt-in e a fila)
  app.post('/broadcast', async (req, reply) => {
    // Aceita JSON (sem anexo) ou multipart/form-data (com anexo opcional)
    let raw: { mensagem?: string; corretor_ids?: unknown; canais?: unknown; assunto?: string; evento_id?: string } = {}
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
          else if (part.fieldname === 'evento_id') raw.evento_id = v
        }
      }
    } else {
      raw = req.body as typeof raw
    }

    const { mensagem, corretor_ids, canais, assunto, evento_id } = z.object({
      mensagem:     z.string().trim().min(1, 'Mensagem obrigatória'),
      corretor_ids: z.array(z.string().uuid()).min(1, 'Selecione ao menos um corretor'),
      canais:       z.object({ whatsapp: z.boolean(), email: z.boolean() }).default({ whatsapp: true, email: false }),
      assunto:      z.string().trim().optional(),
      evento_id:    z.string().uuid().optional(),
    }).refine((v) => v.canais.whatsapp || v.canais.email, { message: 'Selecione ao menos um canal', path: ['canais'] })
      .parse(raw)

    const r = await broadcast(mensagem, corretor_ids, { whatsapp: canais.whatsapp, email: canais.email, assunto, anexo, eventoId: evento_id })
    audit(req, 'enviou', 'broadcast', null, `WhatsApp ${r.whatsapp} · E-mail ${r.emails}${anexo ? ' · com anexo' : ''}`, mensagem.slice(0, 120))
    return reply.send(r)
  })
}
