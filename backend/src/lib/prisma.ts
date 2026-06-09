/**
 * Instância singleton do PrismaClient.
 * Em desenvolvimento, reutiliza a instância global para evitar
 * múltiplas conexões durante o hot-reload do ts-node-dev.
 */
import { PrismaClient } from '@prisma/client'
import { config } from '@/config'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isProd ? ['error'] : ['query', 'warn', 'error'],
  })

if (!config.isProd) {
  globalForPrisma.prisma = prisma
}
