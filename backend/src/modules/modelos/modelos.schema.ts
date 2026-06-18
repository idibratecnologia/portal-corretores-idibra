import { z } from 'zod'

export const tipoModelo = z.enum(['credenciamento', 'cracha', 'certificado'])

export const createModeloSchema = z.object({
  nome:        z.string().min(2, 'Nome obrigatório'),
  descricao:   z.string().optional(),
  tipo:        tipoModelo,
  largura:     z.coerce.number().int().positive('Largura inválida').max(10000),
  altura:      z.coerce.number().int().positive('Altura inválida').max(10000),
  canvas_json: z.unknown().optional(),   // serialização do Fabric.js
  ativo:       z.boolean().optional(),
})

export const updateModeloSchema = createModeloSchema.partial()

export const listModelosSchema = z.object({
  tipo:   tipoModelo.optional(),
  ativo:  z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
})

export const vincularModeloSchema = z.object({
  modelo_id: z.string().uuid('modelo_id inválido'),
})

export type CreateModeloInput = z.infer<typeof createModeloSchema>
export type UpdateModeloInput = z.infer<typeof updateModeloSchema>
