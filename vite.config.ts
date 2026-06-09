import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

const useHttps = process.env.VITE_HTTPS === 'true'

export default defineConfig({
  plugins: [react(), ...(useHttps ? [basicSsl()] : [])],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    https: useHttps,
  },
  build: {
    rollupOptions: {
      output: {
        // Separa libs pesadas em chunks próprios (carregados sob demanda)
        manualChunks: {
          react:   ['react', 'react-dom', 'react-router-dom'],
          charts:  ['recharts'],
          qr:      ['html5-qrcode', 'jsqr', 'qrcode.react'],
        },
      },
    },
  },
})
