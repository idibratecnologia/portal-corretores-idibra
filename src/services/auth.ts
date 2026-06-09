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

/** Admin reseta a senha de um corretor — retorna a senha temporária. */
export async function resetarSenhaCorretor(id: string): Promise<{ senha_temporaria: string }> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500))
    return { senha_temporaria: 'temp1234' }
  }
  return api.post<{ senha_temporaria: string }>(`/corretores/${id}/resetar-senha`, {})
}
