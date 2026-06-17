-- CreateEnum
CREATE TYPE "StatusVideo" AS ENUM ('pendente', 'upload_recebido', 'processando', 'disponivel', 'erro_processamento', 'expirado', 'excluido');

-- CreateEnum
CREATE TYPE "StatusProgresso" AS ENUM ('nao_iniciado', 'em_andamento', 'concluido');

-- CreateTable
CREATE TABLE "treinamentos" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "data_liberacao" TIMESTAMP(3),
    "data_encerramento" TIMESTAMP(3),
    "video_path" TEXT,
    "video_duracao" INTEGER,
    "thumbnail_url" TEXT,
    "status_video" "StatusVideo" NOT NULL DEFAULT 'pendente',
    "video_erro" TEXT,
    "excluir_video_automaticamente" BOOLEAN NOT NULL DEFAULT false,
    "dias_para_exclusao" INTEGER,
    "data_exclusao_video" TIMESTAMP(3),
    "video_excluido" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treinamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treinamento_documentos" (
    "id" TEXT NOT NULL,
    "treinamento_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treinamento_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treinamento_eventos" (
    "id" TEXT NOT NULL,
    "treinamento_id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "obrigatorio" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treinamento_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treinamento_progressos" (
    "id" TEXT NOT NULL,
    "treinamento_id" TEXT NOT NULL,
    "corretor_id" TEXT NOT NULL,
    "segundos_assistidos" INTEGER NOT NULL DEFAULT 0,
    "percentual" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusProgresso" NOT NULL DEFAULT 'nao_iniciado',
    "concluido_em" TIMESTAMP(3),
    "ultimo_acesso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treinamento_progressos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "treinamentos_ativo_idx" ON "treinamentos"("ativo");

-- CreateIndex
CREATE INDEX "treinamento_documentos_treinamento_id_idx" ON "treinamento_documentos"("treinamento_id");

-- CreateIndex
CREATE INDEX "treinamento_eventos_evento_id_idx" ON "treinamento_eventos"("evento_id");

-- CreateIndex
CREATE UNIQUE INDEX "treinamento_eventos_treinamento_id_evento_id_key" ON "treinamento_eventos"("treinamento_id", "evento_id");

-- CreateIndex
CREATE INDEX "treinamento_progressos_corretor_id_idx" ON "treinamento_progressos"("corretor_id");

-- CreateIndex
CREATE UNIQUE INDEX "treinamento_progressos_treinamento_id_corretor_id_key" ON "treinamento_progressos"("treinamento_id", "corretor_id");

-- AddForeignKey
ALTER TABLE "treinamento_documentos" ADD CONSTRAINT "treinamento_documentos_treinamento_id_fkey" FOREIGN KEY ("treinamento_id") REFERENCES "treinamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treinamento_eventos" ADD CONSTRAINT "treinamento_eventos_treinamento_id_fkey" FOREIGN KEY ("treinamento_id") REFERENCES "treinamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treinamento_eventos" ADD CONSTRAINT "treinamento_eventos_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treinamento_progressos" ADD CONSTRAINT "treinamento_progressos_treinamento_id_fkey" FOREIGN KEY ("treinamento_id") REFERENCES "treinamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treinamento_progressos" ADD CONSTRAINT "treinamento_progressos_corretor_id_fkey" FOREIGN KEY ("corretor_id") REFERENCES "corretores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
