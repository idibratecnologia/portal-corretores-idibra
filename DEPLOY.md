# IDIBRA — Guia de Deploy na VPS

Passo a passo completo para subir banco, backend e frontend numa VPS Ubuntu do zero.

> Pré-requisito: uma VPS com **Ubuntu 22.04 LTS** e acesso `root` via SSH.
> Recomendado: 2 vCPU, 4 GB RAM, 40 GB SSD (mínimo: 1 vCPU, 2 GB).

**Sumário**
1. [Acesso inicial e segurança](#1-acesso-inicial-e-segurança)
2. [Instalar dependências](#2-instalar-dependências)
3. [Configurar PostgreSQL](#3-configurar-postgresql)
4. [Apontar o domínio (DNS)](#4-apontar-o-domínio-dns)
5. [Deploy do Backend](#5-deploy-do-backend)
6. [Deploy do Frontend](#6-deploy-do-frontend)
7. [Nginx + SSL](#7-nginx--ssl)
8. [Evolution API (WhatsApp)](#8-evolution-api-whatsapp)
9. [Backup automático](#9-backup-automático)
10. [Atualizações futuras](#10-atualizações-futuras)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Acesso inicial e segurança

### 1.1 Conectar via SSH

```bash
ssh root@SEU_IP_DA_VPS
```

### 1.2 Atualizar o sistema

```bash
apt update && apt upgrade -y
```

### 1.3 Criar usuário não-root (boas práticas)

```bash
# Cria o usuário 'idibra' e adiciona ao grupo sudo
adduser idibra
usermod -aG sudo idibra

# Copia as chaves SSH do root para o novo usuário (mantém o login por chave)
rsync --archive --chown=idibra:idibra ~/.ssh /home/idibra
```

A partir daqui, conecte como `idibra`:
```bash
ssh idibra@SEU_IP_DA_VPS
```

### 1.4 Configurar firewall (UFW)

```bash
sudo ufw allow OpenSSH      # porta 22
sudo ufw allow 80/tcp       # HTTP
sudo ufw allow 443/tcp      # HTTPS
sudo ufw enable
sudo ufw status             # confirmar
```

> ⚠️ As portas 3000 (API), 5432 (PostgreSQL) e 8080 (Evolution) **não** ficam abertas
> externamente — só são acessadas internamente via `localhost`.

---

## 2. Instalar dependências

### 2.1 Node.js 20 (via NodeSource)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v     # confirmar: v20.x e 10.x
```

### 2.2 PostgreSQL 16

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
psql --version        # confirmar
```

### 2.3 Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx
```

### 2.4 PM2 (gerenciador de processos)

```bash
sudo npm install -g pm2
```

### 2.5 Git

```bash
sudo apt install -y git
```

### 2.6 Docker (para a Evolution API — pode deixar para o passo 8)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker idibra
# Saia e reconecte o SSH para o grupo docker valer
```

---

## 3. Configurar PostgreSQL

### 3.1 Criar usuário e banco

```bash
sudo -u postgres psql
```

Dentro do `psql`, rode (troque a senha):

```sql
CREATE USER idibra WITH PASSWORD 'TroquePorUmaSenhaForte';
CREATE DATABASE idibra_db OWNER idibra;
GRANT ALL PRIVILEGES ON DATABASE idibra_db TO idibra;
\q
```

### 3.2 Testar a conexão

```bash
psql "postgresql://idibra:TroquePorUmaSenhaForte@localhost:5432/idibra_db" -c "SELECT 1;"
```

Se retornar `1`, está funcionando.

> O PostgreSQL já vem configurado para aceitar conexões só de `localhost` por padrão.
> Não altere isso — a API roda na mesma máquina.

---

## 4. Apontar o domínio (DNS)

No painel do seu provedor de domínio, crie dois registros **A** apontando para o IP da VPS:

| Tipo | Nome | Valor |
|---|---|---|
| A | `@`   | `SEU_IP_DA_VPS` |
| A | `www` | `SEU_IP_DA_VPS` |
| A | `api` | `SEU_IP_DA_VPS` |

Resultando em:
- `corretoridibra.com.br` (e `www`) → frontend (portal)
- `api.corretoridibra.com.br` → backend

> A propagação do DNS pode levar de minutos a algumas horas. Confirme com:
> `dig corretoridibra.com.br +short` e `dig api.corretoridibra.com.br +short`

---

## 5. Deploy do Backend

### 5.1 Clonar o repositório

```bash
# Crie a pasta de aplicações
sudo mkdir -p /var/www
sudo chown idibra:idibra /var/www
cd /var/www

# Clone (use o repositório real)
git clone https://github.com/idibratecnologia/portal-corretores-idibra.git idibra
cd idibra/backend
```

### 5.2 Instalar dependências

```bash
npm install
```

### 5.3 Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env
```

Preencha:

```env
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://idibra:TroquePorUmaSenhaForte@localhost:5432/idibra_db

# Gere com: openssl rand -hex 32
JWT_SECRET=COLE_AQUI_O_RESULTADO_DO_OPENSSL
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=30d

UPLOAD_DIR=/var/www/uploads
UPLOAD_MAX_SIZE_MB=10
API_URL=https://api.corretoridibra.com.br

# Evolution — preencher no passo 8
EVOLUTION_URL=http://localhost:8080
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=idibra

# Fila de envio do WhatsApp (throttle anti-bloqueio da Meta).
# Atraso entre mensagens varia entre min e max (jitter). API não oficial:
# valores baixos = risco de bloqueio do número. 4–9s é um ponto seguro.
WHATSAPP_MIN_DELAY_MS=4000
WHATSAPP_MAX_DELAY_MS=9000

ALLOWED_ORIGINS=https://corretoridibra.com.br
```

> **Disparos em massa** (broadcast de evento publicado, lembretes) passam por uma
> fila com throttle — o admin acompanha a fila em **Configurações → WhatsApp**.
> Ajuste `WHATSAPP_MIN/MAX_DELAY_MS` conforme o volume; quanto maior, mais seguro.

Gere o JWT_SECRET:
```bash
openssl rand -hex 32
```

### 5.4 Criar os diretórios de upload

```bash
# banners de eventos, fotos de corretores e logos de imobiliárias
sudo mkdir -p /var/www/uploads/banners /var/www/uploads/fotos /var/www/uploads/logos
sudo chown -R idibra:idibra /var/www/uploads
```

> Os subdiretórios também são criados automaticamente pelo backend no primeiro
> upload de cada tipo, mas criá-los aqui garante as permissões corretas desde já.

### 5.5 Aplicar o schema do banco + seed

```bash
npx prisma migrate deploy     # cria as tabelas
npm run db:seed               # cria o admin padrão
npx prisma generate           # gera o client (se necessário)
```

> ⚠️ Em produção o seed cria **apenas** o admin (e-mail `admin@idibra.com.br`,
> senha `idibra123`). **Troque essa senha no primeiro login.**
> Para customizar, defina `SEED_ADMIN_EMAIL` e `SEED_ADMIN_SENHA` no `.env` antes do seed.

### 5.6 Compilar e subir com PM2

```bash
npm run build                          # gera dist/
pm2 start ecosystem.config.js          # sobe em cluster
pm2 save                               # salva a lista de processos
pm2 startup                            # gera o comando para iniciar no boot
# → copie e rode o comando que o pm2 imprimir (começa com 'sudo env ...')
```

### 5.7 Testar a API

```bash
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"..."}

curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@idibra.com.br","senha":"idibra123"}'
# → deve retornar access_token
```

Comandos úteis do PM2:
```bash
pm2 logs idibra-api      # ver logs em tempo real
pm2 restart idibra-api   # reiniciar
pm2 monit                # monitor interativo
```

---

## 6. Deploy do Frontend

### 6.1 Configurar o ambiente de build

```bash
cd /var/www/idibra        # raiz do projeto (frontend)
cp .env.example .env.production
nano .env.production
```

Preencha:
```env
VITE_API_URL=https://api.corretoridibra.com.br
VITE_USE_MOCK=false
```

### 6.2 Instalar dependências e buildar

```bash
npm install
npm run build             # gera a pasta dist/
```

### 6.3 Servir o build

O Nginx vai servir a pasta `dist/` diretamente (configurado no passo 7).
O build já está em `/var/www/idibra/dist`.

> Alternativa: copiar para um local dedicado.
> `sudo mkdir -p /var/www/portal && sudo cp -r dist/* /var/www/portal/`
> Se fizer isso, ajuste o `root` no Nginx para `/var/www/portal`.

---

## 7. Nginx + SSL

### 7.1 Criar a configuração do site

```bash
sudo nano /etc/nginx/sites-available/idibra
```

Cole (ajuste os domínios se necessário):

```nginx
# ── Frontend (corretoridibra.com.br) ──
server {
  listen 80;
  server_name corretoridibra.com.br www.corretoridibra.com.br;
  root /var/www/idibra/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;   # SPA routing
  }

  gzip on;
  gzip_types text/plain text/css application/javascript application/json image/svg+xml;
}

# ── API (api.corretoridibra.com.br) ──
server {
  listen 80;
  server_name api.corretoridibra.com.br;

  client_max_body_size 10M;             # tamanho máximo de upload

  # Notificações em tempo real (SSE) — NÃO pode bufferizar, senão os
  # eventos só chegam ao fechar a conexão. Mantém o stream aberto por horas.
  location /notifications/stream {
    proxy_pass            http://127.0.0.1:3000;
    proxy_http_version    1.1;
    proxy_set_header      Host $host;
    proxy_set_header      X-Real-IP $remote_addr;
    proxy_set_header      X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header      X-Forwarded-Proto $scheme;
    proxy_set_header      Connection '';        # mantém keep-alive
    proxy_buffering       off;                   # essencial para SSE
    proxy_cache           off;
    proxy_read_timeout    1h;                    # não derruba o stream
    chunked_transfer_encoding off;
  }

  location / {
    proxy_pass         http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
  }

  # Serve uploads diretamente (sem passar pela API)
  location /uploads/ {
    alias /var/www/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
  }
}
```

> A rota `/notifications/stream` é o canal SSE que mantém o sino de notificações
> do admin em **tempo real**. Sem `proxy_buffering off`, o Nginx segura os eventos
> e a atualização instantânea não funciona (o backend já envia o header
> `X-Accel-Buffering: no`, mas a config explícita garante).

### 7.2 Ativar o site

```bash
sudo ln -s /etc/nginx/sites-available/idibra /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default     # remove o site padrão
sudo nginx -t                                   # testar config
sudo systemctl reload nginx
```

Neste ponto, `http://corretoridibra.com.br` já deve carregar.

### 7.3 Instalar SSL (HTTPS gratuito via Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d corretoridibra.com.br -d www.corretoridibra.com.br -d api.corretoridibra.com.br
```

O Certbot:
- pede um e-mail (para avisos de renovação)
- pergunta se quer redirecionar HTTP→HTTPS → **escolha sim (opção 2)**
- configura a renovação automática

Testar a renovação:
```bash
sudo certbot renew --dry-run
```

Pronto — `https://corretoridibra.com.br` e `https://api.corretoridibra.com.br` no ar.

---

## 8. Evolution API (WhatsApp)

> Pode ser feito depois, quando for ativar os disparos (Bloco 4 do backend).

### 8.1 Subir o container

```bash
docker run -d \
  --name evolution-api \
  --restart always \
  -p 127.0.0.1:8080:8080 \
  -e AUTHENTICATION_TYPE=apikey \
  -e AUTHENTICATION_API_KEY=GERE_UMA_CHAVE_FORTE \
  -v evolution_data:/evolution/instances \
  atendai/evolution-api:latest
```

> Note o `127.0.0.1:8080:8080` — expõe a porta **apenas** localmente, nunca à internet.

### 8.2 Conectar o número da IDIBRA

A Evolution não tem painel próprio acessível externamente (por segurança). Use a API
para criar a instância e gerar o QR Code, ou abra um túnel SSH temporário:

```bash
# No SEU computador local (não na VPS):
ssh -L 8080:localhost:8080 idibra@SEU_IP_DA_VPS
# Agora acesse http://localhost:8080 no navegador local
```

Crie a instância chamada `idibra` e escaneie o QR Code com o WhatsApp do número oficial.

### 8.3 Atualizar o .env do backend

```bash
cd /var/www/idibra/backend
nano .env
# Preencha EVOLUTION_API_KEY com a chave usada no passo 8.1
pm2 restart idibra-api
```

---

## 9. Backup automático

### 9.1 Script de backup do banco

```bash
sudo nano /usr/local/bin/backup-idibra.sh
```

Cole:

```bash
#!/bin/bash
BACKUP_DIR=/var/backups/idibra
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup do banco
pg_dump "postgresql://idibra:TroquePorUmaSenhaForte@localhost:5432/idibra_db" \
  | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Backup dos uploads
tar -czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" -C /var/www uploads

# Mantém apenas os últimos 14 dias
find $BACKUP_DIR -name "*.gz" -mtime +14 -delete
```

```bash
sudo chmod +x /usr/local/bin/backup-idibra.sh
```

### 9.2 Agendar via cron (todo dia às 03h)

```bash
sudo crontab -e
```

Adicione a linha:
```
0 3 * * * /usr/local/bin/backup-idibra.sh
```

### 9.3 Restaurar um backup (quando necessário)

```bash
gunzip -c /var/backups/idibra/db_TIMESTAMP.sql.gz | \
  psql "postgresql://idibra:SENHA@localhost:5432/idibra_db"
```

---

## 10. Atualizações futuras

O repositório já inclui um script **`deploy.sh`** na raiz que automatiza todo o
processo (git pull → backend deps/migrate/build/restart → frontend build).

### Uso (recomendado)

```bash
cd /var/www/idibra
chmod +x deploy.sh        # só na primeira vez
./deploy.sh               # deploy completo
```

Opções:
```bash
./deploy.sh --no-pull       # não roda git pull (usa o código atual)
./deploy.sh --backend       # só backend
./deploy.sh --frontend      # só frontend
./deploy.sh --skip-migrate  # deploy de código sem rodar migrations
./deploy.sh --help          # ajuda
```

O script faz health check em `/health` ao final e usa `pm2 reload` (zero-downtime
em cluster). Na primeira execução, se o app ainda não existir no PM2, ele roda
`pm2 start ecosystem.config.js` + `pm2 save`.

### Manual (equivalente, caso prefira)

```bash
cd /var/www/idibra && git pull
# Backend
cd backend && npm install && npx prisma migrate deploy && npx prisma generate && npm run build && pm2 reload idibra-api
# Frontend
cd /var/www/idibra && npm install && npm run build
# Nginx serve a nova dist/ automaticamente (não precisa reload)
```

---

## 11. Troubleshooting

| Sintoma | Diagnóstico | Solução |
|---|---|---|
| API não responde | `pm2 logs idibra-api` | Ver erro nos logs; conferir `.env` |
| `502 Bad Gateway` no Nginx | API caiu | `pm2 restart idibra-api` |
| Erro de conexão com banco | `DATABASE_URL` errada | Testar com `psql` (passo 3.2) |
| `prisma migrate` falha | Banco inacessível ou schema divergente | Conferir credenciais; `npx prisma migrate status` |
| Frontend mostra tela branca | Build falhou ou caminho errado | Conferir `root` no Nginx; rebuildar |
| CORS bloqueado no navegador | `ALLOWED_ORIGINS` errado | Incluir o domínio exato do portal no `.env` da API |
| SSL não renova | Certbot timer parado | `sudo systemctl status certbot.timer` |
| WhatsApp não envia | Instância desconectada | Reescanear QR; ver logs do container `docker logs evolution-api` |
| Notificações não atualizam em tempo real | Nginx bufferizando o SSE | Conferir o bloco `location /notifications/stream` com `proxy_buffering off` (passo 7.1) e recarregar o Nginx |
| Sino só atualiza ao recarregar / a cada 2 min | SSE caiu, usando só o polling de segurança | Testar `curl -N https://api.corretoridibra.com.br/notifications/stream?token=...`; ver `proxy_read_timeout` |
| Mensagens de WhatsApp saindo muito devagar | Throttle alto na fila | Reduzir `WHATSAPP_MIN/MAX_DELAY_MS` (cuidado com bloqueio); acompanhar a fila em Configurações |
| Imagem (banner/logo/foto) quebrada | Permissão ou caminho do upload | Conferir `/var/www/uploads/{banners,fotos,logos}` e o `alias` do Nginx |

### Comandos de diagnóstico rápido

```bash
pm2 status                          # estado da API
sudo systemctl status nginx         # estado do Nginx
sudo systemctl status postgresql    # estado do banco
docker ps                           # containers rodando
sudo tail -f /var/log/nginx/error.log   # erros do Nginx
curl http://localhost:3000/health   # API local responde?
```

---

## Checklist final de produção

- [ ] Firewall ativo (só 22, 80, 443)
- [ ] Senha do admin padrão trocada
- [ ] `JWT_SECRET` forte e único (não o do exemplo)
- [ ] Senha do PostgreSQL forte
- [ ] SSL ativo nos dois domínios
- [ ] `NODE_ENV=production` no `.env` da API
- [ ] PM2 configurado para iniciar no boot (`pm2 startup` + `pm2 save`)
- [ ] Backup automático agendado e testado
- [ ] Evolution API exposta só em `127.0.0.1`
- [ ] `VITE_USE_MOCK=false` no build do frontend
```
