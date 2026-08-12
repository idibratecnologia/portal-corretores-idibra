export type StatusCorretor = 'ativo' | 'pendente' | 'bloqueado' | 'inativo'
export type StatusImobiliaria = 'ativa' | 'inativa'
export type StatusEvento = 'rascunho' | 'publicado' | 'encerrado' | 'cancelado'
export type StatusInscricao = 'inscrito' | 'presente' | 'ausente' | 'cancelado'
// Valores SEM acento — devem casar exatamente com o enum do backend/Prisma.
export type TipoEvento = 'lancamento' | 'treinamento' | 'reuniao' | 'feira' | 'workshop' | 'outro'

// Rótulos exibidos ao usuário (com acentuação correta).
export const TIPO_EVENTO_LABELS: Record<TipoEvento, string> = {
  lancamento:  'Lançamento',
  treinamento: 'Treinamento',
  reuniao:     'Reunião',
  feira:       'Feira',
  workshop:    'Workshop',
  outro:       'Outro',
}

export interface Imobiliaria {
  id: string
  nome: string
  cnpj: string
  telefone: string
  email: string
  cidade: string
  uf: string
  logo_url?: string
  status: StatusImobiliaria
  created_at: string
  total_corretores?: number
}

export interface Corretor {
  id: string
  nome: string
  cpf: string
  creci: string
  email: string
  telefone?: string
  whatsapp: string
  whatsapp_opt_in?: boolean
  email_opt_in?: boolean
  senha_provisoria?: boolean
  foto_url?: string
  imobiliaria_id?: string
  imobiliaria?: Imobiliaria
  cidade: string
  uf: string
  instagram?: string
  data_nascimento?: string | null
  status: StatusCorretor
  observacoes_admin?: string
  created_at: string
  updated_at: string
  total_eventos?: number
}

export interface Evento {
  id: string
  titulo: string
  descricao: string
  tipo: TipoEvento
  empreendimento?: string
  local: string
  endereco: string
  link_maps?: string
  data_evento: string
  hora_inicio: string
  hora_fim: string
  capacidade: number
  banner_url?: string
  status: StatusEvento
  inscricoes_abertas: boolean
  carga_horaria?: number | null
  certificados_habilitados?: boolean
  enviar_certificado_auto?: boolean
  certificados_enviados_em?: string | null
  exclusivo?: boolean
  convidados_ids?: string[]
  link_exclusivo?: string | null
  criado_por?: string
  created_at: string
  updated_at: string
  total_inscritos?: number
  total_presentes?: number
}

export interface EventoMaterial {
  id: string
  evento_id: string
  tipo: 'arquivo' | 'link'
  titulo: string
  url: string
  created_at: string
}

export interface EventoInscricao {
  id: string
  evento_id: string
  evento?: Evento
  corretor_id: string
  corretor?: Corretor
  status: StatusInscricao
  qr_code_token: string
  checkin_at?: string
  checkin_por?: string
  observacao?: string
  created_at: string
}

export type NivelAdmin = 'super' | 'operador'

export interface AdminUser {
  id: string
  nome: string
  email: string
  nivel: NivelAdmin
  perfil?: 'admin' | 'superadmin'
  ativo?: boolean
  created_at: string
}

export interface DashboardStats {
  total_corretores: number
  eventos_ativos: number
  inscricoes_abertas: number
  participacoes_confirmadas: number
  corretores_pendentes: number
  taxa_media_presenca: number
}

export interface ParticipacaoEvento {
  evento: string
  inscritos: number
  presentes: number
}

export interface InscricoesMes {
  mes: string
  inscricoes: number
}

export interface CorretorParticipativo {
  nome: string
  participacoes: number
}

export interface ParticipacaoImobiliaria {
  imobiliaria: string
  participacoes: number
}
