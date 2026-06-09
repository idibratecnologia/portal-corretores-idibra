import { describe, it, expect } from 'vitest'
import * as inscricoes from './inscricoes.service'
import { prisma } from '@/lib/prisma'
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '@/lib/errors'
import { criarEvento, criarCorretor } from '@/test/factories'

describe('inscricoes.createInscricao', () => {
  it('inscreve corretor em evento publicado', async () => {
    const evento = await criarEvento({ status: 'publicado' })
    const corretor = await criarCorretor()
    const ins = await inscricoes.createInscricao(corretor.id, evento.id)
    expect(ins.status).toBe('inscrito')
    expect(ins.qr_code_token).toBeTruthy()
  })

  it('bloqueia inscrição em evento não publicado', async () => {
    const evento = await criarEvento({ status: 'rascunho' })
    const corretor = await criarCorretor()
    await expect(inscricoes.createInscricao(corretor.id, evento.id)).rejects.toThrow(BadRequestError)
  })

  it('bloqueia inscrição com inscrições fechadas', async () => {
    const evento = await criarEvento({ status: 'publicado', inscricoes_abertas: false })
    const corretor = await criarCorretor()
    await expect(inscricoes.createInscricao(corretor.id, evento.id)).rejects.toThrow(BadRequestError)
  })

  it('bloqueia inscrição duplicada', async () => {
    const evento = await criarEvento({ status: 'publicado' })
    const corretor = await criarCorretor()
    await inscricoes.createInscricao(corretor.id, evento.id)
    await expect(inscricoes.createInscricao(corretor.id, evento.id)).rejects.toThrow(ConflictError)
  })

  it('bloqueia inscrição em evento lotado', async () => {
    const evento = await criarEvento({ status: 'publicado', capacidade: 1 })
    const c1 = await criarCorretor()
    const c2 = await criarCorretor()
    await inscricoes.createInscricao(c1.id, evento.id)
    await expect(inscricoes.createInscricao(c2.id, evento.id)).rejects.toThrow(BadRequestError)
  })

  it('permite reinscrição após cancelamento', async () => {
    const evento = await criarEvento({ status: 'publicado' })
    const corretor = await criarCorretor()
    const ins = await inscricoes.createInscricao(corretor.id, evento.id)
    await inscricoes.cancelarInscricao(ins.id, corretor.id, false)
    const reins = await inscricoes.createInscricao(corretor.id, evento.id)
    expect(reins.status).toBe('inscrito')
  })

  it('lança NotFoundError para evento inexistente', async () => {
    const corretor = await criarCorretor()
    await expect(inscricoes.createInscricao(corretor.id, '00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundError)
  })
})

describe('inscricoes.cancelarInscricao', () => {
  it('corretor cancela a própria inscrição', async () => {
    const evento = await criarEvento({ status: 'publicado' })
    const corretor = await criarCorretor()
    const ins = await inscricoes.createInscricao(corretor.id, evento.id)
    await inscricoes.cancelarInscricao(ins.id, corretor.id, false)
    const atualizada = await prisma.inscricao.findUnique({ where: { id: ins.id } })
    expect(atualizada?.status).toBe('cancelado')
  })

  it('impede corretor de cancelar inscrição de outro', async () => {
    const evento = await criarEvento({ status: 'publicado' })
    const dono = await criarCorretor()
    const outro = await criarCorretor()
    const ins = await inscricoes.createInscricao(dono.id, evento.id)
    await expect(inscricoes.cancelarInscricao(ins.id, outro.id, false)).rejects.toThrow(ForbiddenError)
  })

  it('impede cancelar inscrição já presente', async () => {
    const evento = await criarEvento({ status: 'publicado' })
    const corretor = await criarCorretor()
    const ins = await inscricoes.createInscricao(corretor.id, evento.id)
    await prisma.inscricao.update({ where: { id: ins.id }, data: { status: 'presente' } })
    await expect(inscricoes.cancelarInscricao(ins.id, corretor.id, false)).rejects.toThrow(BadRequestError)
  })
})

describe('inscricoes.realizarCheckin', () => {
  it('realiza check-in com token válido', async () => {
    const evento = await criarEvento({ status: 'publicado' })
    const corretor = await criarCorretor()
    const ins = await inscricoes.createInscricao(corretor.id, evento.id)

    const res = await inscricoes.realizarCheckin(ins.qr_code_token, 'admin-1')
    expect(res.ok).toBe(true)
    expect(res.inscricao?.status).toBe('presente')

    const atualizada = await prisma.inscricao.findUnique({ where: { id: ins.id } })
    expect(atualizada?.status).toBe('presente')
    expect(atualizada?.checkin_at).toBeTruthy()
  })

  it('rejeita token inexistente', async () => {
    const res = await inscricoes.realizarCheckin('token-que-nao-existe', 'admin-1')
    expect(res.ok).toBe(false)
    expect(res.erro).toContain('não encontrado')
  })

  it('rejeita check-in duplicado', async () => {
    const evento = await criarEvento({ status: 'publicado' })
    const corretor = await criarCorretor()
    const ins = await inscricoes.createInscricao(corretor.id, evento.id)
    await inscricoes.realizarCheckin(ins.qr_code_token, 'admin-1')
    const res = await inscricoes.realizarCheckin(ins.qr_code_token, 'admin-1')
    expect(res.ok).toBe(false)
    expect(res.erro).toContain('já realizado')
  })

  it('rejeita check-in de inscrição cancelada', async () => {
    const evento = await criarEvento({ status: 'publicado' })
    const corretor = await criarCorretor()
    const ins = await inscricoes.createInscricao(corretor.id, evento.id)
    await prisma.inscricao.update({ where: { id: ins.id }, data: { status: 'cancelado' } })
    const res = await inscricoes.realizarCheckin(ins.qr_code_token, 'admin-1')
    expect(res.ok).toBe(false)
  })
})
