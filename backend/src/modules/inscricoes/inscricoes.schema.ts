import { z } from 'zod'

export const listInscricoesSchema = z.object({
  evento_id:   z.string().uuid().optional(),
  corretor_id: z.string().uuid().optional(),
})

export const createInscricaoSchema = z.object({
  evento_id: z.string().uuid('Evento inválido'),
})

export const checkinSchema = z.object({
  qr_token: z.string().min(1, 'Token obrigatório'),
})

export type ListInscricoesInput = z.infer<typeof listInscricoesSchema>
export type CreateInscricaoInput = z.infer<typeof createInscricaoSchema>
