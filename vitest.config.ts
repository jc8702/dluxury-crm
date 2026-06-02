import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      APP_JWT_SECRET: 'test-secret-key-for-jwt',
    },
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.vercel/**',
      'tests/**',
      'tests-e2e/**',
      '**/e2e/**',
      'playwright-report/**',
      'test-results/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*', '**/mockData/*'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
