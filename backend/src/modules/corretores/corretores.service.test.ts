import { describe, it, expect } from 'vitest'
import * as corretores from './corretores.service'
import { prisma } from '@/lib/prisma'
import { NotFoundError, ConflictError } from '@/lib/errors'
import { criarCorretor } from '@/test/factories'

const base = {
  nome: 'Fulano', cpf: '111.111.111-11', creci: 'SP-111',
  email: 'fulano@email.com', telefone: '(11) 90000-0000',
  whatsapp: '(11) 90000-0000', cidade: 'São Paulo', uf: 'sp',
}

describe('corretores.createCorretor', () => {
  it('cria corretor pendente e normaliza UF', async () => {
    const c = await corretores.createCorretor(base)
    expect(c.status).toBe('pendente')
    expect(c.uf).toBe('SP')
  })

  it('rejeita CPF/e-mail/CRECI duplicado', async () => {
    await corretores.createCorretor(base)
    await expect(corretores.createCorretor(base)).rejects.toThrow(ConflictError)
  })

  it('não retorna a senha (campo protegido)', async () => {
    const c = await corretores.createCorretor({ ...base, email: 'outro@email.com', cpf: '222', creci: 'SP-222' })
    expect((c as Record<string, unknown>).senha).toBeUndefined()
  })
})

describe('corretores.setStatus', () => {
  it('aprova corretor (pendente → ativo) e dispara notificação se opt-in', async () => {
    const c = await criarCorretor({ status: 'pendente', whatsapp_opt_in: true })
    const r = await corretores.setStatus(c.id, 'ativo')
    expect(r.status).toBe('ativo')

    const log = await prisma.notificacaoLog.findFirst({ where: { corretor_id: c.id, tipo: 'aprovacao' } })
    expect(log).toBeTruthy()
  })

  it('não dispara notificação sem opt-in', async () => {
    const c = await criarCorretor({ status: 'pendente', whatsapp_opt_in: false })
    await corretores.setStatus(c.id, 'ativo')
    const log = await prisma.notificacaoLog.findFirst({ where: { corretor_id: c.id, tipo: 'aprovacao' } })
    expect(log).toBeNull()
  })

  it('lança NotFoundError para corretor inexistente', async () => {
    await expect(corretores.setStatus('00000000-0000-0000-0000-000000000000', 'ativo')).rejects.toThrow(NotFoundError)
  })
})

describe('corretores.listCorretores', () => {
  it('filtra por status e pagina', async () => {
    await criarCorretor({ status: 'ativo' })
    await criarCorretor({ status: 'ativo' })
    await criarCorretor({ status: 'pendente' })

    const res = await corretores.listCorretores({ status: 'ativo', page: 1, limit: 10 })
    expect(res.meta.total).toBe(2)
    expect(res.data.every((c) => c.status === 'ativo')).toBe(true)
  })
})

describe('corretores.resetSenhaAdmin', () => {
  it('gera senha temporária', async () => {
    const c = await criarCorretor()
    const { senha_temporaria } = await corretores.resetSenhaAdmin(c.id)
    expect(senha_temporaria.length).toBeGreaterThanOrEqual(6)
  })
})
