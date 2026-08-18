-- AlterTable
ALTER TABLE "treinamentos" ADD COLUMN     "carga_horaria" DOUBLE PRECISION,
ADD COLUMN     "certificado_auto_enviar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "certificado_habilitado" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "certificados_treinamento" (
    "id" TEXT NOT NULL,
    "treinamento_id" TEXT NOT NULL,
    "corretor_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "carga_horaria" DOUBLE PRECISION,
    "enviado_em" TIMESTAMP(3),
    "emitido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificados_treinamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificados_treinamento_codigo_key" ON "certificados_treinamento"("codigo");

-- CreateIndex
CREATE INDEX "certificados_treinamento_corretor_id_idx" ON "certificados_treinamento"("corretor_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificados_treinamento_treinamento_id_corretor_id_key" ON "certificados_treinamento"("treinamento_id", "corretor_id");

-- AddForeignKey
ALTER TABLE "certificados_treinamento" ADD CONSTRAINT "certificados_treinamento_treinamento_id_fkey" FOREIGN KEY ("treinamento_id") REFERENCES "treinamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados_treinamento" ADD CONSTRAINT "certificados_treinamento_corretor_id_fkey" FOREIGN KEY ("corretor_id") REFERENCES "corretores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
