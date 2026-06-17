-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "certificados_enviados_em" TIMESTAMP(3),
ADD COLUMN     "enviar_certificado_auto" BOOLEAN NOT NULL DEFAULT false;
