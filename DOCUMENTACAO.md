# Documentação — Portal de Corretores IDIBRA

Documentação completa da aplicação: arquitetura, módulos, fluxos de negócio, modelo de
dados, permissões, integrações e operação. Para detalhes profundos de backend e de deploy,
veja também **[BACKEND.md](BACKEND.md)** e **[DEPLOY.md](DEPLOY.md)**.

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Perfis de acesso e permissões](#3-perfis-de-acesso-e-permissões)
4. [Stack tecnológica](#4-stack-tecnológica)
5. [Estrutura de pastas](#5-estrutura-de-pastas)
6. [Modelo de dados](#6-modelo-de-dados)
7. [Módulos e funcionalidades](#7-módulos-e-funcionalidades)
8. [Autenticação e autorização](#8-autenticação-e-autorização)
9. [Notificações em tempo real (SSE)](#9-notificações-em-tempo-real-sse)
10. [WhatsApp (Evolution API)](#10-whatsapp-evolution-api)
11. [Upload de imagens](#11-upload-de-imagens)
12. [Importação em massa (Excel/CSV)](#12-importação-em-massa-excelcsv)
13. [API REST — visão geral](#13-api-rest--visão-geral)
14. [Variáveis de ambiente](#14-variáveis-de-ambiente)
15. [Ambiente de desenvolvimento](#15-ambiente-de-desenvolvimento)
16. [Deploy e produção](#16-deploy-e-produção)
17. [SEO](#17-seo)
18. [Scripts úteis](#18-scripts-úteis)
19. [Solução de problemas](#19-solução-de-problemas)

---

## 1. Visão geral

O Portal de Corretores IDIBRA digitaliza a relação da IDIBRA com seus **corretores parceiros**:
divulgação de **eventos/lançamentos**, **inscrições**, **check-in por QR Code**, **credenciamento**
presencial e **comunicação por WhatsApp**. A aplicação tem dois ambientes que compartilham o mesmo
código e a mesma API:

- **Painel Administrativo** (`/admin/*`) — uso interno da IDIBRA.
- **Portal do Corretor** (`/portal/*`) — uso dos corretores parceiros.

A tela de entrada (raiz `/`) é o login unificado; o sistema direciona o usuário ao ambiente
correto conforme o perfil autenticado.

---

## 2. Arquitetura

```
┌──────────────────┐        HTTPS         ┌─────────────────────┐
│  Frontend (SPA)  │  ───────────────────▶│   API (Fastify)     │
│  React + Vite    │   REST + SSE         │   Prisma            │
│  Nginx (estático)│◀───────────────────  │   JWT / RBAC        │
└──────────────────┘                      └─────────┬───────────┘
                                                     │
                          ┌──────────────────────────┼──────────────────────────┐
                          ▼                           ▼                          ▼
                  ┌───────────────┐          ┌─────────────────┐        ┌────────────────┐
                  │ PostgreSQL 16 │          │ Evolution API   │        │ Storage local  │
                  │ (Prisma)      │          │ (WhatsApp/Docker│        │ /uploads (sharp)│
                  └───────────────┘          └─────────────────┘        └────────────────┘
```

- **Frontend**: SPA em React, servida como build estático pelo Nginx. Fala com a API por REST e
  recebe eventos em tempo real por **SSE**.
- **Backend**: API Fastify modular (um módulo por domínio), Prisma como ORM, PostgreSQL como banco.
- **Integrações**: Evolution API (WhatsApp, não-oficial via Baileys) rodando em Docker; storage de
  imagens em disco (servido via `/uploads`).
- **Tempo real**: barramento de eventos em processo + endpoint SSE para o painel admin.

---

## 3. Perfis de acesso e permissões

Há **três perfis**:

| Perfil | Onde | O que pode fazer |
|---|---|---|
| **Administrador (super)** | `/admin` | Tudo: criar/editar/ver **e excluir** (corretores, imobiliárias, eventos), **gerenciar usuários** e (futuro) ver **logs/auditoria**. |
| **Operador** | `/admin` | Quase tudo: **criar, editar e visualizar**. **Não** pode excluir, gerenciar usuários nem ver logs. |
| **Corretor** | `/portal` | Ver eventos, inscrever-se/cancelar, ver QR de check-in, editar perfil, ver histórico. |

Os perfis `super`/`operador` são representados pelo campo `nivel` do modelo `Admin`. No backend, o
middleware `requireSuperAdmin` protege as rotas sensíveis (exclusões, `/usuarios`); no frontend, os
botões de exclusão e o menu **Usuários** só aparecem para `super`, e a rota é protegida por guarda.

---

## 4. Stack tecnológica

### Frontend
- **React 18 + TypeScript + Vite**
- **TailwindCSS** + **shadcn/ui** (componentes Radix em `src/components/ui`)
- **React Router** (rotas e guardas), **React Hook Form** + **Zod** (formulários/validação)
- **Recharts** (gráficos), **html5-qrcode / jsqr / qrcode.react** (QR Code), **react-easy-crop** (recorte de foto)
- **Code-splitting** por rota + **pré-carregamento** em segundo plano; loader leve nas transições

### Backend
- **Fastify** (HTTP), **Prisma** (ORM), **PostgreSQL**
- **JWT** (`jsonwebtoken`) + **bcrypt**, **Zod** (validação)
- **@fastify/**: `cors`, `helmet`, `multipart`, `rate-limit`, `static`, `cookie`
- **sharp** (processamento de imagens), **node-cron** (lembretes), **xlsx** (importação)
- Integração **Evolution API** (WhatsApp) e **SSE** (tempo real)
- **Vitest** (testes), **ESLint**

---

## 5. Estrutura de pastas

### Frontend (`src/`)
```
src/
├── pages/
│   ├── admin/        # Dashboard, Eventos, Corretores, Imobiliárias, Credenciamento,
│   │                 # CheckinKiosk, Aprovações, Relatórios, Notificações, Usuários, Configurações
│   ├── corretor/     # Home, Eventos, EventoDetalhes, Inscrições, Histórico, Perfil
│   ├── LoginPage · CadastroPage · EsqueciSenhaPage · ResetarSenhaPage
├── components/
│   ├── ui/           # shadcn/ui (button, dialog, input, alert-dialog, …)
│   ├── admin/        # AdminSidebar, *Modal, WhatsappSync, ImportarDados, ComprovantePresenca
│   ├── corretor/     # CorretorSidebar, CorretorNavbar
│   └── shared/       # NotificationBell, QrScanner, ImageCropModal, RouteFallback, …
├── services/         # auth, corretores, eventos, inscricoes, imobiliarias, usuarios,
│                     # importacao, relatorios, templates, configuracoes
├── contexts/         # AuthContext (sessão, perfil, login/logout)
├── hooks/            # useNotifications, useCheckinRealtime, useAsync, useDebouncedValue
├── lib/              # api (cliente HTTP), errors, utils
└── types/            # tipos compartilhados
```

### Backend (`backend/src/`)
```
src/
├── modules/          # um módulo por domínio (routes + service + schema)
│   ├── auth/         # login, cadastro, refresh, trocar/esqueci/resetar senha
│   ├── usuarios/     # CRUD de admins (super-only)
│   ├── corretores/   # CRUD, status, foto, reset de senha, exclusão
│   ├── imobiliarias/ # CRUD, logo, exclusão
│   ├── eventos/      # CRUD, status, banner, exclusão
│   ├── inscricoes/   # inscrição/cancelamento, check-in, export CSV, reenviar QR
│   ├── configuracoes/# regras (aprovação automática, antecedência de lembrete)
│   ├── templates/    # mensagens por gatilho
│   ├── notifications/# SSE + listagem de notificações do admin
│   ├── whatsapp/     # status/conectar/desconectar/testar (Evolution)
│   ├── relatorios/   # dashboard e relatórios
│   ├── import/       # importação Excel/CSV (modelos + upload)
│   └── lembretes/    # disparo de lembretes
├── lib/              # prisma, jwt, hash, evolution, notifications, whatsapp-queue,
│                     # qrcode, storage, upload, csv, events, format, pagination
├── middlewares/      # auth.middleware (authenticate, requireAdmin, requireSuperAdmin, requireCorretor)
├── jobs/             # cron de lembretes
├── config.ts         # leitura/validação de env (Zod)
└── server.ts         # bootstrap, plugins e registro das rotas
```

---

## 6. Modelo de dados

Entidades principais (Prisma — ver schema completo em `backend/prisma/schema.prisma` e
[BACKEND.md §5](BACKEND.md)):

| Modelo | Descrição |
|---|---|
| **Admin** | Usuário administrativo. Campo `nivel`: `super` \| `operador`. |
| **Imobiliaria** | Imobiliária parceira (nome, CNPJ único, contato, logo, status). |
| **Corretor** | Corretor parceiro (nome, CPF/CRECI/e-mail únicos, WhatsApp, foto, `whatsapp_opt_in`, vínculo opcional com imobiliária, status). |
| **Evento** | Evento/lançamento (título, tipo, datas, local, banner, status, inscrições abertas). |
| **Inscricao** | Inscrição de um corretor em um evento (status, `qr_code_token`, `checkin_at`). |
| **NotificacaoLog** | Registro de notificações/WhatsApp enviados. |
| **Configuracao** | Regras globais (ex.: aprovação automática, antecedência de lembrete). |
| **MensagemTemplate** | Templates de mensagem por gatilho (editáveis pelo admin). |
| **PasswordReset** | Tokens de redefinição de senha (validade 1h). |

**Enums**: `NivelAdmin` (super/operador), `StatusCorretor` (pendente/ativo/bloqueado),
`StatusImobiliaria` (ativa/inativa), `StatusEvento` (rascunho/publicado/encerrado/cancelado),
`StatusInscricao` (inscrito/presente/ausente/cancelado), `TipoEvento`
(lancamento/treinamento/reuniao/feira/workshop/outro).

---

## 7. Módulos e funcionalidades

### 7.1 Autenticação e conta
- **Login unificado** (admin ou corretor) com JWT.
- **Auto-cadastro** de corretor (página pública) → nasce `pendente` (ou `ativo` se a aprovação
  automática estiver ligada). Ao cadastrar, o admin é notificado **em tempo real**.
- **Esqueci / Resetar senha** com token (entrega do link por **WhatsApp**, transacional).
- **Trocar senha** (usuário logado).

### 7.2 Usuários administrativos (super-only)
CRUD de admins em **Configurações → Usuários**. Define `nivel` (super/operador), redefine senha,
com proteções: não excluir a si mesmo e manter ao menos um `super`.

### 7.3 Corretores
Lista com busca/filtros, criação/edição, **aprovação** de cadastros pendentes, mudança de status
(ativar/bloquear), **foto de perfil com recorte**, **reset de senha** (gera senha temporária) e
**exclusão** (super-only). Foto exibida no perfil, na lista e no menu do corretor.

### 7.4 Imobiliárias
CRUD com **logo**, contato e status; **exclusão** super-only. Usadas para vincular corretores.

### 7.5 Eventos
Ciclo de vida: **rascunho → publicado → encerrado/cancelado**. Banner (upload 1200×630),
controle de inscrições abertas, e **exclusão** super-only. Corretores só veem eventos publicados.

### 7.6 Inscrições e check-in (QR Code)
- Corretor se inscreve/cancela; cada inscrição gera um **QR Code** (token).
- **Check-in** validando o token (no credenciamento/quiosque) marca a inscrição como `presente`.
- **Exportar presença em CSV** (Excel PT-BR) por evento; **reenviar QR** por WhatsApp.

### 7.7 Credenciamento e Modo Quiosque
Telas otimizadas para o dia do evento:
- **Credenciamento**: lista de inscritos, busca, confirmar presença e **imprimir/reimprimir** o
  comprovante.
- **Modo Quiosque**: **leitura de QR Code** (câmera) ou **busca manual**, painel de presença em
  tempo real e **impressão do comprovante** após o check-in (componente `ComprovantePresenca`).

### 7.8 Central de Notificações + WhatsApp
- **Templates** de mensagem editáveis por **gatilho** (ex.: cadastro aprovado, evento publicado,
  lembrete, confirmação de inscrição…), com variáveis.
- Envio por **WhatsApp** via Evolution API, respeitando o **opt-in (LGPD)** do corretor.
- **Fila com throttle (jitter)** entre envios para reduzir risco de bloqueio em disparos em massa.

### 7.9 Relatórios e dashboard
Indicadores gerais e relatórios (eventos, corretores, participações) com **exportação CSV**.

### 7.10 Lembretes automáticos (cron)
Job diário dispara **lembretes de eventos** (com antecedência configurável e no dia), de forma
idempotente.

### 7.11 Configurações
Regras globais (aprovação automática de cadastro, antecedência do lembrete), integração WhatsApp
(sync por QR) e importação em massa.

---

## 8. Autenticação e autorização

- **JWT**: `access_token` (curto) + `refresh_token` (longo). O cliente HTTP do frontend renova o
  access token automaticamente quando expira.
- O token de admin carrega o `nivel` (super/operador), usado pelos middlewares e pelo frontend.
- **Middlewares** (`backend/src/middlewares/auth.middleware.ts`):
  - `authenticate` — valida o JWT.
  - `requireAdmin` — exige perfil admin (super **ou** operador).
  - `requireSuperAdmin` — exige `nivel = super` (exclusões, `/usuarios`).
  - `requireCorretor` — exige perfil corretor.
- **Reset de senha**: gera token (1h) e envia o link `https://<portal>/resetar-senha?token=…` por
  WhatsApp (a URL do portal vem de `config.portalUrl`, derivada de `ALLOWED_ORIGINS`).

Detalhes do fluxo JWT em [BACKEND.md §7](BACKEND.md).

---

## 9. Notificações em tempo real (SSE)

- Endpoint **`GET /notifications/stream?token=…`** mantém uma conexão **Server-Sent Events**.
- Os services emitem `emitAdminRefresh(motivo)` quando algo muda (novo cadastro, mudança de status,
  evento publicado etc.); o SSE sinaliza os admins conectados, que recarregam suas notificações.
- O **sino** (NotificationBell) usa o SSE com um *polling* de segurança como fallback.
- O **Nginx** está configurado para não bufferizar o SSE (`proxy_buffering off`, timeout longo) —
  ver [DEPLOY.md](DEPLOY.md).

---

## 10. WhatsApp (Evolution API)

- A API conversa com o **Evolution API v2** (Baileys) via `EVOLUTION_URL` + `EVOLUTION_API_KEY` +
  `EVOLUTION_INSTANCE`.
- Endpoints internos: `GET /whatsapp/status`, `POST /whatsapp/conectar` (retorna QR), `POST
  /whatsapp/desconectar`, `POST /whatsapp/testar`.
- A **conexão** é feita pelo admin em **Configurações → WhatsApp**, escaneando o QR Code com o
  número da IDIBRA.
- Em produção o Evolution roda em **Docker** (com Postgres + Redis próprios), exposto só em
  `localhost:8080`. Detalhes em [DEPLOY.md](DEPLOY.md) e [BACKEND.md §9](BACKEND.md).

---

## 11. Upload de imagens

- Upload via `multipart`; processamento com **sharp** (redimensiona/otimiza, gera WebP).
- Proporções por tipo: **banner** de evento (1200×630), **foto** do corretor, **logo** da imobiliária.
- Arquivos salvos em `UPLOAD_DIR` e servidos publicamente em **`/uploads/...`**. A URL gravada usa
  `API_URL` como base.

---

## 12. Importação em massa (Excel/CSV)

Em **Configurações → Importar dados**:

1. **Baixar modelo** (.xlsx) de imobiliárias ou corretores (com aba de instruções).
2. **Enviar** a planilha preenchida (.xlsx ou .csv).
3. **Pré-visualização** (dry-run): mostra válidos, novos, já existentes e **erros por linha**.
4. **Confirmar**: o admin escolhe **ignorar** ou **atualizar** registros já existentes.

- **Dedupe** por CNPJ (imobiliárias) e CPF/CRECI/e-mail (corretores), tanto na planilha quanto no
  banco. Corretores importados nascem **ativos com senha temporária** (definem a própria via
  "Esqueci a senha"). Vínculo com imobiliária pelo **CNPJ**.
- Endpoints: `GET /import/modelo/{imobiliarias|corretores}`, `POST /import/{…}?dryRun=&modo=`.

---

## 13. API REST — visão geral

Prefixos registrados em `server.ts` (todas as rotas administrativas exigem JWT; sensíveis exigem
super):

| Prefixo | Domínio |
|---|---|
| `/auth` | login, cadastro, refresh, me, trocar/esqueci/resetar senha |
| `/usuarios` | CRUD de admins (super-only) |
| `/corretores` | CRUD, status, foto, reset de senha, `me`, exclusão |
| `/imobiliarias` | CRUD, logo, exclusão |
| `/eventos` | CRUD, status, banner, exclusão |
| `/inscricoes` | inscrição/cancelamento, check-in, export CSV, reenviar QR |
| `/configuracoes` | regras globais |
| `/templates` | mensagens por gatilho |
| `/notifications` | listagem + **/stream** (SSE) |
| `/whatsapp` | status/conectar/desconectar/testar |
| `/relatorios` | dashboard e relatórios |
| `/import` | modelos + importação |
| `/health` | health check |

A referência detalhada de endpoints está em **[BACKEND.md §6](BACKEND.md)**.

---

## 14. Variáveis de ambiente

### Frontend (`.env.local` / `.env.production`) — ver `.env.example`
| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL base da API (ex.: `https://api.corretoridibra.com.br`) |
| `VITE_USE_MOCK` | `true` usa dados mock; `false` chama a API real |

### Backend (`backend/.env`) — ver `backend.env.example`
| Variável | Descrição |
|---|---|
| `NODE_ENV` / `PORT` | ambiente e porta (3000) |
| `DATABASE_URL` | conexão PostgreSQL |
| `JWT_SECRET` / `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | JWT (segredo ≥ 32 chars) |
| `UPLOAD_DIR` / `UPLOAD_MAX_SIZE_MB` / `API_URL` | uploads e URL pública dos arquivos |
| `EVOLUTION_URL` / `EVOLUTION_API_KEY` / `EVOLUTION_INSTANCE` | WhatsApp (Evolution) |
| `WHATSAPP_MIN_DELAY_MS` / `WHATSAPP_MAX_DELAY_MS` | throttle da fila de envio |
| `ALLOWED_ORIGINS` | CORS (a 1ª origem https vira a URL do portal nos links) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_SENHA` | admin criado pelo seed |

---

## 15. Ambiente de desenvolvimento

```bash
# 1) Banco (exemplo com Docker)
docker run --name idibra-pg -e POSTGRES_USER=idibra -e POSTGRES_PASSWORD=idibra \
  -e POSTGRES_DB=idibra_db -p 5432:5432 -d postgres:16

# 2) Backend
cd backend
npm install
cp ../backend.env.example .env          # ajuste DATABASE_URL e JWT_SECRET
npx prisma migrate dev
npm run db:seed
npm run dev                              # http://localhost:3000

# 3) Frontend (na raiz do projeto)
npm install
# .env.local: VITE_API_URL=http://localhost:3000  VITE_USE_MOCK=false
npm run dev                              # http://localhost:5173
```

Qualidade:
```bash
# backend
cd backend && npm run typecheck && npm run lint && npm test
# frontend
npx tsc --noEmit
```

---

## 16. Deploy e produção

- **Produção**: VPS Ubuntu, **Nginx** (estático + proxy/SSE), **PM2** (API), **PostgreSQL 16**,
  **Docker** (Evolution), **Let's Encrypt** (HTTPS).
- **Domínios**: portal em `corretoridibra.com.br` (+ `www`), API em `api.corretoridibra.com.br`.
- **Primeiro deploy**: siga o **[DEPLOY.md](DEPLOY.md)** (passo a passo).
- **Atualizações**: `./deploy.sh` — faz `git pull`, migra o banco, builda backend e frontend e
  reinicia o processo PM2.

---

## 17. SEO

- `index.html` com **title/description/keywords**, **canonical**, **Open Graph**, **Twitter Card**
  e **JSON-LD** (WebSite/Organization), focados em "Corretor IDIBRA".
- **`public/robots.txt`** (permite indexação + aponta o sitemap) e **`public/sitemap.xml`**.
- A **raiz `/`** serve a página de entrada **diretamente** (sem redirect) e é a URL canônica; as
  variações `/login`, `/admin/login`, `/portal/login` redirecionam para `/`.
- Conteúdo de marca visível também no mobile (indexação mobile-first).

---

## 18. Scripts úteis

### Frontend (raiz)
| Script | Ação |
|---|---|
| `npm run dev` | servidor de desenvolvimento (Vite) |
| `npm run build` | build de produção (`dist/`) |
| `npm run preview` | pré-visualiza o build |

### Backend (`backend/`)
| Script | Ação |
|---|---|
| `npm run dev` | API em desenvolvimento (ts-node-dev) |
| `npm run build` / `npm start` | build (tsc + tsc-alias) / executa `dist/server.js` |
| `npm run db:migrate` / `db:migrate:dev` | aplica/cria migrations |
| `npm run db:seed` / `db:reset` | popula / reseta o banco |
| `npm run db:studio` | Prisma Studio |
| `npm run typecheck` / `lint` / `test` | qualidade |

---

## 19. Solução de problemas

| Sintoma | Causa provável / solução |
|---|---|
| Sino só atualiza ao recarregar | SSE caiu → usando polling. Verifique `proxy_buffering off` no Nginx e o token do stream. |
| WhatsApp "dispositivo indisponível, tente mais tarde" | Versão do WhatsApp Web ou bloqueio temporário por muitas tentativas. Ajuste `CONFIG_SESSION_PHONE_VERSION` no Evolution e tente um QR limpo após alguns minutos. |
| Imagens não aparecem | `API_URL` incorreta no `.env` do backend ou `/uploads` não servido pelo Nginx. |
| Build do backend quebra em produção | Rode `npm ci` **sem** `NODE_ENV=production` (precisa das devDeps para `tsc`/`prisma`). |
| Favicon não troca | Cache do navegador — abra `/favicon.ico` direto ou use aba anônima. |
| "Rastreada, mas não indexada" (Google) | Normal para domínio novo. Solicite indexação da **raiz `/`** no Search Console e adicione links externos. |

---

<sub>Documentação do Portal de Corretores IDIBRA · mantida junto ao código.</sub>
