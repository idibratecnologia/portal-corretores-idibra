import { describe, it, expect } from 'vitest'
import { resolvePagination, buildPaginated } from './pagination'

describe('resolvePagination', () => {
  it('usa valores padrão quando vazio', () => {
    const r = resolvePagination({})
    expect(r.page).toBe(1)
    expect(r.limit).toBe(10)
    expect(r.skip).toBe(0)
    expect(r.take).toBe(10)
  })

  it('calcula skip a partir de page/limit', () => {
    const r = resolvePagination({ page: 3, limit: 20 })
    expect(r.skip).toBe(40)
    expect(r.take).toBe(20)
  })

  it('limita o máximo a 100', () => {
    expect(resolvePagination({ limit: 999 }).limit).toBe(100)
  })

  it('força page e limit mínimos válidos', () => {
    const r = resolvePagination({ page: 0, limit: 0 })
    expect(r.page).toBe(1)
    expect(r.limit).toBe(1)
  })
})

describe('buildPaginated', () => {
  it('monta meta corretamente', () => {
    const res = buildPaginated([1, 2, 3], 25, 1, 10)
    expect(res.data).toEqual([1, 2, 3])
    expect(res.meta).toEqual({ total: 25, page: 1, limit: 10, pages: 3 })
  })

  it('retorna ao menos 1 página quando não há registros', () => {
    expect(buildPaginated([], 0, 1, 10).meta.pages).toBe(1)
  })
})
