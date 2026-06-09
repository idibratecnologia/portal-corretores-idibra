/**
 * Templates de mensagens (Central de Notificações).
 * Renderiza placeholders {{chave}} e gerencia os textos editáveis.
 */
import { prisma } from '@/lib/prisma'
import { NotFoundError } from '@/lib/errors'
import { TEMPLATES_DEFAULT } from './templates.defaults'

export type Vars = Record<string, string | number | undefined | null>

/** Substitui {{chave}} pelos valores informados. */
export function render(conteudo: string, vars: Vars): string {
  return conteudo.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = vars[key]
    return v === undefined || v === null ? '' : String(v)
  })
}

/** Garante que todos os templates padrão existam (idempotente, não sobrescreve edições). */
export async function seedTemplates(): Promise<void> {
  for (const t of TEMPLATES_DEFAULT) {
    await prisma.mensagemTemplate.upsert({
      where:  { tipo: t.tipo },
      update: {}, // não sobrescreve o que o admin editou
      create: {
        tipo: t.tipo, titulo: t.titulo, descricao: t.descricao,
        conteudo: t.conteudo, com_imagem: t.com_imagem,
        dias_antecedencia: t.dias_antecedencia ?? null,
      },
    })
  }
}

/** Lista todos os templates (na ordem dos defaults), com placeholders disponíveis. */
export async function listTemplates() {
  await seedTemplates()
  const rows = await prisma.mensagemTemplate.findMany()
  const ordem = TEMPLATES_DEFAULT.map((t) => t.tipo)
  return rows
    .sort((a, b) => ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo))
    .map((r) => ({
      ...r,
      placeholders: TEMPLATES_DEFAULT.find((d) => d.tipo === r.tipo)?.placeholders ?? [],
    }))
}

/** Busca um template; cai no default se ainda não existir no banco. */
export async function getTemplate(tipo: string) {
  const row = await prisma.mensagemTemplate.findUnique({ where: { tipo } })
  if (row) return row
  const def = TEMPLATES_DEFAULT.find((t) => t.tipo === tipo)
  if (!def) throw new NotFoundError('Template não encontrado')
  return {
    id: '', tipo: def.tipo, titulo: def.titulo, descricao: def.descricao,
    conteudo: def.conteudo, ativo: true, com_imagem: def.com_imagem,
    dias_antecedencia: def.dias_antecedencia ?? null, updated_at: new Date(),
  }
}

export async function updateTemplate(
  tipo: string,
  data: { conteudo?: string; ativo?: boolean; com_imagem?: boolean; dias_antecedencia?: number | null },
) {
  await seedTemplates()
  const exists = await prisma.mensagemTemplate.findUnique({ where: { tipo } })
  if (!exists) throw new NotFoundError('Template não encontrado')
  return prisma.mensagemTemplate.update({ where: { tipo }, data })
}

/**
 * Renderiza a mensagem de um gatilho. Retorna null se o template está inativo
 * (nesse caso, a notificação não deve ser enviada).
 */
export async function renderMensagem(
  tipo: string,
  vars: Vars,
): Promise<{ texto: string; comImagem: boolean } | null> {
  const tpl = await getTemplate(tipo)
  if (!tpl.ativo) return null
  return { texto: render(tpl.conteudo, vars), comImagem: tpl.com_imagem }
}

/** Dias de antecedência configurados para o lembrete antecipado (default 1). */
export async function getDiasAntecedencia(): Promise<number> {
  const tpl = await getTemplate('lembrete_antecedencia')
  return tpl.dias_antecedencia ?? 1
}
