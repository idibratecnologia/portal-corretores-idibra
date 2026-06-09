import { describe, it, expect } from 'vitest'
import * as auth from './auth.service'
import { updateConfig } from '@/modules/configuracoes/configuracoes.service'
import { prisma } from '@/lib/prisma'
import { UnauthorizedError, ForbiddenError, ConflictError, BadRequestError } from '@/lib/errors'
import { verifyPassword } from '@/lib/hash'
import { criarAdmin, criarCorretor } from '@/test/factories'

const cadastroBase = {
  nome: 'Novo Corretor', cpf: '111.111.111-11', creci: 'SP-999',
  email: 'novo@email.com', senha: 'senha123',
  telefone: '(11) 90000-0000', whatsapp: '(11) 90000-0000',
  cidade: 'São Paulo', uf: 'sp', whatsapp_opt_in: false,
}

describe('auth.login', () => {
  it('autentica admin com senha correta', async () => {
    await criarAdmin({ email: 'a@idibra.com.br', senha: 'admin123' })
    const res = await auth.login({ email: 'a@idibra.com.br', senha: 'admin123' })
    expect(res.user.role).toBe('admin')
    expect(res.access_token).toBeTruthy()
    expect(res.refresh_token).toBeTruthy()
  })

  it('rejeita admin com senha errada', async () => {
    await criarAdmin({ email: 'a@idibra.com.br', senha: 'admin123' })
    await expect(auth.login({ email: 'a@idibra.com.br', senha: 'errada' })).rejects.toThrow(UnauthorizedError)
  })

  it('autentica corretor ativo', async () => {
    await criarCorretor({ email: 'c@email.com', senha: 'corretor123', status: 'ativo' })
    const res = await auth.login({ email: 'c@email.com', senha: 'corretor123' })
    expect(res.user.role).toBe('corretor')
  })

  it('bloqueia corretor pendente', async () => {
    await criarCorretor({ email: 'p@email.com', senha: 'corretor123', status: 'pendente' })
    await expect(auth.login({ email: 'p@email.com', senha: 'corretor123' })).rejects.toThrow(ForbiddenError)
  })

  it('bloqueia corretor bloqueado', async () => {
    await criarCorretor({ email: 'b@email.com', senha: 'corretor123', status: 'bloqueado' })
    await expect(auth.login({ email: 'b@email.com', senha: 'corretor123' })).rejects.toThrow(ForbiddenError)
  })

  it('rejeita e-mail inexistente', async () => {
    await expect(auth.login({ email: 'ninguem@email.com', senha: 'x' })).rejects.toThrow(UnauthorizedError)
  })
})

describe('auth.cadastrarCorretor', () => {
  it('cria corretor pendente quando auto_approve = false', async () => {
    await updateConfig({ auto_approve: false })
    const { id } = await auth.cadastrarCorretor(cadastroBase)
    const c = await prisma.corretor.findUnique({ where: { id } })
    expect(c?.status).toBe('pendente')
  })

  it('cria corretor ativo quando auto_approve = true', async () => {
    await updateConfig({ auto_approve: true })
    const { id } = await auth.cadastrarCorretor({ ...cadastroBase, email: 'auto@email.com', cpf: '222', creci: 'SP-222' })
    const c = await prisma.corretor.findUnique({ where: { id } })
    expect(c?.status).toBe('ativo')
  })

  it('rejeita e-mail duplicado', async () => {
    await criarCorretor({ email: cadastroBase.email })
    await expect(auth.cadastrarCorretor(cadastroBase)).rejects.toThrow(ConflictError)
  })
})

describe('auth.trocarSenha', () => {
  it('troca a senha do corretor com a senha atual correta', async () => {
    const c = await criarCorretor({ senha: 'antiga123' })
    await auth.trocarSenha(c.id, 'corretor', 'antiga123', 'nova123')
    const atualizado = await prisma.corretor.findUnique({ where: { id: c.id } })
    expect(await verifyPassword('nova123', atualizado!.senha)).toBe(true)
  })

  it('rejeita troca com senha atual incorreta', async () => {
    const c = await criarCorretor({ senha: 'antiga123' })
    await expect(auth.trocarSenha(c.id, 'corretor', 'errada', 'nova123')).rejects.toThrow(BadRequestError)
  })
})

describe('auth.esqueciSenha + resetarSenha', () => {
  it('gera token e redefine a senha', async () => {
    const c = await criarCorretor({ email: 'reset@email.com' })
    await auth.esqueciSenha('reset@email.com')

    const reset = await prisma.passwordReset.findFirst({ where: { email: 'reset@email.com' } })
    expect(reset).toBeTruthy()

    await auth.resetarSenha(reset!.token, 'redefinida123')
    const atualizado = await prisma.corretor.findUnique({ where: { id: c.id } })
    expect(await verifyPassword('redefinida123', atualizado!.senha)).toBe(true)
  })

  it('não permite reutilizar o token', async () => {
    await criarCorretor({ email: 'reuso@email.com' })
    await auth.esqueciSenha('reuso@email.com')
    const reset = await prisma.passwordReset.findFirst({ where: { email: 'reuso@email.com' } })
    await auth.resetarSenha(reset!.token, 'primeira123')
    await expect(auth.resetarSenha(reset!.token, 'segunda123')).rejects.toThrow(BadRequestError)
  })

  it('rejeita token expirado', async () => {
    const c = await criarCorretor({ email: 'exp@email.com' })
    await prisma.passwordReset.create({
      data: { email: c.email, token: 'token-velho', expires_at: new Date(Date.now() - 1000) },
    })
    await expect(auth.resetarSenha('token-velho', 'x123456')).rejects.toThrow(BadRequestError)
  })

  it('não revela se o e-mail existe (resolve silenciosamente)', async () => {
    await expect(auth.esqueciSenha('naoexiste@email.com')).resolves.toBeUndefined()
  })
})
