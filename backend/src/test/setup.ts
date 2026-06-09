/**
 * Executado em cada arquivo de teste: limpa todas as tabelas antes de cada
 * teste, garantindo isolamento total entre eles.
 */
import { beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'

const TABELAS = [
  'notificacoes_log',
  'password_resets',
  'inscricoes',
  'eventos',
  'corretores',
  'imobiliarias',
  'admins',
  'configuracoes',
]

beforeEach(async () => {
  // TRUNCATE com CASCADE zera tudo respeitando FKs, reiniciando identidades
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABELAS.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`
  )
})

afterAll(async () => {
  await prisma.$disconnect()
})
