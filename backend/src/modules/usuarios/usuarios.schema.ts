import { z } from 'zod'

export const createUsuarioSchema = z.object({
  nome:  z.string().min(3, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  nivel: z.enum(['super', 'operador']).default('operador'),
})

export const updateUsuarioSchema = z.object({
  nome:  z.string().min(3).optional(),
  email: z.string().email('E-mail inválido').optional(),
  nivel: z.enum(['super', 'operador']).optional(),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional(),
})

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>
export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>
