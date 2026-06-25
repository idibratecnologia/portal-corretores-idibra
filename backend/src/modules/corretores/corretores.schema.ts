import { z } from 'zod'

// ─── Filtros de listagem ─────────────────────────────────────────

export const listCorretoresSchema = z.object({
  search:         z.string().optional(),
  status:         z.enum(['pendente', 'ativo', 'bloqueado']).optional(),
  imobiliaria_id: z.string().uuid().optional(),
  page:           z.coerce.number().int().positive().optional(),
  limit:          z.coerce.number().int().positive().optional(),
  sort:           z.enum(['nome', 'creci', 'status', 'cidade', 'created_at']).optional(),
  order:          z.enum(['asc', 'desc']).optional(),
})

export type ListCorretoresInput = z.infer<typeof listCorretoresSchema>

// ─── Criação (pelo admin) ────────────────────────────────────────

export const createCorretorSchema = z.object({
  nome:           z.string().min(3, 'Nome muito curto'),
  cpf:            z.string().min(14, 'CPF inválido'),
  creci:          z.string().min(1, 'CRECI obrigatório'),
  email:          z.string().email('E-mail inválido'),
  senha:          z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional(),
  telefone:       z.string().optional(),   // legado — preenchido a partir do WhatsApp
  whatsapp:       z.string().min(14, 'WhatsApp inválido'),
  whatsapp_opt_in: z.boolean().optional(),
  email_opt_in:   z.boolean().optional(),
  instagram:      z.string().optional(),
  data_nascimento: z.coerce.date().optional().nullable()
                     .transform((d) => d ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0)) : d),
  cidade:         z.string().min(1, 'Cidade obrigatória'),
  uf:             z.string().length(2, 'UF inválida'),
  // Aceita '' (nenhuma imobiliária) tratando como null
  imobiliaria_id: z.preprocess((v) => (v === '' ? null : v), z.string().uuid().nullable().optional()),
  observacoes_admin: z.string().optional(),
})

// ─── Atualização ─────────────────────────────────────────────────

export const updateCorretorSchema = createCorretorSchema.partial().omit({ senha: true })

// Auto-edição (corretor logado): não pode mexer em campos administrativos
export const updateMeuPerfilSchema = updateCorretorSchema.omit({ observacoes_admin: true })

// ─── Status ──────────────────────────────────────────────────────

export const statusCorretorSchema = z.object({
  status: z.enum(['pendente', 'ativo', 'bloqueado']),
})

// ─── Opt-in WhatsApp ─────────────────────────────────────────────

export const optInSchema = z.object({
  whatsapp_opt_in: z.boolean(),
})

export type CreateCorretorInput = z.infer<typeof createCorretorSchema>
export type UpdateCorretorInput = z.infer<typeof updateCorretorSchema>
