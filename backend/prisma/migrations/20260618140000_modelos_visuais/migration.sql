-- CreateEnum
CREATE TYPE "TipoModelo" AS ENUM ('credenciamento', 'cracha', 'certificado');

-- CreateTable
CREATE TABLE "modelos_visuais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "tipo" "TipoModelo" NOT NULL,
    "largura" INTEGER NOT NULL,
    "altura" INTEGER NOT NULL,
    "canvas_json" JSONB,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modelos_visuais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento_modelos" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "modelo_id" TEXT NOT NULL,
    "tipo" "TipoModelo" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evento_modelos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "modelos_visuais_tipo_idx" ON "modelos_visuais"("tipo");

-- CreateIndex
CREATE INDEX "evento_modelos_modelo_id_idx" ON "evento_modelos"("modelo_id");

-- CreateIndex
CREATE UNIQUE INDEX "evento_modelos_evento_id_tipo_key" ON "evento_modelos"("evento_id", "tipo");

-- AddForeignKey
ALTER TABLE "evento_modelos" ADD CONSTRAINT "evento_modelos_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_modelos" ADD CONSTRAINT "evento_modelos_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "modelos_visuais"("id") ON DELETE CASCADE ON UPDATE CASCADE;
