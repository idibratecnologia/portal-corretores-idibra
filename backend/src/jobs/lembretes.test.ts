import { describe, it, expect } from 'vitest'
import { enviarLembretes } from './lembretes'
import { prisma } from '@/lib/prisma'
import { criarEvento, criarCorretor } from '@/test/factories'

/** Cria evento + 1 inscrição (status configurável) e retorna ambos. */
async function eventoComInscrito(
  dataEvento: Date,
  optIn: boolean,
  statusInscricao: 'inscrito' | 'cancelado' | 'presente' = 'inscrito',
) {
  const evento = await criarEvento({ status: 'publicado', data_evento: dataEvento })
  const corretor = await criarCorretor({ whatsapp_opt_in: optIn })
  await prisma.inscricao.create({
    data: { evento_id: evento.id, corretor_id: corretor.id, status: statusInscricao },
  })
  return { evento, corretor }
}

const REF = new Date('2026-06-10T10:00:00')
const AMANHA = new Date('2026-06-11T19:00:00') // D-1 em relação a REF
const HOJE   = new Date('2026-06-10T19:00:00') // D-0 em relação a REF
const OUTRO  = new Date('2026-06-20T19:00:00') // fora da janela

describe('enviarLembretes', () => {
  it('dispara D-1 para evento de amanhã (inscrito + opt-in)', async () => {
    const { evento, corretor } = await eventoComInscrito(AMANHA, true)
    const { d1, d0 } = await enviarLembretes(REF)

    expect(d1).toBe(1)
    expect(d0).toBe(0)
    const log = await prisma.notificacaoLog.findFirst({
      where: { corretor_id: corretor.id, evento_id: evento.id, tipo: 'lembrete_antecedencia' },
    })
    expect(log?.status).toBe('enviado')
  })

  it('dispara D-0 para evento de hoje', async () => {
    await eventoComInscrito(HOJE, true)
    const { d1, d0 } = await enviarLembretes(REF)
    expect(d0).toBe(1)
    expect(d1).toBe(0)
  })

  it('ignora corretor sem opt-in', async () => {
    await eventoComInscrito(AMANHA, false)
    const { d1 } = await enviarLembretes(REF)
    expect(d1).toBe(0)
  })

  it('ignora eventos fora da janela D-1/D-0', async () => {
    await eventoComInscrito(OUTRO, true)
    const { d1, d0 } = await enviarLembretes(REF)
    expect(d1).toBe(0)
    expect(d0).toBe(0)
  })

  it('ignora inscrição cancelada', async () => {
    await eventoComInscrito(AMANHA, true, 'cancelado')
    const { d1 } = await enviarLembretes(REF)
    expect(d1).toBe(0)
  })

  it('não reenvia (idempotente) numa segunda execução', async () => {
    await eventoComInscrito(AMANHA, true)
    const primeira = await enviarLembretes(REF)
    expect(primeira.d1).toBe(1)
    const segunda = await enviarLembretes(REF)
    expect(segunda.d1).toBe(0) // já enviado, não repete
  })

  it('não dispara para evento em rascunho', async () => {
    const evento = await criarEvento({ status: 'rascunho', data_evento: AMANHA })
    const corretor = await criarCorretor({ whatsapp_opt_in: true })
    await prisma.inscricao.create({ data: { evento_id: evento.id, corretor_id: corretor.id, status: 'inscrito' } })
    const { d1 } = await enviarLembretes(REF)
    expect(d1).toBe(0)
  })
})
