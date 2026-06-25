-- CreateTable
CREATE TABLE "modelos_mensagem" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "assunto" TEXT,
    "conteudo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modelos_mensagem_pkey" PRIMARY KEY ("id")
);
