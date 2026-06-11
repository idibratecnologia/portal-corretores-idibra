<div align="center">

# Portal de Corretores IDIBRA

**Plataforma de gestão de corretores parceiros, eventos e credenciamento da IDIBRA.**

🌐 Produção: **[corretoridibra.com.br](https://corretoridibra.com.br)** · API: `api.corretoridibra.com.br`

![React](https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-4-000000?logo=fastify&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)

</div>

---

## 📋 Sobre

O Portal de Corretores IDIBRA tem **dois ambientes** em uma única aplicação:

- **Painel Administrativo** — a equipe IDIBRA gerencia corretores, imobiliárias, eventos, inscrições, credenciamento, notificações e relatórios.
- **Portal do Corretor** — o corretor parceiro acessa eventos, inscreve-se, recebe o QR Code de check-in e acompanha seu histórico.

Comunicação com os corretores por **WhatsApp** (Evolution API), **check-in por QR Code**, **credenciamento/quiosque** com impressão de comprovante e **notificações em tempo real** (SSE).

## ✨ Principais funcionalidades

- 🔐 **Autenticação JWT** (access + refresh) com dois níveis de admin: **super** (acesso total) e **operador** (cria/edita/vê, sem excluir)
- 👥 **Gestão de corretores, imobiliárias e usuários** (CRUD, aprovação de cadastros, foto com recorte)
- 📅 **Eventos** com ciclo de vida (rascunho → publicado → encerrado/cancelado), banner e inscrições
- 🎟️ **Inscrições + QR Code** de check-in
- ✅ **Credenciamento** e **Modo Quiosque** (QR ou busca manual) com **impressão de comprovante de presença**
- 📥 **Importação em massa** de corretores/imobiliárias via **Excel/CSV** (com pré-visualização)
- 🔔 **Central de Notificações** com templates editáveis por gatilho + **WhatsApp** (fila com throttle anti-bloqueio)
- ⚡ **Notificações em tempo real** via Server-Sent Events (SSE)
- 📊 **Dashboard e relatórios** com exportação CSV
- ⏰ **Lembretes automáticos** de eventos (cron)
- 🔎 **SEO** (metadados, Open Graph, JSON-LD, sitemap, robots)

## 🛠️ Stack

| Camada | Tecnologias |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui (Radix), React Router, React Hook Form, Zod, Recharts, html5-qrcode |
| **Backend** | Fastify, Prisma, PostgreSQL, JWT, bcrypt, Zod, sharp (imagens), node-cron, xlsx |
| **Integrações** | Evolution API (WhatsApp), SSE (tempo real) |
| **Infra** | Nginx, PM2, Docker (Evolution), Let's Encrypt (HTTPS), VPS Ubuntu |

## 🚀 Rodando localmente

> Pré-requisitos: **Node 20+** e **PostgreSQL** (local ou via Docker).

### Backend (API)

```bash
cd backend
npm install
cp ../backend.env.example .env      # edite DATABASE_URL, JWT_SECRET, etc.
npx prisma migrate dev              # cria as tabelas
npm run db:seed                     # cria o admin padrão
npm run dev                         # http://localhost:3000
```

Admin padrão (configurável via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_SENHA`): `admin@idibra.com.br` / `idibra123`.

### Frontend

```bash
npm install
# .env.local:  VITE_API_URL=http://localhost:3000  e  VITE_USE_MOCK=false
npm run dev                         # http://localhost:5173
```

> Com `VITE_USE_MOCK=true` (padrão) a interface roda com **dados de exemplo**, sem precisar do backend.

## 📁 Estrutura

```
.
├── src/                 # Frontend (React)
│   ├── pages/           # Telas (admin/ e corretor/)
│   ├── components/      # Componentes (ui/, admin/, corretor/, shared/)
│   ├── services/        # Chamadas à API
│   ├── contexts/        # AuthContext
│   ├── hooks/ · lib/    # Hooks e utilitários
├── backend/             # API (Fastify + Prisma)
│   ├── src/modules/     # auth, corretores, eventos, inscricoes, import, usuarios…
│   ├── src/lib/         # jwt, evolution, notifications, csv, storage…
│   └── prisma/          # schema, migrations, seed
├── public/              # favicon, robots.txt, sitemap.xml, og-image
└── *.md                 # Documentação (abaixo)
```

## 📚 Documentação

| Documento | Conteúdo |
|---|---|
| **[DOCUMENTACAO.md](DOCUMENTACAO.md)** | Documentação completa da aplicação (arquitetura, módulos, fluxos, modelo de dados, permissões) |
| **[BACKEND.md](BACKEND.md)** | Detalhes técnicos do backend (schema, endpoints, JWT, uploads) |
| **[DEPLOY.md](DEPLOY.md)** | Guia passo a passo de deploy na VPS |

## 🚢 Deploy

Produção em VPS (Ubuntu) com Nginx + PM2 + PostgreSQL + Docker (Evolution). Primeiro deploy: siga o **[DEPLOY.md](DEPLOY.md)**. Atualizações: `./deploy.sh` (puxa do Git, migra, builda e reinicia).

---

<div align="center">
<sub>© IDIBRA — Portal de Corretores Parceiros</sub>
</div>
