import { api } from '@/lib/api'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

/** Troca a senha do usuário logado. */
export async function trocarSenha(senha_atual: string, nova_senha: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500))
    if (senha_atual === 'errada') throw new Error('Senha atual incorreta')
    return
  }
  await api.post('/auth/trocar-senha', { senha_atual, nova_senha })
}

/** Solicita redefinição de senha (público). Sempre resolve (anti-enumeração). */
export async function esqueciSenha(email: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500))
    return
  }
  await api.post('/auth/esqueci-senha', { email })
}

/** Redefine a senha usando o token recebido. */
export async function resetarSenha(token: string, nova_senha: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500))
    return
  }
  await api.post('/auth/resetar-senha', { token, nova_senha })
}

/** Admin solicita o reset: envia o link de redefinição pelo WhatsApp do corretor. */
export async function resetarSenhaCorretor(id: string): Promise<{ enviado: boolean; whatsapp: string }> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500))
    return { enviado: true, whatsapp: '(00) 00000-0000' }
  }
  return api.post<{ enviado: boolean; whatsapp: string }>(`/corretores/${id}/resetar-senha`, {})
}
