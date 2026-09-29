/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    // Feedback service of the experiments (feedback/, `npm run feedback`) – in production nginx forwards it.
    server: { proxy: { '/feedback-api': env.FEEDBACK_URL || 'http://localhost:8787' } },
    // PARTNER_ID is public (it identifies this frontend); fall back to it when VITE_PARTNER_ID is unset.
    define: {
      'import.meta.env.VITE_PARTNER_ID': JSON.stringify(env.VITE_PARTNER_ID || env.PARTNER_ID || ''),
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['src/test-setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs', 'feedback/**/*.test.mjs'],
    },
  };
});
