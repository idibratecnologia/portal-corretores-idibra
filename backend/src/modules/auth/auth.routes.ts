/**
 * Rotas de autenticação.
 *
 *   POST /auth/login     → login unificado (admin ou corretor)
 *   POST /auth/cadastro  → auto-cadastro de corretor (público)
 *   POST /auth/refresh   → renova access token
 *   POST /auth/logout    → logout (stateless — cliente descarta o token)
 *   GET  /auth/me        → dados do admin logado
 */
import type { FastifyInstance } from 'fastify'
import {
  loginSchema, cadastroSchema, refreshSchema,
  trocarSenhaSchema, esqueciSenhaSchema, resetarSenhaSchema,
} from './auth.schema'
import * as authService from './auth.service'
import { authenticate, requireAdmin } from '@/middlewares/auth.middleware'

export async function authRoutes(app: FastifyInstance) {
  // ── POST /auth/login ──────────────────────────────────────────
  // Rate limit apertado: 10 tentativas por minuto por IP (anti força bruta)
  app.post('/login', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
  }, async (req, reply) => {
    const body = loginSchema.parse(req.body)
    const result = await authService.login(body)
    return reply.send(result)
  })

  // ── POST /auth/cadastro ───────────────────────────────────────
  app.post('/cadastro', async (req, reply) => {
    const body = cadastroSchema.parse(req.body)
    const result = await authService.cadastrarCorretor(body)
    return reply.status(201).send({
      id: result.id,
      message: 'Cadastro realizado! Aguarde a aprovação do administrador.',
    })
  })

  // ── POST /auth/refresh ────────────────────────────────────────
  app.post('/refresh', async (req, reply) => {
    const { refresh_token } = refreshSchema.parse(req.body)
    const result = await authService.refresh(refresh_token)
    return reply.send(result)
  })

  // ── POST /auth/logout ─────────────────────────────────────────
  // JWT é stateless — o logout real acontece no cliente (descarta o token).
  // Endpoint existe para futura invalidação via blacklist, se necessário.
  app.post('/logout', async (_req, reply) => {
    return reply.send({ message: 'Logout realizado' })
  })

  // ── GET /auth/me ──────────────────────────────────────────────
  app.get('/me', { preHandler: [authenticate, requireAdmin] }, async (req, reply) => {
    const admin = await authService.getAdminMe(req.user!.sub)
    return reply.send(admin)
  })

  // ── POST /auth/trocar-senha ───────────────────────────────────
  app.post('/trocar-senha', { preHandler: [authenticate] }, async (req, reply) => {
    const { senha_atual, nova_senha } = trocarSenhaSchema.parse(req.body)
    await authService.trocarSenha(req.user!.sub, req.user!.role, senha_atual, nova_senha)
    return reply.send({ message: 'Senha alterada com sucesso' })
  })

  // ── POST /auth/esqueci-senha ──────────────────────────────────
  app.post('/esqueci-senha', async (req, reply) => {
    const { email } = esqueciSenhaSchema.parse(req.body)
    await authService.esqueciSenha(email)
    // Sempre 200 genérico (anti-enumeração)
    return reply.send({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções.' })
  })

  // ── POST /auth/resetar-senha ──────────────────────────────────
  app.post('/resetar-senha', async (req, reply) => {
    const { token, nova_senha } = resetarSenhaSchema.parse(req.body)
    await authService.resetarSenha(token, nova_senha)
    return reply.send({ message: 'Senha redefinida com sucesso' })
  })
}
