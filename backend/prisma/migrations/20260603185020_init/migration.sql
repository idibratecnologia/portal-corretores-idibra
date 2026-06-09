-- CreateEnum
CREATE TYPE "StatusCorretor" AS ENUM ('pendente', 'ativo', 'bloqueado');

-- CreateEnum
CREATE TYPE "StatusImobiliaria" AS ENUM ('ativa', 'inativa');

-- CreateEnum
CREATE TYPE "StatusEvento" AS ENUM ('rascunho', 'publicado', 'encerrado', 'cancelado');

-- CreateEnum
CREATE TYPE "StatusInscricao" AS ENUM ('inscrito', 'presente', 'ausente', 'cancelado');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('lancamento', 'treinamento', 'reuniao', 'feira', 'workshop', 'outro');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imobiliarias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" VARCHAR(18) NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "cidade" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "status" "StatusImobiliaria" NOT NULL DEFAULT 'ativa',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imobiliarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corretores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" VARCHAR(14) NOT NULL,
    "creci" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "whatsapp_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "instagram" TEXT,
    "cidade" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "status" "StatusCorretor" NOT NULL DEFAULT 'pendente',
    "foto_url" TEXT,
    "observacoes_admin" TEXT,
    "imobiliaria_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corretores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "empreendimento" TEXT,
    "local" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "link_maps" TEXT,
    "data_evento" TIMESTAMP(3) NOT NULL,
    "hora_inicio" VARCHAR(5) NOT NULL,
    "hora_fim" VARCHAR(5) NOT NULL,
    "capacidade" INTEGER NOT NULL,
    "banner_url" TEXT,
    "status" "StatusEvento" NOT NULL DEFAULT 'rascunho',
    "inscricoes_abertas" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscricoes" (
    "id" TEXT NOT NULL,
    "status" "StatusInscricao" NOT NULL DEFAULT 'inscrito',
    "qr_code_token" TEXT NOT NULL,
    "checkin_at" TIMESTAMP(3),
    "checkin_por" TEXT,
    "corretor_id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscricoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes_log" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "mensagem" TEXT,
    "erro" TEXT,
    "corretor_id" TEXT NOT NULL,
    "evento_id" TEXT,
    "enviado_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "imobiliarias_cnpj_key" ON "imobiliarias"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "corretores_cpf_key" ON "corretores"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "corretores_creci_key" ON "corretores"("creci");

-- CreateIndex
CREATE UNIQUE INDEX "corretores_email_key" ON "corretores"("email");

-- CreateIndex
CREATE INDEX "corretores_status_idx" ON "corretores"("status");

-- CreateIndex
CREATE INDEX "corretores_imobiliaria_id_idx" ON "corretores"("imobiliaria_id");

-- CreateIndex
CREATE INDEX "eventos_status_idx" ON "eventos"("status");

-- CreateIndex
CREATE INDEX "eventos_data_evento_idx" ON "eventos"("data_evento");

-- CreateIndex
CREATE UNIQUE INDEX "inscricoes_qr_code_token_key" ON "inscricoes"("qr_code_token");

-- CreateIndex
CREATE INDEX "inscricoes_evento_id_idx" ON "inscricoes"("evento_id");

-- CreateIndex
CREATE INDEX "inscricoes_status_idx" ON "inscricoes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "inscricoes_corretor_id_evento_id_key" ON "inscricoes"("corretor_id", "evento_id");

-- CreateIndex
CREATE INDEX "notificacoes_log_corretor_id_idx" ON "notificacoes_log"("corretor_id");

-- CreateIndex
CREATE INDEX "notificacoes_log_tipo_status_idx" ON "notificacoes_log"("tipo", "status");

-- AddForeignKey
ALTER TABLE "corretores" ADD CONSTRAINT "corretores_imobiliaria_id_fkey" FOREIGN KEY ("imobiliaria_id") REFERENCES "imobiliarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_corretor_id_fkey" FOREIGN KEY ("corretor_id") REFERENCES "corretores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_log" ADD CONSTRAINT "notificacoes_log_corretor_id_fkey" FOREIGN KEY ("corretor_id") REFERENCES "corretores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_log" ADD CONSTRAINT "notificacoes_log_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
