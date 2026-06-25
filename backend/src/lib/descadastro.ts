/**
 * Token de descadastro de e-mail (LGPD), sem necessidade de login.
 * Assina o ID do corretor com HMAC-SHA256 (segredo do JWT) — não dá para forjar.
 */
import { createHmac, timingSafeEqual } from 'crypto'
import { config } from '@/config'

export function gerarTokenDescadastro(corretorId: string): string {
  return createHmac('sha256', config.jwt.secret).update(`descad:${corretorId}`).digest('base64url')
}

export function tokenDescadastroValido(corretorId: string, token: string): boolean {
  const esperado = gerarTokenDescadastro(corretorId)
  const a = Buffer.from(esperado)
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** URL pública para o corretor gerenciar a preferência de e-mail. */
export function urlDescadastro(corretorId: string): string {
  return `${config.portalUrl}/descadastrar?c=${corretorId}&t=${gerarTokenDescadastro(corretorId)}`
}
