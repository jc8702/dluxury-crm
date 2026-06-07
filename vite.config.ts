import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    'process.env': {},
    global: 'window',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    drop: mode === 'production' ? ['console'] : [],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('three') || id.includes('@react-three')) return 'chunk-3d';
          if (id.includes('@ai-sdk') || id.includes('@google/generative-ai')) return 'chunk-ai';
          if (id.includes('react-big-calendar') || id.includes('fullcalendar'))
            return 'chunk-calendar';
          if (id.includes('lucide-react')) return 'lucide';
          if (id.includes('date-fns')) return 'date';
          if (
            id.includes('react-dom') ||
            id.includes('react-router-dom') ||
            id.includes('scheduler')
          )
            return 'chunk-vendor';
        },
      },
    },
    chunkSizeWarningLimit: 300,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
}));
