// Configuração ESLint (flat config) — API IDIBRA
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // Permite variáveis/args intencionalmente não usados quando prefixados com _
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // O projeto usa `any` pontualmente em integrações (Evolution, multipart) — apenas avisa
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Arquivos de teste podem ser mais flexíveis
    files: ['**/*.test.ts', 'src/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
