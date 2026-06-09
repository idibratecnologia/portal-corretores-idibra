-- CreateTable
CREATE TABLE "configuracoes" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "empresa_nome" TEXT NOT NULL DEFAULT 'IDIBRA',
    "empresa_email" TEXT NOT NULL DEFAULT '',
    "empresa_telefone" TEXT NOT NULL DEFAULT '',
    "empresa_site" TEXT NOT NULL DEFAULT '',
    "auto_approve" BOOLEAN NOT NULL DEFAULT false,
    "notify_inscricao" BOOLEAN NOT NULL DEFAULT true,
    "allow_cancel" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);
