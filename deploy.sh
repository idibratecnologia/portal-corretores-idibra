#!/usr/bin/env bash
#
# Deploy/atualização do Portal de Corretores IDIBRA na VPS.
#
# O que faz, em ordem:
#   1. git pull (a menos que --no-pull)
#   2. Backend: instala deps → prisma migrate deploy + generate → build → reinicia (PM2)
#   3. Frontend: instala deps → build (Nginx serve a pasta dist/)
#
# Uso (na raiz do projeto, na VPS):
#   ./deploy.sh                 # deploy completo
#   ./deploy.sh --no-pull       # sem git pull (usa o código atual)
#   ./deploy.sh --backend       # só backend
#   ./deploy.sh --frontend      # só frontend
#   ./deploy.sh --skip-migrate  # não roda migrations (deploy só de código)
#
# Requisitos: node 20+, npm, pm2, git e o .env do backend já configurados.

set -euo pipefail

# ── Configuração ───────────────────────────────────────────────────
PM2_APP="idibra-api"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

# ── Flags ──────────────────────────────────────────────────────────
DO_PULL=true
DO_BACKEND=true
DO_FRONTEND=true
DO_MIGRATE=true

for arg in "$@"; do
  case "$arg" in
    --no-pull)      DO_PULL=false ;;
    --backend)      DO_FRONTEND=false ;;
    --frontend)     DO_BACKEND=false ;;
    --skip-migrate) DO_MIGRATE=false ;;
    -h|--help)
      # imprime só o bloco de cabeçalho (até a primeira linha não-comentário)
      awk 'NR>1 && /^#/ {sub(/^# ?/,""); print; next} NR>1 {exit}' "$0"; exit 0 ;;
    *) echo "Argumento desconhecido: $arg (use --help)"; exit 1 ;;
  esac
done

# ── Helpers de log ─────────────────────────────────────────────────
BOLD="$(tput bold 2>/dev/null || true)"; GREEN="$(tput setaf 2 2>/dev/null || true)"
YELLOW="$(tput setaf 3 2>/dev/null || true)"; RESET="$(tput sgr0 2>/dev/null || true)"
step() { echo; echo "${BOLD}${GREEN}▶ $*${RESET}"; }
info() { echo "  ${YELLOW}$*${RESET}"; }

START_TS=$(date +%s)
cd "$ROOT_DIR"

# ── 0. Sanidade ────────────────────────────────────────────────────
if [ ! -d "$BACKEND_DIR" ]; then
  echo "Erro: pasta backend/ não encontrada. Rode na raiz do projeto."; exit 1
fi

# ── 1. Git pull ────────────────────────────────────────────────────
if $DO_PULL; then
  step "Atualizando o código (git pull)"
  git pull --ff-only
else
  info "Pulando git pull (--no-pull)"
fi

# ── 2. Backend ─────────────────────────────────────────────────────
if $DO_BACKEND; then
  step "Backend — instalando dependências"
  cd "$BACKEND_DIR"
  npm install --no-audit --no-fund

  if $DO_MIGRATE; then
    step "Backend — aplicando migrations (prisma migrate deploy)"
    npx prisma migrate deploy
    npx prisma generate
  else
    info "Pulando migrations (--skip-migrate) — gerando client mesmo assim"
    npx prisma generate
  fi

  step "Backend — build (tsc + tsc-alias)"
  npm run build

  step "Backend — reiniciando no PM2 ($PM2_APP)"
  if pm2 describe "$PM2_APP" > /dev/null 2>&1; then
    pm2 reload "$PM2_APP" --update-env   # zero-downtime em cluster
  else
    info "App ainda não existe no PM2 — iniciando pela primeira vez"
    pm2 start ecosystem.config.js
    pm2 save
  fi
  cd "$ROOT_DIR"
fi

# ── 3. Frontend ────────────────────────────────────────────────────
if $DO_FRONTEND; then
  step "Frontend — instalando dependências"
  cd "$ROOT_DIR"
  npm install --no-audit --no-fund

  step "Frontend — build (gera dist/)"
  npm run build
  info "Nginx serve a nova dist/ automaticamente (sem reload)"
fi

# ── 4. Verificação rápida ──────────────────────────────────────────
if $DO_BACKEND; then
  step "Verificando a API (health check)"
  sleep 2
  if curl -fsS http://localhost:3000/health > /dev/null 2>&1; then
    info "API respondendo em /health ✅"
  else
    echo "  ⚠️  /health não respondeu — confira: pm2 logs $PM2_APP"
  fi
fi

ELAPSED=$(( $(date +%s) - START_TS ))
step "Deploy concluído em ${ELAPSED}s 🎉"
