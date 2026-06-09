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
import { enviarTesteEvento, enviarTesteTexto } from './whatsapp.service'
import { authenticate, requireAdmin } from '@/middlewares/auth.middleware'

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
}
