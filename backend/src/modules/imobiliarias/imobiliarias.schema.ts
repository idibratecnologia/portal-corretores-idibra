import { z } from 'zod'

export const createImobiliariaSchema = z.object({
  nome:     z.string().min(2, 'Nome obrigatório'),
  cnpj:     z.string().min(14, 'CNPJ inválido'),   // formatado: 00.000.000/0001-00
  telefone: z.string().optional(),
  email:    z.string().email('E-mail inválido').optional().or(z.literal('')),
  cidade:   z.string().min(1, 'Cidade obrigatória'),
  uf:       z.string().length(2, 'UF inválida'),
})

export const updateImobiliariaSchema = createImobiliariaSchema.partial()

export const statusImobiliariaSchema = z.object({
  status: z.enum(['ativa', 'inativa']),
})

export type CreateImobiliariaInput = z.infer<typeof createImobiliariaSchema>
export type UpdateImobiliariaInput = z.infer<typeof updateImobiliariaSchema>
