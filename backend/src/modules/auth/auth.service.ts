/**
 * Lógica de negócio da autenticação.
 * Faz login unificado (admin ou corretor), cadastro e refresh de tokens.
 */
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/hash'
import { signAccessToken, signRefreshToken, verifyToken } from '@/lib/jwt'
import { UnauthorizedError, ConflictError, ForbiddenError, BadRequestError } from '@/lib/errors'
import { notify } from '@/lib/notifications'
import { emitAdminRefresh } from '@/lib/events'
import { config } from '@/config'
import { getRegras } from '@/modules/configuracoes/configuracoes.service'
import type { LoginInput, CadastroInput } from './auth.schema'

interface AuthResult {
  access_token:  string
  refresh_token: string
  user: {
    id:   string
    nome: string
    role: 'admin' | 'corretor'
  }
}

/**
 * Login unificado: tenta autenticar como admin primeiro, depois como corretor.
 * Corretores bloqueados/pendentes não conseguem logar.
 */
export async function login({ email, senha }: LoginInput): Promise<AuthResult> {
  // 1. Tenta como admin
  const admin = await prisma.admin.findUnique({ where: { email } })
  if (admin) {
    const ok = await verifyPassword(senha, admin.senha)
    if (!ok) throw new UnauthorizedError('E-mail ou senha inválidos')

    return buildAuthResult(admin.id, admin.nome, 'admin', admin.nivel)
  }

  // 2. Tenta como corretor
  const corretor = await prisma.corretor.findUnique({ where: { email } })
  if (corretor) {
    const ok = await verifyPassword(senha, corretor.senha)
    if (!ok) throw new UnauthorizedError('E-mail ou senha inválidos')

    if (corretor.status === 'pendente') {
      throw new ForbiddenError('Seu cadastro está em análise. Aguarde a aprovação.')
    }
    if (corretor.status === 'bloqueado') {
      throw new ForbiddenError('Sua conta está bloqueada. Entre em contato com a IDIBRA.')
    }

    return buildAuthResult(corretor.id, corretor.nome, 'corretor')
  }

  // Mensagem genérica para não revelar se o e-mail existe
  throw new UnauthorizedError('E-mail ou senha inválidos')
}

/**
 * Auto-cadastro de corretor (público). Nasce com status 'pendente'.
 */
export async function cadastrarCorretor(input: CadastroInput): Promise<{ id: string }> {
  // Verifica duplicidade de e-mail, CPF e CRECI
  const existing = await prisma.corretor.findFirst({
    where: {
      OR: [
        { email: input.email },
        { cpf:   input.cpf },
        { creci: input.creci },
      ],
    },
  })
  if (existing) {
    if (existing.email === input.email) throw new ConflictError('E-mail já cadastrado')
    if (existing.cpf   === input.cpf)   throw new ConflictError('CPF já cadastrado')
    throw new ConflictError('CRECI já cadastrado')
  }

  const senhaHash = await hashPassword(input.senha)

  // Respeita a configuração de aprovação automática
  const { auto_approve } = await getRegras()

  const corretor = await prisma.corretor.create({
    data: {
      nome:            input.nome,
      cpf:             input.cpf,
      creci:           input.creci,
      email:           input.email,
      senha:           senhaHash,
      telefone:        input.telefone,
      whatsapp:        input.whatsapp,
      whatsapp_opt_in: input.whatsapp_opt_in ?? false,
      instagram:       input.instagram,
      cidade:          input.cidade,
      uf:              input.uf.toUpperCase(),
      imobiliaria_id:  input.imobiliaria_id,
      status:          auto_approve ? 'ativo' : 'pendente',
    },
    select: { id: true },
  })

  // Sinaliza aos admins conectados (SSE) que há um novo cadastro — tempo real.
  emitAdminRefresh('corretor-cadastro')

  return corretor
}

/**
 * Gera um novo access token a partir de um refresh token válido.
 */
export async function refresh(refreshToken: string): Promise<{ access_token: string }> {
  const payload = verifyToken(refreshToken)

  // Revalida que o usuário ainda existe e está ativo
  if (payload.role === 'admin') {
    const admin = await prisma.admin.findUnique({ where: { id: payload.sub } })
    if (!admin) throw new UnauthorizedError('Usuário não encontrado')
    return { access_token: signAccessToken({ sub: admin.id, role: 'admin', nome: admin.nome, nivel: admin.nivel }) }
  }

  const corretor = await prisma.corretor.findUnique({ where: { id: payload.sub } })
  if (!corretor || corretor.status !== 'ativo') {
    throw new UnauthorizedError('Usuário não encontrado ou inativo')
  }
  return { access_token: signAccessToken({ sub: corretor.id, role: 'corretor', nome: corretor.nome }) }
}

/**
 * Retorna os dados do admin logado (rota /auth/me para admin).
 */
export async function getAdminMe(adminId: string) {
  const admin = await prisma.admin.findUnique({
    where:  { id: adminId },
    select: { id: true, nome: true, email: true, nivel: true, created_at: true },
  })
  if (!admin) throw new UnauthorizedError('Administrador não encontrado')
  return admin
}

// ─── Troca de senha (usuário logado) ─────────────────────────────

export async function trocarSenha(
  userId: string,
  role: 'admin' | 'corretor',
  senhaAtual: string,
  novaSenha: string,
): Promise<void> {
  if (role === 'admin') {
    const admin = await prisma.admin.findUnique({ where: { id: userId } })
    if (!admin) throw new UnauthorizedError('Usuário não encontrado')
    if (!(await verifyPassword(senhaAtual, admin.senha))) {
      throw new BadRequestError('Senha atual incorreta')
    }
    await prisma.admin.update({ where: { id: userId }, data: { senha: await hashPassword(novaSenha) } })
    return
  }

  const corretor = await prisma.corretor.findUnique({ where: { id: userId } })
  if (!corretor) throw new UnauthorizedError('Usuário não encontrado')
  if (!(await verifyPassword(senhaAtual, corretor.senha))) {
    throw new BadRequestError('Senha atual incorreta')
  }
  await prisma.corretor.update({ where: { id: userId }, data: { senha: await hashPassword(novaSenha) } })
}

// ─── Esqueci minha senha (público) ───────────────────────────────

/**
 * Gera um token de reset e dispara o link por WhatsApp (corretor).
 * Sempre retorna sucesso genérico para não revelar se o e-mail existe (anti-enumeração).
 * A entrega real por WhatsApp é ativada no Bloco 4; por ora o token é logado/registrado.
 */
export async function esqueciSenha(email: string): Promise<void> {
  const admin = await prisma.admin.findUnique({ where: { email } })
  const corretor = admin ? null : await prisma.corretor.findUnique({ where: { email } })

  // E-mail não encontrado → retorna silenciosamente (sem enumeração)
  if (!admin && !corretor) return

  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

  await prisma.passwordReset.create({
    data: { email, token, expires_at: expires },
  })

  const link = `${config.portalUrl}/resetar-senha?token=${token}`

  // Entrega via WhatsApp (corretor com opt-in). Em dev sem Evolution, o stub loga.
  if (corretor) {
    await notify({
      corretorId: corretor.id,
      tipo:       'aprovacao', // reusa o canal; tipo específico pode ser criado no Bloco 4
      whatsapp:   corretor.whatsapp,
      optIn:      true, // reset de senha é transacional — sempre envia
      mensagem:
        `🔑 *Redefinição de senha*\n\nOlá, ${corretor.nome}! Recebemos um pedido para redefinir sua senha.\n\n` +
        `Acesse o link para criar uma nova senha (válido por 1 hora):\n${link}\n\n` +
        `Se não foi você, ignore esta mensagem.`,
    })
  }

  // Log para o operador conseguir o token em dev (até o WhatsApp estar ativo)
  console.log(`[reset-senha] ${email} → ${link}`)
}

// ─── Resetar senha com token ─────────────────────────────────────

export async function resetarSenha(token: string, novaSenha: string): Promise<void> {
  const reset = await prisma.passwordReset.findUnique({ where: { token } })

  if (!reset || reset.used || reset.expires_at < new Date()) {
    throw new BadRequestError('Token inválido ou expirado')
  }

  const senhaHash = await hashPassword(novaSenha)

  const admin = await prisma.admin.findUnique({ where: { email: reset.email } })
  if (admin) {
    await prisma.admin.update({ where: { id: admin.id }, data: { senha: senhaHash } })
  } else {
    const corretor = await prisma.corretor.findUnique({ where: { email: reset.email } })
    if (!corretor) throw new BadRequestError('Usuário não encontrado')
    await prisma.corretor.update({ where: { id: corretor.id }, data: { senha: senhaHash } })
  }

  await prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } })
}

// ─── Helpers ──────────────────────────────────────────────────────

function buildAuthResult(
  id: string,
  nome: string,
  role: 'admin' | 'corretor',
  nivel?: 'super' | 'operador',
): AuthResult {
  return {
    access_token:  signAccessToken({ sub: id, role, nome, nivel }),
    refresh_token: signRefreshToken({ sub: id, role }),
    user: { id, nome, role },
  }
}
