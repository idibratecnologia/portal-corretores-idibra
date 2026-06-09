/**
 * Helpers de paginação compartilhados entre os módulos.
 */

export interface PaginationParams {
  page?:  number
  limit?: number
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page:  number
    limit: number
    pages: number
  }
}

const DEFAULT_LIMIT = 10
const MAX_LIMIT     = 100

/**
 * Normaliza page/limit vindos da query (sempre dentro de limites seguros).
 * Retorna também skip/take prontos para o Prisma.
 */
export function resolvePagination(params: PaginationParams) {
  const page  = Math.max(1, params.page ?? 1)
  const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? DEFAULT_LIMIT))
  const skip  = (page - 1) * limit
  return { page, limit, skip, take: limit }
}

/**
 * Monta o objeto de resposta paginada.
 */
export function buildPaginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  }
}
