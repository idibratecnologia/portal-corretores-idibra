# IDIBRA API — Backend

API REST do Portal de Corretores IDIBRA. Fastify + Prisma + PostgreSQL.

> Especificação completa da arquitetura: ver [`../BACKEND.md`](../BACKEND.md)

---

## Status de implementação

| Bloco | Descrição | Status |
|---|---|---|
| **1** | Fundação: auth, JWT, config, server, middlewares | ✅ Pronto |
| **2** | CRUD completo (corretores, eventos, inscrições, imobiliárias) | ✅ Pronto |
| **3** | Uploads (foto, banner) com sharp | ✅ Pronto |
| **4** | WhatsApp (Evolution API) + sincronização por QR | ✅ Pronto |
| **5** | Cron de lembretes (D-1 / D-0) | ✅ Pronto |
| **6** | Relatórios + Dashboard (agregações) | ✅ Pronto |
| 7 | Deploy VPS | ⏳ (DEPLOY.md pronto) |
| — | Autenticação completa (trocar/esqueci/resetar senha, refresh) | ✅ Pronto |
| — | Configurações persistentes + rate limit login | ✅ Pronto |
| — | **Testes automatizados (Vitest)** — 65 testes | ✅ Pronto |

---

## Pré-requisitos

- Node.js ≥ 20
- PostgreSQL ≥ 16 rodando localmente

---

## Setup (desenvolvimento)

```bash
# 1. Instalar dependências
cd backend
npm install

# 2. Configurar ambiente
cp .env.example .env
# Edite .env — no mínimo: DATABASE_URL e JWT_SECRET (openssl rand -hex 32)

# 3. Criar o banco e aplicar o schema
npm run db:migrate:dev      # cria as tabelas (gera a primeira migration)

# 4. Popular dados iniciais (admin + exemplos)
npm run db:seed

# 5. Subir a API em modo dev (hot reload)
npm run dev
```

A API sobe em `http://localhost:3000`.

### Credenciais padrão (seed)

| Papel | E-mail | Senha |
|---|---|---|
| Admin | `admin@idibra.com.br` | `idibra123` |
| Corretor | `maria.silva@email.com` | `corretor123` |

---

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | API com hot reload (ts-node-dev) |
| `npm run build` | Compila TypeScript → `dist/` |
| `npm start` | Roda a versão compilada (produção) |
| `npm run db:migrate:dev` | Cria/aplica migration em dev |
| `npm run db:migrate` | Aplica migrations em produção |
| `npm run db:seed` | Popula dados iniciais |
| `npm run db:reset` | Reseta o banco e roda o seed |
| `npm run db:studio` | Abre o Prisma Studio (GUI do banco) |
| `npm run typecheck` | Verifica tipos sem compilar |
| `npm test` | Roda a suíte de testes (Vitest) |
| `npm run test:watch` | Testes em modo watch |

---

## WhatsApp (Evolution API) — Bloco 4

As notificações (confirmação de inscrição, lembretes D-1/D-0, aprovação, check-in,
cancelamento, reset de senha) são enviadas via **Evolution API**, conectada ao
WhatsApp da empresa por QR Code.

### Como ativar

1. **Criar o banco do Evolution** (uma vez):
   ```bash
   docker exec idibra-pg psql -U idibra -d idibra_db -c "CREATE DATABASE evolution OWNER idibra"
   ```

2. **Subir o Evolution** (já incluso no `docker-compose.yml`):
   ```bash
   # defina uma chave forte
   $env:EVOLUTION_API_KEY = "uma-chave-forte"   # PowerShell
   docker compose up -d evolution
   ```

3. **Configurar a API** — no `backend/.env`:
   ```env
   EVOLUTION_URL=http://localhost:8080
   EVOLUTION_API_KEY=uma-chave-forte
   EVOLUTION_INSTANCE=idibra
   ```
   Reinicie a API (`npm run dev`).

4. **Sincronizar** — no portal admin: **Configurações → Integração WhatsApp →
   Sincronizar WhatsApp**, escaneie o QR Code com o WhatsApp da empresa
   (idealmente um **número dedicado**). Pronto — a sessão fica persistida no
   volume do container e permanece conectada entre reinícios.

### Endpoints (admin)

| Método | Rota | Descrição |
|---|---|---|
| GET  | `/whatsapp/status`      | Estado da conexão (`open`/`close`/...) |
| POST | `/whatsapp/conectar`    | Inicia conexão, retorna QR Code (base64) |
| POST | `/whatsapp/desconectar` | Faz logout da instância |

> Com `EVOLUTION_URL`/`EVOLUTION_API_KEY` vazios, o WhatsApp fica **desativado**
> e o `notify()` apenas registra no log — sem quebrar nenhum fluxo.

### Troubleshooting — QR Code não aparece (loop sem gerar)

**Sintoma:** `GET /instance/connect/idibra` retorna sempre `{ count: 0 }` (sem
`base64`) e o log do container repete `Browser / Baileys version / Group Ignore`
a cada poucos segundos, sem emitir o QR.

**Causa:** incompatibilidade entre a versão do **Baileys** (biblioteca de WhatsApp
Web embutida na imagem do Evolution) e a versão **atual** do WhatsApp Web. A
imagem pinada usa uma versão que pode estar defasada — o WhatsApp recusa o
handshake e o socket reinicia antes de gerar o QR.

**Diagnóstico já feito (ambiente local IDIBRA):**
- Host alcança `web.whatsapp.com`, `g.whatsapp.net`, `e1.whatsapp.net` (porta 443) → **não é firewall**.
- Evolution conecta no Postgres normalmente.
- Testadas as imagens `v2.1.1` e `v2.2.3` + override `CONFIG_SESSION_PHONE_VERSION` → mesmo loop.

**Causa raiz confirmada** (via logs `LOG_BAILEYS=debug`):
```
"not logged in, attempting registration..."
Error: Connection Failure ... noise-handler.js decodeFrame
"connection errored"   →  appVersion 2.3000.1015901307 (defasada) recusada
```
O WhatsApp rejeita o handshake quando a versão do WhatsApp Web embutida está velha.

**✅ Solução (aplicada):** forçar a **versão atual** do WhatsApp Web via env
`CONFIG_SESSION_PHONE_VERSION`. Obter a versão vigente em:
```bash
curl https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json
# → { "version": [2, 3000, 1035194821] }  →  use "2.3000.1035194821"
```
Já configurado no `docker-compose.yml` (env `CONFIG_SESSION_PHONE_VERSION`, com
override por `EVOLUTION_WA_VERSION`). Se um dia o QR voltar a falhar, **atualize
esse número** com a versão vigente do link acima e recrie o container.

> Validado localmente: com `2.3000.1035194821` o QR é gerado normalmente e
> aparece em **Configurações → Integração WhatsApp**.

### Ambiente local já preparado

- Container `idibra-evolution` criado (parado) → reativar com `docker start idibra-evolution`
- Banco `evolution` já criado no Postgres
- Chave usada no teste local: `EVOLUTION_API_KEY=idibra-local-dev-key-2026`

---

## Testes

A suíte usa **Vitest** com um **banco de testes isolado** (`idibra_test`),
recriado a cada execução e limpo entre cada teste — sem tocar nos dados de dev.

```bash
# Pré-requisito: criar o banco de testes uma vez
docker exec idibra-pg psql -U idibra -d idibra_db -c "CREATE DATABASE idibra_test OWNER idibra"

# Rodar
npm test
```

**Cobertura (65 testes):**
- `lib/` — hash, jwt, paginação (unitários)
- `auth` — login (admin/corretor/pendente/bloqueado/senha errada), cadastro
  (auto-approve, duplicidade), trocar/esqueci/resetar senha (token único, expirado)
- `eventos` — criação, máquina de estados (transições válidas/inválidas), cancelamento
- `inscricoes` — regras (evento publicado, inscrições abertas, duplicata, capacidade,
  reinscrição), cancelamento (dono/admin/presente), check-in (válido/duplicado/cancelado)
- `imobiliarias` — CRUD, CNPJ único, contagem de corretores, SetNull ao excluir
- `corretores` — criação (duplicidade, senha protegida), aprovação + notificação, filtros

> O ambiente de teste é configurado em `vitest.config.ts` (banco, JWT, env) e
> `src/test/` (global-setup aplica o schema, setup limpa as tabelas, factories criam dados).

---

## Endpoints disponíveis

### Auth (Bloco 1)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET  | `/health` | — | Health check |
| POST | `/auth/login` | — | Login (admin ou corretor) |
| POST | `/auth/cadastro` | — | Auto-cadastro de corretor |
| POST | `/auth/refresh` | — | Renova access token |
| POST | `/auth/logout` | — | Logout (stateless) |
| GET  | `/auth/me` | admin | Dados do admin logado |

### Corretores (Bloco 2)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET   | `/corretores/me` | corretor | Perfil do corretor logado |
| PATCH | `/corretores/me/opt-in` | corretor | Corretor altera o próprio opt-in WhatsApp |
| GET   | `/corretores` | admin | Listar (filtros: search, status, imobiliaria_id, page, limit, sort, order) |
| GET   | `/corretores/:id` | admin | Detalhe |
| POST  | `/corretores` | admin | Criar |
| PATCH | `/corretores/:id` | admin | Editar |
| PATCH | `/corretores/:id/status` | admin | Aprovar / bloquear (dispara WhatsApp) |
| PATCH | `/corretores/:id/opt-in` | admin | Alterar opt-in |
| POST   | `/corretores/:id/foto` | dono/admin | Upload de foto (multipart, campo `foto`) |
| DELETE | `/corretores/:id/foto` | dono/admin | Remover foto |

### Imobiliárias (Bloco 2)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET    | `/imobiliarias` | admin | Listar (com contagem de corretores) |
| GET    | `/imobiliarias/:id` | admin | Detalhe + corretores vinculados |
| POST   | `/imobiliarias` | admin | Criar |
| PATCH  | `/imobiliarias/:id` | admin | Editar |
| PATCH  | `/imobiliarias/:id/status` | admin | Ativar / inativar |
| DELETE | `/imobiliarias/:id` | admin | Excluir |

### Eventos (Bloco 2)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET   | `/eventos` | autenticado | Listar (corretor vê só publicados; admin vê todos) |
| GET   | `/eventos/:id` | autenticado | Detalhe + total_inscritos/total_presentes |
| POST  | `/eventos` | admin | Criar (nasce rascunho) |
| PATCH | `/eventos/:id` | admin | Editar |
| PATCH | `/eventos/:id/status` | admin | Publicar/encerrar/cancelar (valida transições; cancelar dispara WhatsApp) |
| POST   | `/eventos/:id/banner` | admin | Upload de banner (multipart, campo `banner`) |
| DELETE | `/eventos/:id/banner` | admin | Remover banner |

### Uploads (Bloco 3)

Imagens são redimensionadas e convertidas para **WebP** com `sharp`:
- **Fotos** de perfil → 400×400 (quadrado)
- **Banners** de evento → 1280×720 (16:9)

São salvas em `{UPLOAD_DIR}/fotos|banners/{uuid}.webp` e servidas em `/uploads/...`.
A foto/banner anterior é removida automaticamente ao enviar uma nova.
Validações: tipo (JPG/PNG/WebP) e tamanho (máx `UPLOAD_MAX_SIZE_MB`).

```bash
# Exemplo — upload de foto
curl -X POST http://localhost:3000/corretores/SEU_ID/foto \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "foto=@/caminho/para/foto.jpg"
# → { "foto_url": "http://localhost:3000/uploads/fotos/uuid.webp" }
```

### Inscrições (Bloco 2)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET   | `/inscricoes/me` | corretor | Inscrições do corretor logado |
| POST  | `/inscricoes` | corretor | Inscrever-se (valida status, capacidade, duplicata; dispara WhatsApp) |
| PATCH | `/inscricoes/:id/cancelar` | corretor/admin | Cancelar (dono ou admin) |
| GET   | `/inscricoes?evento_id=…` | admin | Inscritos de um evento |
| GET   | `/inscricoes?corretor_id=…` | admin | Inscrições de um corretor |
| POST  | `/inscricoes/checkin` | admin | Check-in por QR token (dispara WhatsApp) |
| PATCH | `/inscricoes/:id/status` | admin | Marcar presente/ausente manualmente |

> **Disparos de WhatsApp** estão implementados como _stub_ em `src/lib/notifications.ts`:
> registram no `NotificacaoLog` e logam no console. O envio real entra no Bloco 4
> (Evolution API). O opt-in do corretor é sempre respeitado (LGPD).

### Exemplo — login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@idibra.com.br","senha":"idibra123"}'
```

Resposta:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": { "id": "...", "nome": "Administrador IDIBRA", "role": "admin" }
}
```

### Exemplo — rota autenticada

```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

---

## Estrutura

```
backend/
├── prisma/
│   ├── schema.prisma      ← modelo de dados completo
│   └── seed.ts            ← dados iniciais
├── src/
│   ├── config.ts          ← env validado com Zod
│   ├── server.ts          ← Fastify + plugins + error handler
│   ├── lib/
│   │   ├── prisma.ts      ← singleton PrismaClient
│   │   ├── jwt.ts         ← sign/verify de tokens
│   │   ├── hash.ts        ← bcrypt
│   │   └── errors.ts      ← erros tipados (AppError, etc.)
│   ├── middlewares/
│   │   └── auth.middleware.ts  ← authenticate, requireAdmin, requireCorretor
│   └── modules/
│       ├── auth/          ← login, cadastro, refresh, me
│       └── corretores/    ← /me (CRUD vem no Bloco 2)
└── ecosystem.config.js    ← PM2
```

---

## Conectar o frontend

No frontend, ajuste o `.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_USE_MOCK=false
```

Com `VITE_USE_MOCK=false`, o `AuthContext` e os services passam a chamar esta API.
