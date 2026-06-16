/**
 * Schemas Zod de request/response do módulo de autenticação.
 */
import { z } from 'zod'

/** Idade completa (em anos) a partir da data de nascimento. */
function calcularIdade(d: Date): number {
  const hoje = new Date()
  let idade = hoje.getFullYear() - d.getFullYear()
  const m = hoje.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) idade--
  return idade
}

// ─── Login ────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
})

export type LoginInput = z.infer<typeof loginSchema>

// ─── Cadastro de corretor (auto-registro público) ────────────────

export const cadastroSchema = z.object({
  nome:           z.string().min(3, 'Nome muito curto'),
  cpf:            z.string().min(14, 'CPF inválido'),      // formatado: 000.000.000-00
  creci:          z.string().min(1, 'CRECI obrigatório'),
  email:          z.string().email('E-mail inválido'),
  senha:          z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  telefone:       z.string().min(14, 'Telefone inválido'),
  whatsapp:       z.string().min(14, 'WhatsApp inválido'),
  whatsapp_opt_in: z.boolean().optional().default(false),
  instagram:      z.string().optional(),
  data_nascimento: z.coerce.date({ errorMap: () => ({ message: 'Data de nascimento obrigatória' }) })
                     .refine((d) => calcularIdade(d) >= 18, 'É necessário ter 18 anos ou mais para se cadastrar')
                     .transform((d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0))),
  cidade:         z.string().min(1, 'Cidade obrigatória'),
  uf:             z.string().length(2, 'UF inválida'),
  imobiliaria_id: z.string().uuid().optional(),
})

export type CadastroInput = z.infer<typeof cadastroSchema>

// ─── Refresh ──────────────────────────────────────────────────────

export const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token obrigatório'),
})

export type RefreshInput = z.infer<typeof refreshSchema>

// ─── Troca de senha (usuário logado) ─────────────────────────────

export const trocarSenhaSchema = z.object({
  senha_atual: z.string().min(1, 'Senha atual obrigatória'),
  nova_senha:  z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
})

// ─── Esqueci minha senha (público) ───────────────────────────────

export const esqueciSenhaSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

// ─── Resetar senha com token (público) ───────────────────────────

export const resetarSenhaSchema = z.object({
  token:      z.string().min(1, 'Token obrigatório'),
  nova_senha: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
})
