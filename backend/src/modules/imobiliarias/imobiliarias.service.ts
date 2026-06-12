/**
 * Lógica de negócio das imobiliárias.
 */
import { prisma } from '@/lib/prisma'
import { NotFoundError, ConflictError } from '@/lib/errors'
import { saveImage, deleteImage } from '@/lib/storage'
import type { CreateImobiliariaInput, UpdateImobiliariaInput } from './imobiliarias.schema'

/**
 * Lista todas as imobiliárias com a contagem de corretores vinculados.
 */
export async function listImobiliarias() {
  const imobiliarias = await prisma.imobiliaria.findMany({
    orderBy: { nome: 'asc' },
    include: { _count: { select: { corretores: true } } },
  })

  // Mapeia _count para total_corretores (formato esperado pelo frontend)
  return imobiliarias.map(({ _count, ...imob }) => ({
    ...imob,
    total_corretores: _count.corretores,
  }))
}

/**
 * Lista pública (sem auth) — apenas imobiliárias ativas, campos mínimos.
 * Usada no cadastro público de corretores.
 */
export async function listImobiliariasPublicas() {
  return prisma.imobiliaria.findMany({
    where:   { status: 'ativa' },
    select:  { id: true, nome: true },
    orderBy: { nome: 'asc' },
  })
}

/**
 * Detalhe de uma imobiliária + corretores vinculados.
 */
export async function getImobiliariaById(id: string) {
  const imob = await prisma.imobiliaria.findUnique({
    where: { id },
    include: {
      corretores: {
        select: { id: true, nome: true, creci: true, status: true },
        orderBy: { nome: 'asc' },
      },
      _count: { select: { corretores: true } },
    },
  })

  if (!imob) throw new NotFoundError('Imobiliária não encontrada')

  const { _count, ...rest } = imob
  return { ...rest, total_corretores: _count.corretores }
}

export async function createImobiliaria(input: CreateImobiliariaInput) {
  const existing = await prisma.imobiliaria.findUnique({ where: { cnpj: input.cnpj } })
  if (existing) throw new ConflictError('CNPJ já cadastrado')

  return prisma.imobiliaria.create({
    data: {
      nome:     input.nome,
      cnpj:     input.cnpj,
      telefone: input.telefone,
      email:    input.email || null,
      cidade:   input.cidade,
      uf:       input.uf.toUpperCase(),
    },
  })
}

export async function updateImobiliaria(id: string, input: UpdateImobiliariaInput) {
  await ensureExists(id)

  // Se mudou o CNPJ, valida duplicidade
  if (input.cnpj) {
    const dup = await prisma.imobiliaria.findFirst({
      where: { cnpj: input.cnpj, NOT: { id } },
    })
    if (dup) throw new ConflictError('CNPJ já cadastrado em outra imobiliária')
  }

  return prisma.imobiliaria.update({
    where: { id },
    data: {
      ...input,
      email: input.email === '' ? null : input.email,
      uf:    input.uf ? input.uf.toUpperCase() : undefined,
    },
  })
}

export async function setStatus(id: string, status: 'ativa' | 'inativa') {
  await ensureExists(id)
  return prisma.imobiliaria.update({ where: { id }, data: { status } })
}

/**
 * Processa o upload da logo: salva como WebP (preservando proporção),
 * remove a anterior e atualiza o banco. Retorna a URL pública.
 */
export async function updateLogo(id: string, buffer: Buffer): Promise<{ logo_url: string }> {
  const imob = await prisma.imobiliaria.findUnique({ where: { id }, select: { logo_url: true } })
  if (!imob) throw new NotFoundError('Imobiliária não encontrada')

  const logo_url = await saveImage('logos', buffer)
  await deleteImage(imob.logo_url)

  await prisma.imobiliaria.update({ where: { id }, data: { logo_url } })
  return { logo_url }
}

/** Remove a logo da imobiliária. */
export async function removeLogo(id: string): Promise<void> {
  const imob = await prisma.imobiliaria.findUnique({ where: { id }, select: { logo_url: true } })
  if (!imob) throw new NotFoundError('Imobiliária não encontrada')

  await deleteImage(imob.logo_url)
  await prisma.imobiliaria.update({ where: { id }, data: { logo_url: null } })
}

/**
 * Exclui uma imobiliária. Os corretores vinculados têm imobiliaria_id zerado
 * (onDelete: SetNull no schema), não são excluídos.
 */
export async function deleteImobiliaria(id: string) {
  const imob = await prisma.imobiliaria.findUnique({ where: { id }, select: { nome: true, logo_url: true } })
  if (!imob) throw new NotFoundError('Imobiliária não encontrada')

  await prisma.imobiliaria.delete({ where: { id } })
  await deleteImage(imob.logo_url) // remove a logo do storage (evita arquivo órfão)
  return { nome: imob.nome }
}

// ─── Helpers ──────────────────────────────────────────────────────

async function ensureExists(id: string) {
  const exists = await prisma.imobiliaria.findUnique({ where: { id }, select: { id: true } })
  if (!exists) throw new NotFoundError('Imobiliária não encontrada')
}
