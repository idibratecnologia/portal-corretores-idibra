/**
 * Catálogo de variáveis dinâmicas dos modelos visuais + dados fictícios p/ preview.
 * As variáveis de texto entram no canvas como token "{{chave}}".
 * As de imagem ({{foto_participante}}, {{qr_code}}) entram como objeto especial.
 */
export type VariavelTipo = 'texto' | 'imagem'

export interface Variavel {
  chave: string        // ex.: 'nome_corretor' (sem chaves)
  label: string
  tipo: VariavelTipo
}

export interface GrupoVariaveis {
  titulo: string
  itens: Variavel[]
}

export const GRUPOS_VARIAVEIS: GrupoVariaveis[] = [
  {
    titulo: 'Participante',
    itens: [
      { chave: 'nome_corretor', label: 'Nome', tipo: 'texto' },
      { chave: 'email_corretor', label: 'E-mail', tipo: 'texto' },
      { chave: 'cpf_corretor', label: 'CPF', tipo: 'texto' },
      { chave: 'creci_corretor', label: 'CRECI', tipo: 'texto' },
      { chave: 'telefone_corretor', label: 'Telefone', tipo: 'texto' },
      { chave: 'empresa_corretor', label: 'Empresa/Imobiliária', tipo: 'texto' },
      { chave: 'categoria_participante', label: 'Categoria', tipo: 'texto' },
      { chave: 'foto_participante', label: 'Foto', tipo: 'imagem' },
    ],
  },
  {
    titulo: 'Evento',
    itens: [
      { chave: 'nome_evento', label: 'Nome do evento', tipo: 'texto' },
      { chave: 'data_evento', label: 'Data', tipo: 'texto' },
      { chave: 'hora_evento', label: 'Horário', tipo: 'texto' },
      { chave: 'local_evento', label: 'Local', tipo: 'texto' },
      { chave: 'empreendimento', label: 'Empreendimento', tipo: 'texto' },
      { chave: 'cidade_evento', label: 'Cidade', tipo: 'texto' },
      { chave: 'descricao_evento', label: 'Descrição', tipo: 'texto' },
    ],
  },
  {
    titulo: 'Controle',
    itens: [
      { chave: 'status_presenca', label: 'Status de presença', tipo: 'texto' },
      { chave: 'codigo_validacao', label: 'Código de validação', tipo: 'texto' },
      { chave: 'numero_inscricao', label: 'Nº de inscrição', tipo: 'texto' },
      { chave: 'qr_code', label: 'QR Code', tipo: 'imagem' },
      { chave: 'url_validacao', label: 'URL de validação', tipo: 'texto' },
      { chave: 'data_emissao', label: 'Data de emissão', tipo: 'texto' },
      { chave: 'carga_horaria', label: 'Carga horária', tipo: 'texto' },
      { chave: 'nome_instrutor', label: 'Instrutor', tipo: 'texto' },
    ],
  },
]

/** token "{{chave}}" */
export const token = (chave: string) => `{{${chave}}}`

/** Dados fictícios para a pré-visualização do modelo (Fase 3). */
export const DADOS_FICTICIOS: Record<string, string> = {
  nome_corretor: 'Elias Test',
  email_corretor: 'elias.test@email.com',
  cpf_corretor: '123.456.789-09',
  creci_corretor: '123455',
  telefone_corretor: '(85) 99999-0000',
  empresa_corretor: 'Imobiliária Exemplo',
  categoria_participante: 'Corretor',
  nome_evento: 'Teste de evento',
  data_evento: '18/06/2026',
  hora_evento: '09:00',
  local_evento: 'Idibra Garden Fátima',
  empreendimento: 'Idibra Garden',
  cidade_evento: 'Fortaleza',
  descricao_evento: 'Lançamento imobiliário IDIBRA',
  status_presenca: 'PRESENÇA CONFIRMADA',
  codigo_validacao: 'ABC123XYZ',
  numero_inscricao: '0001',
  url_validacao: 'https://corretoridibra.com.br/validar/ABC123XYZ',
  data_emissao: '18/06/2026',
  carga_horaria: '4h',
  nome_instrutor: 'Cadu Serra',
}

/** Substitui todos os tokens {{...}} num texto pelos valores fornecidos (fallback: ''). */
export function substituirTokens(texto: string, dados: Record<string, string>): string {
  return texto.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, chave) => dados[chave] ?? '')
}
