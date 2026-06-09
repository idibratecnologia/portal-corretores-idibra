/**
 * Notificações em tempo real via SSE (Server-Sent Events).
 *
 *   GET /notifications/stream?token=<accessToken>
 *
 * O EventSource do navegador não envia o header Authorization, então o token
 * vem na query. A conexão fica aberta; sempre que algo relevante muda, o
 * servidor empurra `event: refresh` e o frontend recarrega as notificações.
 */
import type { FastifyInstance } from 'fastify'
import { verifyToken } from '@/lib/jwt'
import { config } from '@/config'
import { appEvents, ADMIN_REFRESH } from '@/lib/events'

/** Decide o valor de Access-Control-Allow-Origin para a conexão SSE. */
function corsOrigin(origin?: string): string | null {
  if (!origin) return null
  if (config.isProd) return config.cors.origins.includes(origin) ? origin : null
  // Em dev, libera qualquer localhost (Vite pode usar 5173, 5174…)
  if (/^http:\/\/localhost:\d+$/.test(origin) || config.cors.origins.includes(origin)) return origin
  return null
}

export async function notificationsRoutes(app: FastifyInstance) {
  app.get('/stream', async (req, reply) => {
    // Auth via query token (admin apenas)
    const token = String((req.query as { token?: string }).token ?? '')
    let user
    try {
      user = verifyToken(token)
    } catch {
      return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Token inválido ou ausente' })
    }
    if (user.role !== 'admin') {
      return reply.code(403).send({ code: 'FORBIDDEN', message: 'Acesso restrito a administradores' })
    }

    // Assume o controle da resposta (Fastify não vai mais mexer nela)
    reply.hijack()

    const origin = corsOrigin(req.headers.origin)
    reply.raw.writeHead(200, {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      Connection:          'keep-alive',
      'X-Accel-Buffering':  'no', // desativa buffering do Nginx para o stream
      ...(origin ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' } : {}),
    })

    // Tempo de retry do EventSource + sinal inicial de "conectado"
    reply.raw.write('retry: 5000\n\n')
    reply.raw.write('event: ready\ndata: "ok"\n\n')

    const onRefresh = (motivo: string) => {
      reply.raw.write(`event: refresh\ndata: ${JSON.stringify({ motivo, at: Date.now() })}\n\n`)
    }
    appEvents.on(ADMIN_REFRESH, onRefresh)

    // Heartbeat: comentário a cada 25s mantém a conexão viva (proxies/timeout)
    const heartbeat = setInterval(() => {
      reply.raw.write(': ping\n\n')
    }, 25_000)

    // Limpeza ao desconectar
    const cleanup = () => {
      clearInterval(heartbeat)
      appEvents.off(ADMIN_REFRESH, onRefresh)
    }
    req.raw.on('close', cleanup)
    req.raw.on('error', cleanup)
  })
}
