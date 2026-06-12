import { z } from 'zod'

const tipoEvento = z.enum(['lancamento', 'treinamento', 'reuniao', 'feira', 'workshop', 'outro'])

export const listEventosSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['rascunho', 'publicado', 'encerrado', 'cancelado']).optional(),
  tipo:   tipoEvento.optional(),
  page:   z.coerce.number().int().positive().optional(),
  limit:  z.coerce.number().int().positive().optional(),
  sort:   z.enum(['titulo', 'data_evento', 'status', 'created_at']).optional(),
  order:  z.enum(['asc', 'desc']).optional(),
})

export type ListEventosInput = z.infer<typeof listEventosSchema>

export const createEventoSchema = z.object({
  titulo:            z.string().min(3, 'Título muito curto'),
  descricao:         z.string().optional(),
  tipo:              tipoEvento,
  empreendimento:    z.string().optional(),
  local:             z.string().min(1, 'Local obrigatório'),
  endereco:          z.string().min(1, 'Endereço obrigatório'),
  link_maps:         z.string().url('Link inválido').optional().or(z.literal('')),
  // Data-only (yyyy-mm-dd) é normalizada para meio-dia UTC: assim a exibição em
  // qualquer fuso (ex.: America/Sao_Paulo, UTC-3) mantém o mesmo dia escolhido.
  data_evento:       z.coerce.date().transform((d) =>
                       new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0)),
                     ),
  hora_inicio:       z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  hora_fim:          z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  capacidade:        z.coerce.number().int().positive('Capacidade deve ser positiva'),
  inscricoes_abertas: z.boolean().optional(),
  certificados_habilitados: z.boolean().optional(),
})

export const updateEventoSchema = createEventoSchema.partial()

export const statusEventoSchema = z.object({
  status: z.enum(['rascunho', 'publicado', 'encerrado', 'cancelado']),
})

export type CreateEventoInput = z.infer<typeof createEventoSchema>
export type UpdateEventoInput = z.infer<typeof updateEventoSchema>
