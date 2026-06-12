/**
 * Entry point da API IDIBRA.
 * Registra plugins, handler global de erros e as rotas dos módulos.
 */
import { resolve } from 'path'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

import { config } from '@/config'
import { AppError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'

import { authRoutes } from '@/modules/auth/auth.routes'
import { corretoresRoutes } from '@/modules/corretores/corretores.routes'
import { imobiliariasRoutes, imobiliariasPublicRoutes } from '@/modules/imobiliarias/imobiliarias.routes'
import { eventosRoutes } from '@/modules/eventos/eventos.routes'
import { inscricoesRoutes } from '@/modules/inscricoes/inscricoes.routes'
import { relatoriosRoutes } from '@/modules/relatorios/relatorios.routes'
import { configuracoesRoutes } from '@/modules/configuracoes/configuracoes.routes'
import { lembretesRoutes } from '@/modules/lembretes/lembretes.routes'
import { whatsappRoutes } from '@/modules/whatsapp/whatsapp.routes'
import { templatesRoutes } from '@/modules/templates/templates.routes'
import { notificationsRoutes } from '@/modules/notifications/notifications.routes'
import { importRoutes } from '@/modules/import/import.routes'
import { usuariosRoutes } from '@/modules/usuarios/usuarios.routes'
import { materiaisRoutes } from '@/modules/materiais/materiais.routes'
import { seedTemplates } from '@/modules/templates/templates.service'
import { agendarLembretes } from '@/jobs/lembretes'

async function buildServer() {
  const app = Fastify({
    logger: config.isProd
      ? { level: 'info' }
      : {
          level: 'debug',
          transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
        },
  })

  // ── Plugins de segurança ─────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false,
    // Permite que imagens de /uploads sejam embutidas pelo frontend (outra origem)
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })

  await app.register(cors, {
    // Em dev, aceita qualquer porta de localhost (Vite pode usar 5173, 5174...).
    // Em produção, restringe à lista de ALLOWED_ORIGINS.
    origin: config.isProd
      ? config.cors.origins
      : (origin, cb) => {
          if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true)
          if (config.cors.origins.includes(origin)) return cb(null, true)
          cb(null, false)
        },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  })

  // Rate limit global: 100 req/min por IP. Login tem limite menor (ver rota).
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // Upload de arquivos (multipart) — limite por tamanho configurável
  await app.register(multipart, {
    limits: {
      fileSize: config.upload.maxSizeMB * 1024 * 1024,
      files:    1,
    },
  })

  // Serve os uploads localmente. Em produção o Nginx serve /uploads/ direto
  // (mais rápido), mas este fallback mantém o dev funcionando sem Nginx.
  await app.register(fastifyStatic, {
    root:   resolve(config.upload.dir),
    prefix: '/uploads/',
    decorateReply: false,
  })

  // ── Handler global de erros ──────────────────────────────────
  app.setErrorHandler((error, req, reply) => {
    // Erros de validação Zod → 422
    if (error instanceof ZodError) {
      return reply.status(422).send({
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: error.flatten().fieldErrors,
      })
    }

    // Erros conhecidos da aplicação
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
      })
    }

    // Erros do Prisma (ex: violação de unique constraint)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return reply.status(409).send({ code: 'CONFLICT', message: 'Registro duplicado' })
      }
      if (error.code === 'P2025') {
        return reply.status(404).send({ code: 'NOT_FOUND', message: 'Registro não encontrado' })
      }
    }

    // Rate limit
    if (error.statusCode === 429) {
      return reply.status(429).send({ code: 'TOO_MANY_REQUESTS', message: 'Muitas requisições. Tente novamente em instantes.' })
    }

    // Upload acima do limite (@fastify/multipart)
    if (error.statusCode === 413 || error.code === 'FST_REQ_FILE_TOO_LARGE') {
      return reply.status(413).send({
        code: 'FILE_TOO_LARGE',
        message: `Arquivo muito grande. Máximo ${config.upload.maxSizeMB} MB.`,
      })
    }

    // Erro inesperado — loga e retorna 500 genérico
    req.log.error(error)
    return reply.status(500).send({
      code: 'INTERNAL_ERROR',
      message: config.isProd ? 'Erro interno do servidor' : error.message,
    })
  })

  // ── Health check ─────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // ── Rotas dos módulos ────────────────────────────────────────
  await app.register(authRoutes,             { prefix: '/auth' })
  await app.register(corretoresRoutes,       { prefix: '/corretores' })
  await app.register(imobiliariasPublicRoutes, { prefix: '/imobiliarias' })
  await app.register(imobiliariasRoutes,     { prefix: '/imobiliarias' })
  await app.register(eventosRoutes,      { prefix: '/eventos' })
  await app.register(inscricoesRoutes,   { prefix: '/inscricoes' })
  await app.register(relatoriosRoutes,   { prefix: '/relatorios' })
  await app.register(configuracoesRoutes, { prefix: '/configuracoes' })
  await app.register(lembretesRoutes,    { prefix: '/lembretes' })
  await app.register(whatsappRoutes,     { prefix: '/whatsapp' })
  await app.register(templatesRoutes,    { prefix: '/templates' })
  await app.register(notificationsRoutes, { prefix: '/notifications' })
  await app.register(importRoutes,       { prefix: '/import' })
  await app.register(usuariosRoutes,     { prefix: '/usuarios' })
  await app.register(materiaisRoutes)

  return app
}

async function start() {
  const app = await buildServer()

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`${signal} recebido — encerrando...`)
    await app.close()
    await prisma.$disconnect()
    process.exit(0)
  }
  process.on('SIGINT',  () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' })
    app.log.info(`🚀 API IDIBRA rodando em http://localhost:${config.port} (${config.env})`)
    // Garante os templates de notificação e agenda o cron (fora de teste)
    if (config.env !== 'test') {
      seedTemplates().catch((e) => app.log.error(e))
      agendarLembretes()
    }
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
