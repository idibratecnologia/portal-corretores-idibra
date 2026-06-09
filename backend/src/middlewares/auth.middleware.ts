/**
 * Middlewares de autenticação e autorização.
 *
 * Uso nas rotas:
 *   fastify.get('/rota', { preHandler: [authenticate] }, handler)
 *   fastify.get('/admin-only', { preHandler: [authenticate, requireAdmin] }, handler)
 */
import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken } from '@/lib/jwt'
import type { JWTPayload } from '@/lib/jwt'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'

// Estende o tipo do request para incluir o usuário autenticado
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload
  }
}

/**
 * Verifica o header Authorization: Bearer <token> e injeta req.user.
 * Lança UnauthorizedError se ausente ou inválido.
 */
export async function authenticate(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token de acesso ausente')
  }

  const token = header.slice(7) // remove "Bearer "
  req.user = verifyToken(token)
}

/**
 * Exige que o usuário autenticado seja admin.
 * Deve ser usado APÓS o `authenticate`.
 */
export async function requireAdmin(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Não autenticado')
  }
  if (req.user.role !== 'admin') {
    throw new ForbiddenError('Acesso restrito a administradores')
  }
}

/**
 * Exige que o usuário autenticado seja corretor.
 * Deve ser usado APÓS o `authenticate`.
 */
export async function requireCorretor(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Não autenticado')
  }
  if (req.user.role !== 'corretor') {
    throw new ForbiddenError('Acesso restrito a corretores')
  }
}
