# IDIBRA — Documentação do Backend

> Especificação técnica completa para construção da API REST self-hosted que irá alimentar o Portal de Corretores IDIBRA.

---

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                          VPS (Ubuntu 22.04)                     │
│                                                                 │
│  ┌──────────┐    ┌─────────────────┐    ┌──────────────────┐   │
│  │  Nginx   │───▶│  Node.js API    │───▶│   PostgreSQL 16  │   │
│  │ (proxy)  │    │  Fastify + JWT  │    │   (porta 5432)   │   │
│  └────┬─────┘    │  Prisma ORM     │    └──────────────────┘   │
│       │          │  node-cron      │                           │
│       │          └────────┬────────┘    ┌──────────────────┐   │
│       │                   │             │  Evolution API   │   │
│       │                   └────────────▶│  (Docker :8080)  │   │
│       │                                 └──────────────────┘   │
│  ┌────▼─────┐                                                   │
│  │  React   │    ┌─────────────────┐                           │
│  │  Build   │    │ /var/www/uploads │  ← banners, fotos        │
│  │ (static) │    │ servido via Nginx│                           │
│  └──────────┘    └─────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Motivo |
|---|---|---|
| API Framework | **Fastify 4** | TypeScript nativo, schema validation embutido, 2× mais rápido que Express |
| ORM | **Prisma 5** | TypeScript-first, migrations automáticas, autocomplete excelente |
| Banco de Dados | **PostgreSQL 16** | Robusto, suporta JSON, full-text search, battle-tested |
| Autenticação | **JWT + bcrypt** | Stateless, funciona bem com SPA React, refresh token seguro |
| Upload de Arquivos | **@fastify/multipart + sharp** | Upload de banners e fotos com redimensionamento automático |
| WhatsApp | **Evolution API (Docker)** | Self-hosted, sem custo extra, suporte à comunidade brasileira |
| Agendamentos | **node-cron** | Lembretes D-1 e D-0 sem dependência externa |
| Logs | **pino** | Já integrado ao Fastify, estruturado em JSON |
| Processo | **PM2** | Restart automático, cluster mode, logs centralizados |
| Proxy | **Nginx** | SSL, serving de arquivos estáticos, rate limiting |

---

## 3. Estrutura de Pastas do Backend

```
backend/
├── prisma/
│   ├── schema.prisma          ← definição de tabelas e relações
│   ├── migrations/            ← histórico de migrações (gerado pelo Prisma)
│   └── seed.ts                ← dados iniciais (admin padrão)
│
├── src/
│   ├── server.ts              ← entry point, registra plugins e rotas
│   ├── config.ts              ← variáveis de ambiente tipadas (zod)
│   │
│   ├── modules/               ← features organizadas por domínio
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.schema.ts ← tipos Zod de request/response
│   │   ├── corretores/
│   │   │   ├── corretores.routes.ts
│   │   │   ├── corretores.service.ts
│   │   │   └── corretores.schema.ts
│   │   ├── eventos/
│   │   │   ├── eventos.routes.ts
│   │   │   ├── eventos.service.ts
│   │   │   └── eventos.schema.ts
│   │   ├── inscricoes/
│   │   │   ├── inscricoes.routes.ts
│   │   │   ├── inscricoes.service.ts
│   │   │   └── inscricoes.schema.ts
│   │   ├── imobiliarias/
│   │   │   ├── imobiliarias.routes.ts
│   │   │   ├── imobiliarias.service.ts
│   │   │   └── imobiliarias.schema.ts
│   │   └── relatorios/
│   │       ├── relatorios.routes.ts
│   │       └── relatorios.service.ts
│   │
│   ├── jobs/
│   │   └── lembretes.ts       ← cron de lembretes WhatsApp D-1 e D-0
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts  ← verifica JWT e injeta req.user
│   │   ├── admin.middleware.ts ← restringe rotas só a admin
│   │   └── upload.middleware.ts← processa multipart/form-data
│   │
│   └── lib/
│       ├── prisma.ts          ← instância singleton do PrismaClient
│       ├── evolution.ts       ← cliente HTTP da Evolution API
│       ├── jwt.ts             ← assinar e verificar tokens
│       ├── hash.ts            ← bcrypt helpers
│       └── storage.ts         ← salvar/deletar arquivos em /uploads
│
├── .env                       ← variáveis de ambiente (NÃO commitar)
├── .env.example               ← template das variáveis
├── package.json
├── tsconfig.json
└── ecosystem.config.js        ← configuração do PM2
```

---

## 4. Variáveis de Ambiente

### Backend (`.env`)

```env
# Servidor
NODE_ENV=production
PORT=3000

# Banco de Dados
DATABASE_URL=postgresql://idibra:SuaSenhaAqui@localhost:5432/idibra_db

# Autenticação
JWT_SECRET=chave-super-secreta-minimo-32-caracteres
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=30d

# Upload de Arquivos
UPLOAD_DIR=/var/www/uploads
UPLOAD_MAX_SIZE_MB=10
API_URL=https://api.idibra.com.br

# Evolution API (WhatsApp)
EVOLUTION_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-api-key-evolution
EVOLUTION_INSTANCE=idibra

# CORS
ALLOWED_ORIGINS=https://portal.idibra.com.br,http://localhost:5173
```

### Frontend (`.env`)

```env
# URL da API
VITE_API_URL=https://api.idibra.com.br

# Em desenvolvimento, usar mock até o backend estar pronto
VITE_USE_MOCK=false
```

---

## 5. Schema do Banco (Prisma)

```prisma
// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────────

enum StatusCorretor  { pendente ativo bloqueado }
enum StatusImob      { ativa inativa }
enum StatusEvento    { rascunho publicado encerrado cancelado }
enum StatusInscricao { inscrito presente ausente cancelado }
enum TipoEvento      { lancamento treinamento reuniao feira workshop outro }

// ─── Models ──────────────────────────────────────────────────

model Admin {
  id         String   @id @default(uuid())
  nome       String
  email      String   @unique
  senha      String   // bcrypt hash
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@map("admins")
}

model Imobiliaria {
  id         String     @id @default(uuid())
  nome       String
  cnpj       String     @unique
  telefone   String?
  email      String?
  cidade     String
  uf         String     @db.Char(2)
  status     StatusImob @default(ativa)
  created_at DateTime   @default(now())
  updated_at DateTime   @updatedAt
  corretores Corretor[]

  @@map("imobiliarias")
}

model Corretor {
  id                String         @id @default(uuid())
  nome              String
  cpf               String         @unique @db.Char(14)  // formatado: 000.000.000-00
  creci             String         @unique
  email             String         @unique
  telefone          String
  whatsapp          String
  whatsapp_opt_in   Boolean        @default(false)       // LGPD: consentiu notificações
  instagram         String?
  cidade            String
  uf                String         @db.Char(2)
  status            StatusCorretor @default(pendente)
  foto_url          String?        // caminho relativo em /uploads/fotos/
  observacoes_admin String?
  imobiliaria_id    String?
  imobiliaria       Imobiliaria?   @relation(fields: [imobiliaria_id], references: [id])
  inscricoes        Inscricao[]
  notificacoes      NotificacaoLog[]
  created_at        DateTime       @default(now())
  updated_at        DateTime       @updatedAt

  @@map("corretores")
}

model Evento {
  id                 String       @id @default(uuid())
  titulo             String
  descricao          String
  tipo               TipoEvento
  empreendimento     String?
  local              String
  endereco           String
  link_maps          String?
  data_evento        DateTime
  hora_inicio        String       @db.VarChar(5)   // "09:00"
  hora_fim           String       @db.VarChar(5)   // "17:00"
  capacidade         Int
  banner_url         String?      // caminho relativo em /uploads/banners/
  status             StatusEvento @default(rascunho)
  inscricoes_abertas Boolean      @default(true)
  inscricoes         Inscricao[]
  notificacoes       NotificacaoLog[]
  created_at         DateTime     @default(now())
  updated_at         DateTime     @updatedAt

  @@map("eventos")
}

model Inscricao {
  id             String          @id @default(uuid())
  corretor_id    String
  evento_id      String
  status         StatusInscricao @default(inscrito)
  qr_code_token  String          @unique @default(uuid())
  checkin_at     DateTime?
  corretor       Corretor        @relation(fields: [corretor_id], references: [id], onDelete: Cascade)
  evento         Evento          @relation(fields: [evento_id], references: [id], onDelete: Cascade)
  created_at     DateTime        @default(now())

  @@unique([corretor_id, evento_id])   // um corretor não pode se inscrever duas vezes
  @@map("inscricoes")
}

model NotificacaoLog {
  id          String    @id @default(uuid())
  corretor_id String
  evento_id   String?
  tipo        String    // inscricao_confirmada | lembrete_d1 | lembrete_d0 | aprovacao | checkin | cancelamento_evento
  status      String    // enviado | erro
  mensagem    String?   // texto enviado (para auditoria)
  erro        String?   // mensagem de erro se falhou
  corretor    Corretor  @relation(fields: [corretor_id], references: [id], onDelete: Cascade)
  evento      Evento?   @relation(fields: [evento_id], references: [id], onDelete: SetNull)
  enviado_at  DateTime  @default(now())

  @@map("notificacoes_log")
}
```

---

## 6. Endpoints da API

### Autenticação

```
POST   /auth/login              ← admin e corretor (retorna access + refresh token)
POST   /auth/refresh            ← renova access token com refresh token
POST   /auth/logout             ← invalida refresh token
POST   /auth/cadastro           ← auto-cadastro de corretor (público)
```

**POST /auth/login — Request:**
```json
{ "email": "admin@idibra.com.br", "senha": "123456" }
```

**POST /auth/login — Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": { "id": "...", "nome": "Admin", "role": "admin" }
}
```

---

### Corretores

```
GET    /corretores                        ← listar com filtros + paginação (admin)
GET    /corretores/me                     ← perfil do corretor logado
GET    /corretores/:id                    ← perfil completo (admin)
POST   /corretores                        ← criar (admin)
PATCH  /corretores/:id                    ← atualizar dados
PATCH  /corretores/:id/status             ← ativar | bloquear (dispara WhatsApp)
PATCH  /corretores/:id/opt-in             ← atualizar consentimento de notificações
POST   /corretores/:id/foto               ← upload de foto (multipart)
DELETE /corretores/:id/foto               ← remover foto
```

**GET /corretores — Query params:**
```
?search=roberto
?status=pendente
?imobiliaria_id=uuid
?page=1&limit=10
?sort=nome&order=asc
```

**GET /corretores — Response:**
```json
{
  "data": [ { "id": "...", "nome": "...", "status": "ativo", ... } ],
  "meta": { "total": 28, "page": 1, "limit": 10, "pages": 3 }
}
```

---

### Eventos

```
GET    /eventos                          ← listar (corretor: só publicados | admin: todos)
GET    /eventos/:id                      ← detalhes + contagem de inscritos
POST   /eventos                          ← criar rascunho (admin)
PATCH  /eventos/:id                      ← editar (admin)
PATCH  /eventos/:id/status               ← publicar | encerrar | cancelar (dispara WhatsApp)
POST   /eventos/:id/banner               ← upload de banner (multipart)
DELETE /eventos/:id/banner               ← remover banner
```

**PATCH /eventos/:id/status — Request:**
```json
{ "status": "publicado" }
```

Ao mudar para `cancelado`, o service dispara WhatsApp para todos os inscritos com `opt_in = true`.

---

### Inscrições

```
GET    /inscricoes                       ← listar por evento ou corretor (filtros por query)
POST   /inscricoes                       ← inscrever corretor em evento (dispara WhatsApp)
PATCH  /inscricoes/:id/cancelar          ← cancelar inscrição
POST   /inscricoes/checkin               ← check-in por QR token (dispara WhatsApp)
```

**POST /inscricoes — Request:**
```json
{ "evento_id": "uuid" }
```

**POST /inscricoes/checkin — Request:**
```json
{ "qr_token": "uuid-do-token" }
```

**POST /inscricoes/checkin — Response:**
```json
{
  "inscricao": { "id": "...", "status": "presente", "checkin_at": "2026-06-14T09:32:00Z" },
  "corretor":  { "nome": "Roberto Alves", "imobiliaria": "Beta Imóveis" },
  "evento":    { "titulo": "Lançamento Parque Verde" }
}
```

---

### Imobiliárias

```
GET    /imobiliarias                     ← listar (admin)
GET    /imobiliarias/:id                 ← detalhes + corretores vinculados
POST   /imobiliarias                     ← criar (admin)
PATCH  /imobiliarias/:id                 ← editar (admin)
PATCH  /imobiliarias/:id/status          ← ativar | inativar (admin)
DELETE /imobiliarias/:id                 ← excluir (admin)
```

---

### Relatórios

```
GET    /relatorios/eventos               ← stats por período (?periodo=30d)
GET    /relatorios/corretores            ← ranking de participações
GET    /relatorios/participacoes         ← histórico paginado
GET    /relatorios/export/eventos        ← download CSV
GET    /relatorios/export/corretores     ← download CSV
GET    /relatorios/export/participacoes  ← download CSV
```

---

## 7. Fluxo de Autenticação (JWT)

```
Corretor/Admin faz login
        │
        ▼
POST /auth/login
        │
        ├── Verifica email + bcrypt(senha)
        ├── Gera access_token  (JWT, expira em 8h)
        └── Gera refresh_token (JWT, expira em 30d, salvo em httpOnly cookie)
        │
        ▼
Frontend armazena access_token no localStorage
        │
Toda requisição: Authorization: Bearer {access_token}
        │
Quando access_token expirar (401):
        │
        ▼
POST /auth/refresh  (envia refresh_token via cookie)
        └── Gera novo access_token
```

**Payload do JWT:**
```json
{
  "sub": "uuid-do-user",
  "role": "admin | corretor",
  "nome": "Roberto Alves",
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

## 8. Upload de Arquivos

```
Nginx serve os arquivos diretamente:
  https://api.idibra.com.br/uploads/banners/uuid.webp
  https://api.idibra.com.br/uploads/fotos/uuid.webp

Estrutura no disco:
  /var/www/uploads/
  ├── banners/     ← banners dos eventos
  └── fotos/       ← fotos de perfil dos corretores
```

**Processamento com sharp:**
- Banners: redimensionados para 1280×720 px, convertidos para WebP (qualidade 85)
- Fotos de perfil: redimensionadas para 400×400 px (crop center), WebP

**Fluxo:**
```
POST /eventos/:id/banner (multipart)
  → recebe arquivo
  → sharp converte e salva em /var/www/uploads/banners/{uuid}.webp
  → salva URL relativa no banco: /uploads/banners/{uuid}.webp
  → retorna { banner_url: "https://api.idibra.com.br/uploads/banners/..." }
```

---

## 9. Evolution API — WhatsApp

### Setup inicial

```bash
# Subir Evolution API via Docker
docker run -d \
  --name evolution-api \
  --restart always \
  -p 8080:8080 \
  -e AUTHENTICATION_TYPE=apikey \
  -e AUTHENTICATION_API_KEY=SUA_CHAVE_AQUI \
  -e DATABASE_ENABLED=false \
  -v evolution_data:/evolution/instances \
  atendai/evolution-api:latest

# Acessar painel: http://SEU_IP:8080
# Criar instância "idibra" e escanear QR Code com o número da IDIBRA
```

### Cliente HTTP (`src/lib/evolution.ts`)

```typescript
const BASE = process.env.EVOLUTION_URL     // http://localhost:8080
const KEY  = process.env.EVOLUTION_API_KEY
const INST = process.env.EVOLUTION_INSTANCE // "idibra"

export async function sendWhatsApp(
  whatsapp: string,
  mensagem: string,
): Promise<void> {
  const numero = `55${whatsapp.replace(/\D/g, '')}`

  const res = await fetch(`${BASE}/message/sendText/${INST}`, {
    method:  'POST',
    headers: { 'apikey': KEY, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ number: numero, text: mensagem }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WhatsApp error: ${err}`)
  }
}
```

### Mensagens por gatilho

```typescript
// inscricao confirmada
`✅ *Inscrição confirmada!*\n\n` +
`Olá, ${nome}! Sua inscrição no evento *${titulo}* foi confirmada.\n\n` +
`📅 Data: ${data}\n⏰ Horário: ${hora}\n📍 Local: ${local}\n\n` +
`Apresente seu QR Code na entrada. Até lá! 🎯`

// lembrete D-1
`🔔 *Lembrete — evento amanhã!*\n\n` +
`Olá, ${nome}! Amanhã tem *${titulo}*.\n\n` +
`📅 ${data} às ${hora}\n📍 ${local}\n\n` +
`Não esqueça de apresentar seu QR Code na entrada. ✅`

// lembrete D-0 (manhã do evento)
`🎯 *Hoje é o dia!*\n\n` +
`Olá, ${nome}! O evento *${titulo}* começa hoje às ${hora}.\n\n` +
`📍 ${local}\n\nTe esperamos! 🏠`

// corretor aprovado
`🎉 *Cadastro aprovado!*\n\n` +
`Olá, ${nome}! Seu cadastro no Portal IDIBRA foi aprovado.\n\n` +
`Acesse: https://portal.idibra.com.br\n\n` +
`Bem-vindo à família IDIBRA! 🏆`

// evento cancelado
`⚠️ *Evento cancelado*\n\n` +
`Olá, ${nome}! Infelizmente o evento *${titulo}* que estava marcado para ` +
`${data} foi cancelado.\n\nEntraremos em contato em breve com mais informações.`

// check-in confirmado
`✅ *Presença confirmada!*\n\n` +
`Olá, ${nome}! Sua presença no evento *${titulo}* foi registrada.\n\n` +
`Obrigado pela participação! 🏆`
```

---

## 10. Jobs Agendados (Cron)

```typescript
// src/jobs/lembretes.ts
import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { sendWhatsApp } from '../lib/evolution'

// Roda todo dia às 08:00
cron.schedule('0 8 * * *', async () => {
  const hoje   = new Date(); hoje.setHours(0, 0, 0, 0)
  const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1)
  const depois = new Date(amanha); depois.setDate(depois.getDate() + 1)

  // Lembretes D-1 (eventos de amanhã)
  const eventosAmanha = await prisma.evento.findMany({
    where: { data_evento: { gte: amanha, lt: depois }, status: 'publicado' },
    include: { inscricoes: { where: { status: 'inscrito' }, include: { corretor: true } } },
  })

  for (const evento of eventosAmanha) {
    for (const inscricao of evento.inscricoes) {
      if (!inscricao.corretor.whatsapp_opt_in) continue
      // verifica se já foi enviado hoje para evitar duplicata
      const jaEnviado = await prisma.notificacaoLog.findFirst({
        where: { corretor_id: inscricao.corretor_id, evento_id: evento.id, tipo: 'lembrete_d1' },
      })
      if (jaEnviado) continue

      try {
        const msg = `🔔 *Lembrete — evento amanhã!*\n\n...`
        await sendWhatsApp(inscricao.corretor.whatsapp, msg)
        await prisma.notificacaoLog.create({
          data: { corretor_id: inscricao.corretor_id, evento_id: evento.id, tipo: 'lembrete_d1', status: 'enviado', mensagem: msg },
        })
      } catch (err) {
        await prisma.notificacaoLog.create({
          data: { corretor_id: inscricao.corretor_id, evento_id: evento.id, tipo: 'lembrete_d1', status: 'erro', erro: String(err) },
        })
      }
    }
  }

  // Lembretes D-0 — mesma lógica para eventos de hoje com tipo 'lembrete_d0'
})
```

---

## 11. PM2 — Configuração de Processo

```javascript
// backend/ecosystem.config.js
module.exports = {
  apps: [{
    name:         'idibra-api',
    script:       'dist/server.js',
    instances:    2,            // cluster com 2 workers
    exec_mode:    'cluster',
    env: {
      NODE_ENV: 'production',
      PORT:     3000,
    },
    error_file:   'logs/error.log',
    out_file:     'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    restart_delay:   5000,
    max_memory_restart: '500M',
  }],
}
```

```bash
# Deploy
npm run build && pm2 start ecosystem.config.js
pm2 save && pm2 startup   # reiniciar na inicialização da VPS
pm2 logs idibra-api       # ver logs em tempo real
pm2 monit                 # monitor interativo
```

---

## 12. Nginx — Configuração Completa

```nginx
# /etc/nginx/sites-available/idibra

# Frontend React (build estático)
server {
  listen 443 ssl;
  server_name portal.idibra.com.br;
  root /var/www/portal/dist;
  index index.html;

  ssl_certificate     /etc/letsencrypt/live/portal.idibra.com.br/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/portal.idibra.com.br/privkey.pem;

  location / {
    try_files $uri $uri/ /index.html;  # SPA routing
  }

  gzip on;
  gzip_types text/plain text/css application/javascript application/json;
}

# API Fastify
server {
  listen 443 ssl;
  server_name api.idibra.com.br;

  ssl_certificate     /etc/letsencrypt/live/api.idibra.com.br/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.idibra.com.br/privkey.pem;

  # Rate limiting
  limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;

  location / {
    limit_req zone=api burst=20 nodelay;
    proxy_pass         http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade $http_upgrade;
    proxy_set_header   Connection 'upgrade';
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_cache_bypass $http_upgrade;
    client_max_body_size 10M;  # tamanho máximo de upload
  }

  # Servir uploads diretamente (sem passar pela API)
  location /uploads/ {
    alias  /var/www/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
  }
}

# Redirecionar HTTP → HTTPS
server {
  listen 80;
  server_name portal.idibra.com.br api.idibra.com.br;
  return 301 https://$host$request_uri;
}
```

---

## 13. Setup Inicial da VPS

```bash
# 1. Atualizar sistema
apt update && apt upgrade -y

# 2. Instalar dependências
apt install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx

# 3. Node.js 20 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc && nvm install 20 && nvm use 20

# 4. PM2
npm install -g pm2

# 5. Docker (para Evolution API)
curl -fsSL https://get.docker.com | sh

# 6. Criar banco de dados
sudo -u postgres psql <<EOF
CREATE USER idibra WITH PASSWORD 'SuaSenhaSegura';
CREATE DATABASE idibra_db OWNER idibra;
GRANT ALL PRIVILEGES ON DATABASE idibra_db TO idibra;
EOF

# 7. Evolution API
docker run -d \
  --name evolution-api \
  --restart always \
  -p 8080:8080 \
  -e AUTHENTICATION_TYPE=apikey \
  -e AUTHENTICATION_API_KEY=sua-chave-aqui \
  -v evolution_data:/evolution/instances \
  atendai/evolution-api:latest

# 8. Clonar e configurar o backend
cd /var/www && git clone <repo-backend> api && cd api
cp .env.example .env && nano .env   # preencher variáveis
npm install
npx prisma migrate deploy           # rodar migrations
npx prisma db seed                  # criar admin padrão
npm run build
pm2 start ecosystem.config.js
pm2 save && pm2 startup

# 9. Frontend
mkdir -p /var/www/portal && cd /var/www/portal
# copiar build do React aqui

# 10. Criar diretórios de upload
mkdir -p /var/www/uploads/{banners,fotos}
chown -R www-data:www-data /var/www/uploads

# 11. Nginx + SSL
ln -s /etc/nginx/sites-available/idibra /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d portal.idibra.com.br -d api.idibra.com.br
```

---

## 14. Como Conectar o Frontend

O frontend já possui a camada de serviços em `src/services/`. A troca de mock para API real será feita arquivo a arquivo, usando a variável `VITE_USE_MOCK` para controle durante desenvolvimento.

O cliente HTTP está em `src/lib/api.ts` e os services já estão preparados com a estrutura de fallback.

### Sequência de integração recomendada

1. **Auth** — `POST /auth/login` → salvar token → `useAuth` atualizado
2. **Corretores** — `GET /corretores/me` no perfil, `GET /corretores` no admin
3. **Eventos** — `GET /eventos` (paginado), `GET /eventos/:id`
4. **Inscrições** — `POST /inscricoes`, `POST /inscricoes/checkin`
5. **Uploads** — banner do evento, foto do corretor
6. **WhatsApp** — habilitado automaticamente pelos services quando backend estiver rodando

---

## 15. Checklist de Segurança

- [ ] `.env` no `.gitignore` (nunca commitar)
- [ ] Evolution API não exposta publicamente (só `localhost:8080`)
- [ ] PostgreSQL só acessível localmente (sem bind 0.0.0.0)
- [ ] Rate limiting no Nginx para rotas de auth
- [ ] JWT com expiração curta (8h) + refresh token httpOnly
- [ ] bcrypt com salt rounds ≥ 12
- [ ] Validação de entrada em todos os endpoints (Zod schemas)
- [ ] `whatsapp_opt_in` respeitado antes de qualquer disparo (LGPD)
- [ ] `NotificacaoLog` para auditoria de envios
- [ ] Backup diário do PostgreSQL via `pg_dump` + cron
- [ ] Firewall: apenas portas 80, 443 e 22 abertas externamente

---

## 16. Recursos adicionais implementados (além da spec inicial)

> Esta seção mapeia o que foi construído depois do desenho original. As seções
> 1–15 são a especificação base; aqui ficam as evoluções já no código.

### 16.1 Central de Notificações (templates editáveis)

Módulo `modules/templates/` — mensagens de WhatsApp por gatilho, **editáveis pelo admin**.

- Model `MensagemTemplate` (tabela `mensagem_templates`): `tipo` (único), `titulo`,
  `descricao`, `conteudo` (com `{{placeholders}}`), `ativo`, `com_imagem`,
  `dias_antecedencia`.
- `templates.defaults.ts` — 7 templates padrão: `evento_novo`, `lembrete_antecedencia`,
  `lembrete_dia`, `inscricao_confirmada`, `aprovacao`, `checkin`, `cancelamento_evento`.
- `seedTemplates()` roda no boot (idempotente, **não sobrescreve** edições do admin).
- `renderMensagem(tipo, vars)` substitui placeholders; retorna `null` se o template
  estiver inativo (aí a notificação não é enviada).

```
GET   /templates          ← lista os templates (admin)
PATCH /templates/:tipo     ← edita conteúdo / ativo / com_imagem / dias_antecedencia
```

Frontend: página **Central de Notificações** (`/admin/notificacoes`).

### 16.2 Notificações em tempo real (SSE)

Módulo `modules/notifications/` + `lib/events.ts` (EventEmitter in-process).

```
GET /notifications/stream?token=<accessToken>   ← canal SSE (admin), token na query
```

- Os services emitem `emitAdminRefresh(motivo)` em: novo cadastro de corretor,
  mudança de status do corretor, criação/edição/publicação de evento.
- A rota SSE empurra `event: refresh` para os admins conectados → o sino recarrega
  na hora. Heartbeat de 25s + header `X-Accel-Buffering: no`.
- Frontend (`useNotifications`): `EventSource` com reconexão automática + reconexão
  manual com token renovado; **polling de 120s só como rede de segurança**; estado
  "lido" persistido em `localStorage`.
- ⚠️ Deploy: o Nginx precisa de `proxy_buffering off` na rota `/notifications/stream`
  (ver DEPLOY.md, passo 7.1).

### 16.3 Fila de envio do WhatsApp (throttle anti-bloqueio)

`lib/whatsapp-queue.ts` — como a Evolution é **API não oficial**, todos os envios
passam por uma fila que serializa e aplica atraso (jitter) entre mensagens.

- `notify()` enfileira o envio em produção (o `NotificacaoLog` é gravado quando o
  job roda, refletindo o resultado real). Sem Evolution (dev/test) → stub síncrono.
- Config: `WHATSAPP_MIN_DELAY_MS` (4000) e `WHATSAPP_MAX_DELAY_MS` (9000).
- `whatsappQueueSize()` exposto em `GET /whatsapp/status` (campo `fila`) e exibido
  na tela **Configurações → WhatsApp**.

### 16.4 WhatsApp — QR e disparos

- **QR de check-in no WhatsApp**: ao confirmar inscrição, o QR (gerado em
  `lib/qrcode.ts`, PNG→WebP) vai anexado à confirmação. `notify()` aceita
  `imagemBase64`.
- **Reenviar QR** (admin): `POST /inscricoes/:id/reenviar-qr` — valida conexão/opt-in
  antes; botão na lista de inscritos do evento.
- **Broadcast** ao publicar evento: envia `evento_novo` (com banner) a todos os
  corretores ativos com opt-in — via fila.
- **Status/sync**: `GET /whatsapp/status`, `POST /whatsapp/conectar` (QR),
  `POST /whatsapp/desconectar`, `POST /whatsapp/testar`.

### 16.5 Imagens — logo de imobiliária + proporções

- `Imobiliaria.logo_url` + `POST/DELETE /imobiliarias/:id/logo`.
- `lib/storage.ts` agora tem 3 tipos: `banners` (1200×630, cover — proporção
  WhatsApp/redes), `fotos` (512, **inside** — preserva proporção, sem corte),
  `logos` (512, **inside**). Diretório extra: `/var/www/uploads/logos/`.
- `deleteImobiliaria` remove a logo do storage (evita arquivo órfão).

### 16.6 Autenticação — pacote completo

```
POST /auth/login | /auth/refresh | /auth/cadastro
POST /auth/trocar-senha | /auth/esqueci-senha | /auth/resetar-senha
```
Refresh automático no cliente (`lib/api.ts`) com deduplicação de chamadas.

### 16.7 Lembretes configuráveis

`jobs/lembretes.ts` — `enviarLembretes(ref)` dispara `lembrete_antecedencia`
(dias vêm de `getDiasAntecedencia()`, editável no template) + `lembrete_dia`.
Idempotente via `NotificacaoLog`. Cron diário 08:00 (America/Sao_Paulo).

### 16.8 Qualidade

- **Testes**: Vitest com DB isolado (`idibra_test`), 72 testes.
- **Lint**: ESLint 9 (flat config em `eslint.config.mjs`) — `npm run lint`.
- **NotificacaoLog.tipo** atual: `inscricao_confirmada | lembrete_antecedencia |
  lembrete_dia | aprovacao | checkin | cancelamento_evento | evento_novo`.

### 16.10 Exportação CSV da lista de presença

`GET /inscricoes/export?evento_id=<id>` (admin) → baixa um CSV (Excel PT-BR) com os
inscritos/presentes do evento: Nome, CPF, CRECI, E-mail, Telefone, WhatsApp,
Imobiliária, Status, Inscrito em, Check-in em. Usa `lib/csv.ts` (separador `;` +
BOM UTF-8 para acentuação). No frontend, botão **Exportar CSV** na lista de
inscritos do evento ([AdminEventoDetalhes](src/pages/admin/AdminEventoDetalhes.tsx)).

### 16.9 Migrations (aplicar com `prisma migrate deploy`)

As tabelas novas (`mensagem_templates`, coluna `imobiliarias.logo_url`) já estão em
`prisma/migrations/`. O `migrate deploy` aplica todas automaticamente — nenhum passo
manual extra no deploy.
