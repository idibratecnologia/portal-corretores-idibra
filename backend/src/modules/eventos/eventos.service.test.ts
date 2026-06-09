import { describe, it, expect } from 'vitest'
import * as eventos from './eventos.service'
import { prisma } from '@/lib/prisma'
import { NotFoundError, BadRequestError } from '@/lib/errors'
import { criarEvento, criarCorretor } from '@/test/factories'

const novoEvento = {
  titulo: 'Lançamento X', descricao: 'desc', tipo: 'lancamento' as const,
  local: 'Sede', endereco: 'Rua 1', data_evento: new Date(Date.now() + 86400000),
  hora_inicio: '19:00', hora_fim: '22:00', capacidade: 50,
}

describe('eventos.createEvento', () => {
  it('cria evento como rascunho', async () => {
    const e = await eventos.createEvento(novoEvento)
    expect(e.status).toBe('rascunho')
    expect(e.total_inscritos).toBe(0)
    expect(e.total_presentes).toBe(0)
  })
})

describe('eventos.setStatus — máquina de estados', () => {
  it('permite rascunho → publicado', async () => {
    const e = await criarEvento({ status: 'rascunho' })
    const r = await eventos.setStatus(e.id, 'publicado')
    expect(r.status).toBe('publicado')
  })

  it('permite publicado → encerrado', async () => {
    const e = await criarEvento({ status: 'publicado' })
    const r = await eventos.setStatus(e.id, 'encerrado')
    expect(r.status).toBe('encerrado')
  })

  it('bloqueia rascunho → encerrado (transição inválida)', async () => {
    const e = await criarEvento({ status: 'rascunho' })
    await expect(eventos.setStatus(e.id, 'encerrado')).rejects.toThrow(BadRequestError)
  })

  it('bloqueia encerrado → publicado (estado terminal)', async () => {
    const e = await criarEvento({ status: 'encerrado' })
    await expect(eventos.setStatus(e.id, 'publicado')).rejects.toThrow(BadRequestError)
  })

  it('cancelar evento notifica inscritos com opt-in', async () => {
    const evento = await criarEvento({ status: 'publicado' })
    const corretor = await criarCorretor({ whatsapp_opt_in: true })
    await prisma.inscricao.create({ data: { evento_id: evento.id, corretor_id: corretor.id, status: 'inscrito' } })

    await eventos.setStatus(evento.id, 'cancelado')

    const log = await prisma.notificacaoLog.findFirst({
      where: { corretor_id: corretor.id, tipo: 'cancelamento_evento' },
    })
    expect(log).toBeTruthy()
  })

  it('lança NotFoundError para evento inexistente', async () => {
    await expect(eventos.setStatus('00000000-0000-0000-0000-000000000000', 'publicado')).rejects.toThrow(NotFoundError)
  })
})

describe('eventos.listEventos', () => {
  it('onlyPublished retorna apenas eventos publicados', async () => {
    await criarEvento({ status: 'publicado' })
    await criarEvento({ status: 'rascunho' })
    await criarEvento({ status: 'encerrado' })

    const res = await eventos.listEventos({}, true)
    expect(res.data.every((e) => e.status === 'publicado')).toBe(true)
    expect(res.data.length).toBe(1)
  })
})
