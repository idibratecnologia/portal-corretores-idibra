import { ApiError } from './api'

/**
 * Extrai uma mensagem legível de qualquer tipo de erro.
 * Prioriza a mensagem da ApiError (vinda da API real).
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error)    return err.message
  if (typeof err === 'string') return err
  return 'Erro inesperado. Tente novamente.'
}

/**
 * Retorna true para erros de autenticação/autorização.
 */
export function isAuthError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403)
}

/**
 * Retorna true para erros de validação (campos inválidos vindos da API).
 */
export function isValidationError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 422
}
