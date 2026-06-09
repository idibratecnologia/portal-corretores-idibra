import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './hash'

describe('hash', () => {
  it('gera um hash diferente da senha original', async () => {
    const hash = await hashPassword('minhasenha')
    expect(hash).not.toBe('minhasenha')
    expect(hash.length).toBeGreaterThan(20)
  })

  it('verifica a senha correta', async () => {
    const hash = await hashPassword('senha123')
    expect(await verifyPassword('senha123', hash)).toBe(true)
  })

  it('rejeita senha incorreta', async () => {
    const hash = await hashPassword('senha123')
    expect(await verifyPassword('errada', hash)).toBe(false)
  })

  it('gera hashes diferentes para a mesma senha (salt)', async () => {
    const a = await hashPassword('igual')
    const b = await hashPassword('igual')
    expect(a).not.toBe(b)
  })
})
