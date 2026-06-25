-- AlterTable
ALTER TABLE "notificacoes_log" ADD COLUMN     "canal" TEXT NOT NULL DEFAULT 'whatsapp';

-- CreateIndex
CREATE INDEX "notificacoes_log_canal_idx" ON "notificacoes_log"("canal");

-- CreateIndex
CREATE INDEX "notificacoes_log_enviado_at_idx" ON "notificacoes_log"("enviado_at");
