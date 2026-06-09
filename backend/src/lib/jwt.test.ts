import { describe, it, expect } from 'vitest'
import { signAccessToken, verifyToken } from './jwt'
import { UnauthorizedError } from './errors'

describe('jwt', () => {
  it('assina e verifica um token, preservando o payload', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'admin', nome: 'Fulano' })
    const payload = verifyToken(token)
    expect(payload.sub).toBe('user-1')
    expect(payload.role).toBe('admin')
    expect(payload.nome).toBe('Fulano')
  })

  it('lança UnauthorizedError para token inválido', () => {
    expect(() => verifyToken('token.invalido.aqui')).toThrow(UnauthorizedError)
  })

  it('lança UnauthorizedError para string vazia', () => {
    expect(() => verifyToken('')).toThrow(UnauthorizedError)
  })
})
