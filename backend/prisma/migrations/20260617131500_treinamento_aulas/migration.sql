-- DropForeignKey
ALTER TABLE "treinamento_progressos" DROP CONSTRAINT "treinamento_progressos_corretor_id_fkey";

-- DropForeignKey
ALTER TABLE "treinamento_progressos" DROP CONSTRAINT "treinamento_progressos_treinamento_id_fkey";

-- AlterTable
ALTER TABLE "treinamentos" DROP COLUMN "data_encerramento",
DROP COLUMN "data_exclusao_video",
DROP COLUMN "data_liberacao",
DROP COLUMN "dias_para_exclusao",
DROP COLUMN "excluir_video_automaticamente",
DROP COLUMN "status_video",
DROP COLUMN "thumbnail_url",
DROP COLUMN "video_duracao",
DROP COLUMN "video_erro",
DROP COLUMN "video_excluido",
DROP COLUMN "video_path",
ADD COLUMN     "liberacao_sequencial" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "treinamento_progressos";

-- CreateTable
CREATE TABLE "treinamento_aulas" (
    "id" TEXT NOT NULL,
    "treinamento_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "video_path" TEXT,
    "original_path" TEXT,
    "video_duracao" INTEGER,
    "thumbnail_url" TEXT,
    "status_video" "StatusVideo" NOT NULL DEFAULT 'pendente',
    "video_erro" TEXT,
    "data_liberacao" TIMESTAMP(3),
    "data_encerramento" TIMESTAMP(3),
    "excluir_video_automaticamente" BOOLEAN NOT NULL DEFAULT false,
    "dias_para_exclusao" INTEGER,
    "data_exclusao_video" TIMESTAMP(3),
    "video_excluido" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treinamento_aulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aula_progressos" (
    "id" TEXT NOT NULL,
    "aula_id" TEXT NOT NULL,
    "corretor_id" TEXT NOT NULL,
    "segundos_assistidos" INTEGER NOT NULL DEFAULT 0,
    "percentual" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusProgresso" NOT NULL DEFAULT 'nao_iniciado',
    "concluido_em" TIMESTAMP(3),
    "ultimo_acesso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aula_progressos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "treinamento_aulas_treinamento_id_idx" ON "treinamento_aulas"("treinamento_id");

-- CreateIndex
CREATE INDEX "aula_progressos_corretor_id_idx" ON "aula_progressos"("corretor_id");

-- CreateIndex
CREATE UNIQUE INDEX "aula_progressos_aula_id_corretor_id_key" ON "aula_progressos"("aula_id", "corretor_id");

-- AddForeignKey
ALTER TABLE "treinamento_aulas" ADD CONSTRAINT "treinamento_aulas_treinamento_id_fkey" FOREIGN KEY ("treinamento_id") REFERENCES "treinamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aula_progressos" ADD CONSTRAINT "aula_progressos_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "treinamento_aulas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aula_progressos" ADD CONSTRAINT "aula_progressos_corretor_id_fkey" FOREIGN KEY ("corretor_id") REFERENCES "corretores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
