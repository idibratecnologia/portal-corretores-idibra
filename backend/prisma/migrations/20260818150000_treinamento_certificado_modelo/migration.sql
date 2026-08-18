-- AlterTable
ALTER TABLE "treinamentos" ADD COLUMN     "certificado_modelo_id" TEXT;

-- AddForeignKey
ALTER TABLE "treinamentos" ADD CONSTRAINT "treinamentos_certificado_modelo_id_fkey" FOREIGN KEY ("certificado_modelo_id") REFERENCES "modelos_visuais"("id") ON DELETE SET NULL ON UPDATE CASCADE;
