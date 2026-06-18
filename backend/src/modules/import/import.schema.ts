import { z } from 'zod'

// ─── Helpers de normalização (BR) ────────────────────────────────

const digits = (s: string) => s.replace(/\D/g, '')

export function formatCpf(raw: string): string {
  const d = digits(raw)
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatCnpj(raw: string): string {
  const d = digits(raw)
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export function formatPhone(raw: string): string {
  const d = digits(raw)
  return d.length <= 10
    ? d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
    : d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}

/** Converte "sim/não/true/1/x" em boolean. Vazio = false. */
function parseSimNao(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  const s = String(v ?? '').trim().toLowerCase()
  return ['sim', 's', 'true', '1', 'x', 'yes'].includes(s)
}

// ─── Campos reutilizáveis ────────────────────────────────────────

const cpf = z.string().trim().min(1, 'CPF obrigatório')
  .transform(digits).refine((d) => d.length === 11, 'CPF deve ter 11 dígitos').transform(formatCpf)

const cnpj = z.string().trim().min(1, 'CNPJ obrigatório')
  .transform(digits).refine((d) => d.length === 14, 'CNPJ deve ter 14 dígitos').transform(formatCnpj)

const cnpjOpcional = z.string().trim().optional()
  .transform((s) => (s ? digits(s) : ''))
  .refine((d) => d === '' || d.length === 14, 'CNPJ da imobiliária deve ter 14 dígitos')
  .transform((d) => (d ? formatCnpj(d) : ''))

const telefone = z.string().trim().min(1, 'Telefone obrigatório')
  .transform(digits).refine((d) => d.length >= 10 && d.length <= 11, 'Telefone inválido').transform(formatPhone)

const uf = z.string().trim().length(2, 'UF deve ter 2 letras').transform((s) => s.toUpperCase())

const emailOpcional = z.string().trim().email('E-mail inválido').optional().or(z.literal(''))

// ─── Linha: Imobiliária ──────────────────────────────────────────

export const imobiliariaRowSchema = z.object({
  nome:     z.string().trim().min(2, 'Nome obrigatório'),
  cnpj,
  telefone: telefone.optional().or(z.literal('')),
  email:    emailOpcional,
  cidade:   z.string().trim().min(1, 'Cidade obrigatória'),
  uf,
})
export type ImobiliariaRow = z.infer<typeof imobiliariaRowSchema>

// ─── Linha: Corretor ─────────────────────────────────────────────

export const corretorRowSchema = z.object({
  nome:             z.string().trim().min(3, 'Nome muito curto'),
  cpf,
  creci:            z.string().trim().min(1, 'CRECI obrigatório'),
  email:            z.string().trim().email('E-mail inválido'),
  telefone:         telefone.optional().or(z.literal('')),   // opcional (legado)
  whatsapp:         telefone,                                 // obrigatório
  cidade:           z.string().trim().min(1, 'Cidade obrigatória'),
  uf,
  instagram:        z.string().trim().optional(),
  cnpj_imobiliaria: cnpjOpcional,
  aceita_whatsapp:  z.preprocess(parseSimNao, z.boolean()),
})
export type CorretorRow = z.infer<typeof corretorRowSchema>

// ─── Normalização de cabeçalhos (aceita variações de digitação) ──

const HEADER_ALIASES: Record<string, string> = {
  nome: 'nome',
  cnpj: 'cnpj',
  telefone: 'telefone', tel: 'telefone', fone: 'telefone',
  email: 'email', e_mail: 'email',
  cidade: 'cidade',
  uf: 'uf', estado: 'uf',
  cpf: 'cpf',
  creci: 'creci',
  whatsapp: 'whatsapp', whats: 'whatsapp', whats_app: 'whatsapp',
  instagram: 'instagram', insta: 'instagram',
  cnpj_imobiliaria: 'cnpj_imobiliaria', cnpj_da_imobiliaria: 'cnpj_imobiliaria', imobiliaria_cnpj: 'cnpj_imobiliaria',
  aceita_whatsapp: 'aceita_whatsapp', aceita_whats: 'aceita_whatsapp', whatsapp_opt_in: 'aceita_whatsapp', aceita_notificacoes: 'aceita_whatsapp',
}

function normKey(key: string): string {
  const base = key.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return HEADER_ALIASES[base] ?? base
}

/** Reescreve as chaves de uma linha bruta para as chaves canônicas. */
export function normalizeRow(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    out[normKey(k)] = typeof v === 'string' ? v.trim() : v
  }
  return out
}
