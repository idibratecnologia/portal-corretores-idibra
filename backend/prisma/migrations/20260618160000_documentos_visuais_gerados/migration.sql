-- CreateTable
CREATE TABLE "documentos_visuais_gerados" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "modelo_id" TEXT,
    "inscricao_id" TEXT,
    "corretor_id" TEXT,
    "tipo" "TipoModelo" NOT NULL,
    "formato" TEXT NOT NULL,
    "gerado_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_visuais_gerados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documentos_visuais_gerados_evento_id_idx" ON "documentos_visuais_gerados"("evento_id");

-- CreateIndex
CREATE INDEX "documentos_visuais_gerados_corretor_id_idx" ON "documentos_visuais_gerados"("corretor_id");
