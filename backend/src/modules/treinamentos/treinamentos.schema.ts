import { z } from 'zod'

const dataOpcional = z.coerce.date().optional().nullable()
  .transform((d) => (d ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0)) : d))

// ─── Treinamento (container) ──────────────────────────────────────
export const createTreinamentoSchema = z.object({
  titulo:               z.string().min(2, 'Título obrigatório'),
  descricao:            z.string().optional(),
  obrigatorio:          z.boolean().optional(),
  liberacao_sequencial: z.boolean().optional(),
  avulso:               z.boolean().optional(),
  // Certificado de conclusão
  certificado_habilitado:  z.boolean().optional(),
  carga_horaria:           z.coerce.number().positive('Carga horária inválida').max(1000, 'Carga horária inválida').optional().nullable(),
  certificado_auto_enviar: z.boolean().optional(),
  certificado_modelo_id:   z.string().uuid('Modelo inválido').optional().nullable(),
})

export const updateTreinamentoSchema = createTreinamentoSchema.partial().extend({
  ativo: z.boolean().optional(),
})

export const listTreinamentosSchema = z.object({
  search: z.string().optional(),
  ativo:  z.enum(['true', 'false']).optional(),
})

// ─── Aula (vídeo) ─────────────────────────────────────────────────
export const createAulaSchema = z.object({
  titulo:            z.string().min(2, 'Título obrigatório'),
  descricao:         z.string().optional(),
  data_liberacao:    dataOpcional,
  data_encerramento: dataOpcional,
  excluir_video_automaticamente: z.boolean().optional(),
  dias_para_exclusao: z.coerce.number().int().nonnegative('Valor inválido').optional().nullable(),
})

export const updateAulaSchema = createAulaSchema.partial()

export const ordenarSchema = z.object({
  ordem: z.array(z.string().uuid()),
})

export const progressoSchema = z.object({
  segundos: z.coerce.number().int().nonnegative(),
})

export const vincularEventoSchema = z.object({
  evento_id:   z.string().uuid('evento_id inválido'),
  obrigatorio: z.boolean().optional(),
})
