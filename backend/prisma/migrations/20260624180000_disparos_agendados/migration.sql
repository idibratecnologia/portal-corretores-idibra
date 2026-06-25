-- CreateTable
CREATE TABLE "disparos_agendados" (
    "id" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "assunto" TEXT,
    "canal_whatsapp" BOOLEAN NOT NULL DEFAULT true,
    "canal_email" BOOLEAN NOT NULL DEFAULT false,
    "corretor_ids" TEXT[],
    "anexo_base64" TEXT,
    "anexo_nome" TEXT,
    "anexo_mime" TEXT,
    "agendado_para" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "resultado" TEXT,
    "erro" TEXT,
    "enviado_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disparos_agendados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "disparos_agendados_status_agendado_para_idx" ON "disparos_agendados"("status", "agendado_para");
