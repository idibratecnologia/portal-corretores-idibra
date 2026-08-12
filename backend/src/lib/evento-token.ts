/**
 * Token do link de convite de evento exclusivo.
 * Assina o ID do evento com HMAC-SHA256 (segredo do JWT) — não dá para forjar.
 * Quem tem o link pode entrar no evento (ver e se inscrever) mesmo sem ter sido
 * pré-selecionado; o evento continua invisível para quem não tem o link.
 */
import { createHmac, timingSafeEqual } from 'crypto'
import { config } from '@/config'

export function gerarTokenEvento(eventoId: string): string {
  return createHmac('sha256', config.jwt.secret).update(`evt:${eventoId}`).digest('base64url')
}

export function tokenEventoValido(eventoId: string, token: string): boolean {
  const esperado = gerarTokenEvento(eventoId)
  const a = Buffer.from(esperado)
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** URL pública do link de convite do evento exclusivo. */
export function urlEventoExclusivo(eventoId: string): string {
  return `${config.portalUrl}/evento-exclusivo/${eventoId}?t=${gerarTokenEvento(eventoId)}`
}
