import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // In production the SPA is served by Django/WhiteNoise under /static/.
  base: mode === 'production' ? '/static/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the Django backend (avoids CORS in dev).
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
}))
