import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), ],
  server: {
    host: '0.0.0.0', //This allows external access
    proxy: {
      '/api': {
        target: 'http://backend:8000', // Backend service name in Docker Compose
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
