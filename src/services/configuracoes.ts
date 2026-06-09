import { api } from '@/lib/api'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export interface Configuracao {
  empresa_nome:     string
  empresa_email:    string
  empresa_telefone: string
  empresa_site:     string
  auto_approve:     boolean
  notify_inscricao: boolean
  allow_cancel:     boolean
}

const MOCK_CONFIG: Configuracao = {
  empresa_nome:     'IDIBRA',
  empresa_email:    'contato@idibra.com.br',
  empresa_telefone: '(11) 9999-9999',
  empresa_site:     'https://www.idibra.com.br',
  auto_approve:     false,
  notify_inscricao: true,
  allow_cancel:     true,
}

export async function fetchConfiguracao(): Promise<Configuracao> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    return MOCK_CONFIG
  }
  return api.get<Configuracao>('/configuracoes')
}

export async function updateConfiguracao(data: Partial<Configuracao>): Promise<Configuracao> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500))
    return { ...MOCK_CONFIG, ...data }
  }
  return api.patch<Configuracao>('/configuracoes', data)
}
