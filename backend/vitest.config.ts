import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

const TEST_DB = 'postgresql://idibra:SuaSenha@localhost:5432/idibra_test'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    // Variáveis carregadas antes dos módulos — config.ts lê o banco de TESTE.
    // O dotenv não sobrescreve env já definido, então isto vence o .env.
    env: {
      NODE_ENV:   'test',
      DATABASE_URL: TEST_DB,
      JWT_SECRET: 'chave-de-teste-com-no-minimo-32-caracteres-ok',
      JWT_EXPIRES_IN: '8h',
      JWT_REFRESH_EXPIRES_IN: '30d',
      UPLOAD_DIR: './uploads',
      API_URL:    'http://localhost:3000',
      ALLOWED_ORIGINS: 'http://localhost:5173',
      // Evolution desabilitado nos testes → notify() usa o stub (log + registro)
      EVOLUTION_URL:      '',
      EVOLUTION_API_KEY:  '',
      EVOLUTION_INSTANCE: '',
    },
    globalSetup: ['./src/test/global-setup.ts'],
    setupFiles:  ['./src/test/setup.ts'],
    // Banco compartilhado → roda os arquivos em série para evitar corrida
    fileParallelism: false,
    include: ['src/**/*.test.ts'],
  },
})
