import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Redirects to the local Vercel dev server or your local API
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'), // Keep the /api prefix
      },
    },
  },
})
