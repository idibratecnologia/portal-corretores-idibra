import { api } from '@/lib/api'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export interface MensagemTemplate {
  id:                string
  tipo:              string
  titulo:            string
  descricao:         string
  conteudo:          string
  ativo:             boolean
  com_imagem:        boolean
  dias_antecedencia: number | null
  updated_at:        string
  placeholders:      string[]
}

export interface UpdateTemplateInput {
  conteudo?:          string
  ativo?:             boolean
  com_imagem?:        boolean
  dias_antecedencia?: number | null
}

const MOCK_TEMPLATES: MensagemTemplate[] = [
  {
    id: '1', tipo: 'evento_novo', titulo: 'Novo evento publicado',
    descricao: 'Enviado a todos os corretores ativos quando um evento é publicado.',
    ativo: true, com_imagem: true, dias_antecedencia: null,
    updated_at: new Date().toISOString(),
    placeholders: ['nome', 'evento', 'descricao', 'data', 'hora', 'hora_fim', 'local', 'endereco', 'empreendimento', 'vagas', 'link'],
    conteudo: '🎉 *NOVO EVENTO IDIBRA* 🎉\n\n*{{evento}}*\n{{descricao}}\n\n📅 *Data:* {{data}}\n🕐 *Horário:* {{hora}} às {{hora_fim}}\n📍 *Local:* {{local}}\n🔗 *Inscreva-se:* {{link}}',
  },
  {
    id: '2', tipo: 'lembrete_antecedencia', titulo: 'Lembrete (dias antes)',
    descricao: 'Enviado X dias antes do evento aos inscritos (configure os dias).',
    ativo: true, com_imagem: false, dias_antecedencia: 1,
    updated_at: new Date().toISOString(),
    placeholders: ['nome', 'evento', 'data', 'hora', 'local', 'dias'],
    conteudo: '🔔 *Lembrete de evento*\n\nOlá, {{nome}}! Faltam *{{dias}}* dia(s) para o evento *{{evento}}*.',
  },
]

export async function fetchTemplates(): Promise<MensagemTemplate[]> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    return MOCK_TEMPLATES
  }
  return api.get<MensagemTemplate[]>('/templates')
}

export async function updateTemplate(tipo: string, data: UpdateTemplateInput): Promise<MensagemTemplate> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400))
    const t = MOCK_TEMPLATES.find((x) => x.tipo === tipo)!
    return { ...t, ...data, updated_at: new Date().toISOString() }
  }
  return api.patch<MensagemTemplate>(`/templates/${tipo}`, data)
}
