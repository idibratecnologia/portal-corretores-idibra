-- CreateEnum
CREATE TYPE "TipoMaterial" AS ENUM ('arquivo', 'link');

-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "certificados_habilitados" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "evento_materiais" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMaterial" NOT NULL,
    "titulo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evento_materiais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evento_materiais_evento_id_idx" ON "evento_materiais"("evento_id");

-- AddForeignKey
ALTER TABLE "evento_materiais" ADD CONSTRAINT "evento_materiais_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
