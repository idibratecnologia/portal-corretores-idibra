/**
 * Gestão de usuários administrativos (admins) — restrito ao super-admin.
 * Dois níveis: 'super' (dono, acesso total) e 'operador' (cria/edita/vê).
 */
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/hash'
import { NotFoundError, ConflictError, BadRequestError } from '@/lib/errors'
import type { CreateUsuarioInput, UpdateUsuarioInput } from './usuarios.schema'

const usuarioSelect = {
  id: true, nome: true, email: true, nivel: true, created_at: true,
} as const

export async function listUsuarios() {
  return prisma.admin.findMany({ select: usuarioSelect, orderBy: { nome: 'asc' } })
}

export async function createUsuario(input: CreateUsuarioInput) {
  const existe = await prisma.admin.findUnique({ where: { email: input.email }, select: { id: true } })
  if (existe) throw new ConflictError('Já existe um usuário com este e-mail')

  return prisma.admin.create({
    data: {
      nome:  input.nome,
      email: input.email,
      senha: await hashPassword(input.senha),
      nivel: input.nivel,
    },
    select: usuarioSelect,
  })
}

export async function updateUsuario(id: string, input: UpdateUsuarioInput) {
  const alvo = await prisma.admin.findUnique({ where: { id } })
  if (!alvo) throw new NotFoundError('Usuário não encontrado')

  // E-mail único (se mudou)
  if (input.email && input.email !== alvo.email) {
    const dup = await prisma.admin.findFirst({ where: { email: input.email, NOT: { id } }, select: { id: true } })
    if (dup) throw new ConflictError('Já existe um usuário com este e-mail')
  }

  // Não permitir rebaixar o último super
  if (input.nivel === 'operador' && alvo.nivel === 'super') {
    const supers = await prisma.admin.count({ where: { nivel: 'super' } })
    if (supers <= 1) throw new BadRequestError('É necessário pelo menos um administrador (super).')
  }

  return prisma.admin.update({
    where: { id },
    data: {
      ...(input.nome  !== undefined ? { nome: input.nome } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.nivel !== undefined ? { nivel: input.nivel } : {}),
      ...(input.senha ? { senha: await hashPassword(input.senha) } : {}),
    },
    select: usuarioSelect,
  })
}

export async function deleteUsuario(id: string, requesterId: string) {
  if (id === requesterId) {
    throw new BadRequestError('Você não pode excluir o seu próprio usuário.')
  }
  const alvo = await prisma.admin.findUnique({ where: { id } })
  if (!alvo) throw new NotFoundError('Usuário não encontrado')

  if (alvo.nivel === 'super') {
    const supers = await prisma.admin.count({ where: { nivel: 'super' } })
    if (supers <= 1) throw new BadRequestError('É necessário pelo menos um administrador (super).')
  }

  await prisma.admin.delete({ where: { id } })
  return { nome: alvo.nome }
}
