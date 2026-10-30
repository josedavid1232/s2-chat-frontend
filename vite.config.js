import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'hiking-somebody-bernard-close.trycloudflare.com',
      '.trycloudflare.com' // Esto permite cualquier subdominio dinámico de Cloudflare
    ]
  }
})