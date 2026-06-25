/**
 * Templates padrão das notificações. Usados no seed e como fallback
 * caso algum template ainda não exista no banco.
 *
 * Placeholders disponíveis (substituídos no envio): {{nome}}, {{evento}},
 * {{descricao}}, {{data}}, {{hora}}, {{hora_fim}}, {{local}}, {{endereco}},
 * {{empreendimento}}, {{vagas}}, {{link}}, {{dias}}.
 */
export interface TemplateDefault {
  tipo: string
  titulo: string
  descricao: string
  conteudo: string
  com_imagem: boolean
  dias_antecedencia?: number
  placeholders: string[]
}

export const TEMPLATES_DEFAULT: TemplateDefault[] = [
  {
    tipo: 'evento_novo',
    titulo: 'Novo evento publicado',
    descricao: 'Enviado a todos os corretores ativos quando um evento é publicado.',
    com_imagem: true,
    placeholders: ['nome', 'evento', 'descricao', 'data', 'hora', 'hora_fim', 'local', 'endereco', 'empreendimento', 'vagas', 'link'],
    conteudo:
`🎉 *NOVO EVENTO IDIBRA* 🎉

*{{evento}}*
{{descricao}}

📅 *Data:* {{data}}
🕐 *Horário:* {{hora}} às {{hora_fim}}
📍 *Local:* {{local}}
🗺️ *Endereço:* {{endereco}}
👥 *Vagas:* {{vagas}}

🔗 *Inscreva-se:* {{link}}

Garanta sua presença! 🚀`,
  },
  {
    tipo: 'lembrete_antecedencia',
    titulo: 'Lembrete (dias antes)',
    descricao: 'Enviado X dias antes do evento aos inscritos (configure os dias).',
    com_imagem: false,
    dias_antecedencia: 1,
    placeholders: ['nome', 'evento', 'data', 'hora', 'local', 'dias'],
    conteudo:
`🔔 *Lembrete de evento*

Olá, {{nome}}! Faltam *{{dias}}* dia(s) para o evento *{{evento}}*.

📅 {{data}} às {{hora}}
📍 {{local}}

Não esqueça de apresentar seu QR Code na entrada. ✅`,
  },
  {
    tipo: 'lembrete_dia',
    titulo: 'Lembrete (dia do evento)',
    descricao: 'Enviado na manhã do dia do evento aos inscritos.',
    com_imagem: false,
    placeholders: ['nome', 'evento', 'hora', 'local'],
    conteudo:
`🎯 *Hoje é o dia!*

Olá, {{nome}}! O evento *{{evento}}* começa hoje às {{hora}}.

📍 {{local}}

Te esperamos! 🏠`,
  },
  {
    tipo: 'inscricao_confirmada',
    titulo: 'Inscrição confirmada',
    descricao: 'Enviado ao corretor quando ele se inscreve em um evento.',
    com_imagem: false,
    placeholders: ['nome', 'evento', 'data', 'hora', 'local'],
    conteudo:
`✅ *Inscrição confirmada!*

Olá, {{nome}}! Sua inscrição no evento *{{evento}}* foi confirmada.

📅 {{data}} às {{hora}}
📍 {{local}}

Apresente seu QR Code na entrada. Até lá! 🎯`,
  },
  {
    tipo: 'aprovacao',
    titulo: 'Cadastro aprovado',
    descricao: 'Enviado ao corretor quando seu cadastro é aprovado pelo admin.',
    com_imagem: false,
    placeholders: ['nome', 'link'],
    conteudo:
`🎉 *Cadastro aprovado!*

Olá, {{nome}}! Seu cadastro no Portal IDIBRA foi aprovado.

Acesse: {{link}}

Bem-vindo à família IDIBRA! 🏆`,
  },
  {
    tipo: 'checkin',
    titulo: 'Presença confirmada',
    descricao: 'Enviado ao corretor quando o check-in é realizado no evento.',
    com_imagem: false,
    placeholders: ['nome', 'evento'],
    conteudo:
`✅ *Presença confirmada!*

Olá, {{nome}}! Sua presença no evento *{{evento}}* foi registrada.

Obrigado pela participação! 🏆`,
  },
  {
    tipo: 'aniversario',
    titulo: 'Aniversário do corretor',
    descricao: 'Enviado automaticamente no dia do aniversário do corretor.',
    com_imagem: false,
    placeholders: ['nome'],
    conteudo:
`🎂 *Feliz aniversário, {{nome}}!* 🎉

Toda a equipe IDIBRA deseja a você um dia incrível, cheio de alegria e realizações!

Conte sempre com a gente. 🥳🏠`,
  },
  {
    tipo: 'cancelamento_evento',
    titulo: 'Evento cancelado',
    descricao: 'Enviado aos inscritos quando um evento é cancelado.',
    com_imagem: false,
    placeholders: ['nome', 'evento', 'data'],
    conteudo:
`⚠️ *Evento cancelado*

Olá, {{nome}}! Infelizmente o evento *{{evento}}* marcado para {{data}} foi cancelado.

Entraremos em contato em breve com mais informações.`,
  },
]
