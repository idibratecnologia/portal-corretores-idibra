/**
 * Configuração central da aplicação.
 * Lê e valida as variáveis de ambiente com Zod — falha cedo se algo estiver errado.
 */
import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT:     z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),

  JWT_SECRET:             z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
  JWT_EXPIRES_IN:         z.string().default('8h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  UPLOAD_DIR:         z.string().default('./uploads'),
  UPLOAD_MAX_SIZE_MB: z.coerce.number().default(10),
  API_URL:            z.string().default('http://localhost:3000'),

  EVOLUTION_URL:      z.string().optional(),
  EVOLUTION_API_KEY:  z.string().optional(),
  EVOLUTION_INSTANCE: z.string().optional(),

  // Intervalo (ms) entre envios de WhatsApp — fila com throttle para reduzir
  // o risco de bloqueio pela Meta em disparos em massa (API não oficial).
  WHATSAPP_MIN_DELAY_MS: z.coerce.number().default(4000),
  WHATSAPP_MAX_DELAY_MS: z.coerce.number().default(9000),

  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

const env = parsed.data

export const config = {
  isProd: env.NODE_ENV === 'production',
  env:    env.NODE_ENV,
  port:   env.PORT,

  database: {
    url: env.DATABASE_URL,
  },

  jwt: {
    secret:           env.JWT_SECRET,
    expiresIn:        env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  upload: {
    dir:        env.UPLOAD_DIR,
    maxSizeMB:  env.UPLOAD_MAX_SIZE_MB,
    apiUrl:     env.API_URL,
  },

  evolution: {
    // "configurado" = servidor Evolution acessível (URL + API key no .env).
    // A instância tem nome padrão; a conexão em si é gerida pela tela de sync.
    enabled:  Boolean(env.EVOLUTION_URL && env.EVOLUTION_API_KEY),
    url:      env.EVOLUTION_URL ?? '',
    apiKey:   env.EVOLUTION_API_KEY ?? '',
    instance: env.EVOLUTION_INSTANCE || 'idibra',
  },

  whatsapp: {
    // Throttle da fila de envios (ms). O atraso real varia entre min e max (jitter).
    minDelayMs: env.WHATSAPP_MIN_DELAY_MS,
    maxDelayMs: Math.max(env.WHATSAPP_MAX_DELAY_MS, env.WHATSAPP_MIN_DELAY_MS),
  },

  cors: {
    origins: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
  },

  // URL pública do portal (para links nas mensagens). Prefere o domínio https.
  get portalUrl(): string {
    const origins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    return origins.find((o) => o.startsWith('https')) ?? origins[0] ?? 'http://localhost:5173'
  },
} as const

export type AppConfig = typeof config
