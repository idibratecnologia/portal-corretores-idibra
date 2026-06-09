/**
 * Roda uma vez antes de toda a suíte: aplica o schema no banco de testes
 * (drop + recreate via `prisma db push --force-reset`).
 */
import { execSync } from 'child_process'

const TEST_DB = 'postgresql://idibra:SuaSenha@localhost:5432/idibra_test'

export default function globalSetup() {
  console.log('\n🧪 Preparando banco de testes (idibra_test)...')
  execSync('npx prisma db push --force-reset --skip-generate', {
    env:   { ...process.env, DATABASE_URL: TEST_DB },
    stdio: 'inherit',
  })
}
