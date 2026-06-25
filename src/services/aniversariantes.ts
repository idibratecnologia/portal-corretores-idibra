import { api } from '@/lib/api'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export interface Aniversariante {
  id: string
  nome: string
  data_nascimento: string
  dia: number
  mes: number
  idade: number | null
  cidade: string | null
  uf: string | null
  whatsapp: string
  email: string | null
  whatsapp_opt_in: boolean
  email_opt_in: boolean
}

export async function fetchAniversariantes(mes?: number): Promise<Aniversariante[]> {
  if (USE_MOCK) return []
  return api.get<Aniversariante[]>('/aniversariantes', mes ? { mes } : undefined)
}

export async function felicitarCorretor(id: string): Promise<void> {
  await api.post(`/aniversariantes/${id}/felicitar`, {})
}
