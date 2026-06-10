-- CreateEnum
CREATE TYPE "NivelAdmin" AS ENUM ('super', 'operador');

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "nivel" "NivelAdmin" NOT NULL DEFAULT 'operador';

-- Admins já existentes (criados antes dos níveis) são os donos → viram 'super'
UPDATE "admins" SET "nivel" = 'super';
