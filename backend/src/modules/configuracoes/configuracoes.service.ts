/**
 * Configurações do sistema — armazenadas em uma única linha (singleton).
 */
import { prisma } from '@/lib/prisma'

const SINGLETON_ID = 'singleton'

export interface ConfiguracaoInput {
  empresa_nome?:     string
  empresa_email?:    string
  empresa_telefone?: string
  empresa_site?:     string
  auto_approve?:     boolean
  notify_inscricao?: boolean
  allow_cancel?:     boolean
}

/** Retorna as configurações, criando a linha padrão se ainda não existir. */
export async function getConfig() {
  return prisma.configuracao.upsert({
    where:  { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
  })
}

/** Atualiza as configurações (cria a linha se necessário). */
export async function updateConfig(data: ConfiguracaoInput) {
  return prisma.configuracao.upsert({
    where:  { id: SINGLETON_ID },
    update: data,
    create: { id: SINGLETON_ID, ...data },
  })
}

/** Helper para regras de negócio consultarem a config (ex: auto_approve). */
export async function getRegras() {
  const cfg = await getConfig()
  return {
    auto_approve:     cfg.auto_approve,
    notify_inscricao: cfg.notify_inscricao,
    allow_cancel:     cfg.allow_cancel,
  }
}
