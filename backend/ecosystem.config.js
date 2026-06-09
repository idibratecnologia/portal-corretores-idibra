/**
 * Configuração do PM2 para produção na VPS.
 * Deploy:  pm2 start ecosystem.config.js
 *          pm2 save && pm2 startup
 */
module.exports = {
  apps: [
    {
      name:      'idibra-api',
      script:    'dist/server.js',
      instances: 2,            // cluster com 2 workers
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT:     3000,
      },
      error_file:         'logs/error.log',
      out_file:           'logs/out.log',
      log_date_format:    'YYYY-MM-DD HH:mm:ss',
      restart_delay:      5000,
      max_memory_restart: '500M',
    },
  ],
}
