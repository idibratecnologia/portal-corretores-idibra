Crie uma aplicação web completa chamada "Portal de Corretores IDIBRA".

Objetivo:
A aplicação deve permitir que a IDIBRA gerencie corretores parceiros, eventos comerciais, inscrições e participação dos corretores em eventos. O sistema deve ter dois ambientes: Portal do Corretor e Painel Administrativo.

Tecnologias:
- React com Vite
- TypeScript
- TailwindCSS
- Shadcn UI
- React Router
- Supabase para autenticação, banco de dados e storage
- PostgreSQL
- React Hook Form
- Zod
- Recharts para gráficos
- Biblioteca de QR Code para gerar check-in futuramente

Identidade visual:
Use um visual moderno, limpo e corporativo, com tons de verde, branco, cinza e detalhes elegantes. A interface deve passar confiança, organização e padrão profissional de uma construtora/incorporadora.

Perfis de acesso:
1. Admin IDIBRA:
- Pode acessar o painel administrativo
- Pode criar, editar e cancelar eventos
- Pode cadastrar e editar corretores
- Pode visualizar inscritos em eventos
- Pode confirmar presença
- Pode ver histórico de participação dos corretores
- Pode ver dashboard com indicadores

2. Corretor:
- Pode criar conta ou acessar sua conta
- Pode editar seu perfil
- Pode visualizar eventos disponíveis
- Pode se inscrever em eventos
- Pode cancelar inscrição
- Pode visualizar suas inscrições
- Pode visualizar seu histórico de participação
- Pode acessar QR Code de check-in futuramente

Telas obrigatórias do painel administrativo:

1. Login Admin
- Tela de login com e-mail e senha
- Layout profissional com marca IDIBRA

2. Dashboard Admin
Cards:
- Total de corretores cadastrados
- Eventos ativos
- Inscrições abertas
- Participações confirmadas
- Corretores pendentes
- Taxa média de presença

Gráficos:
- Participação por evento
- Inscrições por mês
- Corretores mais participativos
- Participação por imobiliária

3. Gestão de Eventos
Tabela com:
- Nome do evento
- Tipo
- Data
- Local
- Status
- Total de inscritos
- Total de presentes
- Ações

Ações:
- Criar evento
- Editar evento
- Publicar evento
- Cancelar evento
- Ver inscritos
- Encerrar evento

Campos do evento:
- Título
- Descrição
- Tipo do evento
- Empreendimento relacionado
- Local
- Endereço
- Link Google Maps
- Data
- Hora de início
- Hora de fim
- Capacidade
- Banner do evento
- Status: rascunho, publicado, encerrado, cancelado
- Inscrições abertas: sim/não

4. Detalhes do Evento
Mostrar:
- Dados principais do evento
- Total de vagas
- Total de inscritos
- Total de presentes
- Total de ausentes
- Taxa de comparecimento

Tabela de inscritos:
- Nome do corretor
- CRECI
- Imobiliária
- Telefone
- Status
- Data da inscrição
- Check-in

Ações:
- Confirmar presença
- Marcar ausência
- Cancelar inscrição
- Ver perfil do corretor

5. Gestão de Corretores
Tabela com:
- Nome
- CPF
- CRECI
- E-mail
- WhatsApp
- Imobiliária
- Cidade/UF
- Total de eventos participados
- Status
- Ações

Filtros:
- Nome
- CRECI
- Imobiliária
- Status
- Cidade
- Participou de eventos

Ações:
- Criar corretor
- Editar corretor
- Ativar
- Bloquear
- Ver histórico

6. Perfil do Corretor no Admin
Mostrar:
- Foto
- Nome
- CPF
- CRECI
- E-mail
- WhatsApp
- Imobiliária
- Cidade/UF
- Instagram
- Status
- Observações internas

Indicadores:
- Eventos inscritos
- Eventos participados
- Eventos ausentes
- Taxa de presença
- Último evento participado

Histórico em tabela:
- Evento
- Data
- Tipo
- Status da participação
- Data do check-in

7. Gestão de Imobiliárias
Permitir:
- Cadastrar imobiliária
- Editar imobiliária
- Ativar/inativar
- Ver corretores vinculados

Campos:
- Nome
- CNPJ
- Telefone
- E-mail
- Cidade
- UF
- Status

Telas obrigatórias do Portal do Corretor:

1. Login/Cadastro do Corretor
- Login com e-mail e senha
- Cadastro com nome, CPF, CRECI, e-mail, telefone, WhatsApp, imobiliária, cidade, UF e foto
- Após cadastro, status inicial deve ser pendente ou ativo, conforme regra configurada

2. Home do Corretor
Cards:
- Eventos participados
- Inscrições ativas
- Próximo evento
- Status do perfil

Seções:
- Próximos eventos disponíveis
- Minhas inscrições recentes
- Meu histórico

3. Eventos Disponíveis
Exibir cards de eventos publicados:
- Banner
- Título
- Data
- Horário
- Local
- Vagas disponíveis
- Botão "Ver detalhes"
- Botão "Inscrever-se"

4. Detalhes do Evento
Mostrar:
- Banner
- Título
- Descrição
- Tipo
- Empreendimento
- Data
- Horário
- Local
- Mapa/link
- Vagas disponíveis

Ações:
- Inscrever-se
- Cancelar inscrição
- Ver QR Code, caso já esteja inscrito

5. Minhas Inscrições
Tabela ou cards:
- Evento
- Data
- Local
- Status: inscrito, presente, ausente, cancelado
- Botão para QR Code
- Botão para cancelar, quando permitido

6. Meu Perfil
Permitir editar:
- Nome
- CPF
- CRECI
- Telefone
- WhatsApp
- Foto
- Imobiliária
- Cidade/UF
- Instagram

7. Meu Histórico
Mostrar todos os eventos anteriores:
- Nome do evento
- Data
- Tipo
- Status da participação

Banco de dados Supabase:

Criar as seguintes tabelas:

1. corretores
Campos:
- id uuid primary key
- nome text not null
- cpf text unique
- creci text
- email text unique not null
- telefone text
- whatsapp text
- foto_url text
- imobiliaria_id uuid
- cidade text
- uf text
- instagram text
- status text default 'pendente'
- observacoes_admin text
- created_at timestamp
- updated_at timestamp

2. imobiliarias
Campos:
- id uuid primary key
- nome text not null
- cnpj text
- telefone text
- email text
- cidade text
- uf text
- status text default 'ativa'
- created_at timestamp

3. eventos
Campos:
- id uuid primary key
- titulo text not null
- descricao text
- tipo text
- empreendimento text
- local text
- endereco text
- link_maps text
- data_evento date
- hora_inicio time
- hora_fim time
- capacidade integer
- banner_url text
- status text default 'rascunho'
- inscricoes_abertas boolean default true
- criado_por uuid
- created_at timestamp
- updated_at timestamp

4. evento_inscricoes
Campos:
- id uuid primary key
- evento_id uuid references eventos(id)
- corretor_id uuid references corretores(id)
- status text default 'inscrito'
- qr_code_token text unique
- checkin_at timestamp
- checkin_por uuid
- observacao text
- created_at timestamp
- unique(evento_id, corretor_id)

5. admin_users
Campos:
- id uuid primary key
- nome text
- email text unique
- perfil text default 'admin'
- ativo boolean default true
- created_at timestamp

Regras:
- Corretor só pode visualizar eventos publicados
- Corretor só pode se inscrever se estiver ativo
- Corretor não pode se inscrever duas vezes no mesmo evento
- Admin pode gerenciar todos os eventos
- Admin pode visualizar e editar todos os corretores
- Admin pode confirmar presença
- Evento encerrado ou cancelado não permite novas inscrições
- Evento com capacidade atingida bloqueia novas inscrições

Layout:
- Criar sidebar no painel admin com menus:
  - Dashboard
  - Eventos
  - Corretores
  - Imobiliárias
  - Relatórios
  - Configurações

- Criar navbar no portal do corretor com:
  - Início
  - Eventos
  - Minhas inscrições
  - Histórico
  - Meu perfil

Requisitos visuais:
- Interface responsiva
- Cards modernos
- Tabelas com filtros
- Modais para criação e edição
- Confirmações antes de cancelar evento ou inscrição
- Badges coloridos para status
- Empty states quando não houver registros
- Loading states
- Feedback de sucesso e erro

Entregue:
- Estrutura completa de rotas
- Componentes reutilizáveis
- Hooks para Supabase
- Serviços de eventos, corretores, inscrições e imobiliárias
- SQL das tabelas
- Layout funcional com dados mockados inicialmente
- Preparar a aplicação para conectar ao Supabase depois