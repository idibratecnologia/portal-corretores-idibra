import { describe, it, expect } from 'vitest'
import * as imob from './imobiliarias.service'
import { prisma } from '@/lib/prisma'
import { NotFoundError, ConflictError } from '@/lib/errors'
import { criarImobiliaria, criarCorretor } from '@/test/factories'

const nova = { nome: 'Alpha', cnpj: '12.345.678/0001-90', cidade: 'São Paulo', uf: 'sp' }

describe('imobiliarias.createImobiliaria', () => {
  it('cria imobiliária e normaliza UF', async () => {
    const i = await imob.createImobiliaria(nova)
    expect(i.nome).toBe('Alpha')
    expect(i.uf).toBe('SP')
  })

  it('rejeita CNPJ duplicado', async () => {
    await imob.createImobiliaria(nova)
    await expect(imob.createImobiliaria(nova)).rejects.toThrow(ConflictError)
  })
})

describe('imobiliarias.listImobiliarias', () => {
  it('inclui contagem de corretores vinculados', async () => {
    const i = await criarImobiliaria()
    await criarCorretor({ imobiliaria_id: i.id })
    await criarCorretor({ imobiliaria_id: i.id })

    const lista = await imob.listImobiliarias()
    const alvo = lista.find((x) => x.id === i.id)
    expect(alvo?.total_corretores).toBe(2)
  })
})

describe('imobiliarias.setStatus / delete', () => {
  it('altera status', async () => {
    const i = await criarImobiliaria({ status: 'ativa' })
    const r = await imob.setStatus(i.id, 'inativa')
    expect(r.status).toBe('inativa')
  })

  it('exclui imobiliária e desvincula corretores (SetNull)', async () => {
    const i = await criarImobiliaria()
    const c = await criarCorretor({ imobiliaria_id: i.id })
    await imob.deleteImobiliaria(i.id)

    const corretor = await prisma.corretor.findUnique({ where: { id: c.id } })
    expect(corretor).toBeTruthy()             // corretor não é excluído
    expect(corretor?.imobiliaria_id).toBeNull() // vínculo é removido
  })

  it('lança NotFoundError ao excluir inexistente', async () => {
    await expect(imob.deleteImobiliaria('00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundError)
  })
})

describe('imobiliarias.listImobiliariasPublicas', () => {
  it('retorna apenas ativas', async () => {
    await criarImobiliaria({ status: 'ativa' })
    await criarImobiliaria({ status: 'inativa' })
    const pub = await imob.listImobiliariasPublicas()
    expect(pub.length).toBe(1)
  })
})
