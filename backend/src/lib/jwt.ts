/**
 * Geração e verificação de JSON Web Tokens.
 */
import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { config } from '@/config'
import { UnauthorizedError } from '@/lib/errors'

export type UserRole = 'admin' | 'corretor'
export type NivelAdmin = 'super' | 'operador'

export interface JWTPayload {
  sub:   string   // ID do usuário
  role:  UserRole
  nome:  string
  nivel?: NivelAdmin   // apenas para admins (super | operador)
}

// expiresIn vem do .env como string ("8h", "30d") — o tipo do jsonwebtoken
// é um template literal estrito, então casamos para o tipo esperado.
type ExpiresIn = SignOptions['expiresIn']

/** Gera o access token (curta duração). */
export function signAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as ExpiresIn,
  })
}

/** Gera o refresh token (longa duração). */
export function signRefreshToken(payload: Pick<JWTPayload, 'sub' | 'role'>): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn as ExpiresIn,
  })
}

/** Verifica e decodifica um token. Lança UnauthorizedError se inválido/expirado. */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, config.jwt.secret) as JWTPayload
  } catch {
    throw new UnauthorizedError('Token inválido ou expirado')
  }
}
