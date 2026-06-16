-- AlterTable
ALTER TABLE "configuracoes" ALTER COLUMN "auto_approve" SET DEFAULT true;

-- Liga a auto-aprovação na configuração existente (cadastro já aprovado)
UPDATE "configuracoes" SET "auto_approve" = true;

-- AlterTable
ALTER TABLE "corretores" ADD COLUMN     "data_nascimento" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "exclusivo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "evento_convidados" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "corretor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evento_convidados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evento_convidados_corretor_id_idx" ON "evento_convidados"("corretor_id");

-- CreateIndex
CREATE UNIQUE INDEX "evento_convidados_evento_id_corretor_id_key" ON "evento_convidados"("evento_id", "corretor_id");

-- AddForeignKey
ALTER TABLE "evento_convidados" ADD CONSTRAINT "evento_convidados_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_convidados" ADD CONSTRAINT "evento_convidados_corretor_id_fkey" FOREIGN KEY ("corretor_id") REFERENCES "corretores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
