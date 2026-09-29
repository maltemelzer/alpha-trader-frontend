/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * /legal.json for the dev server and `vite preview`, from LEGAL_* in .env – the same file the production
 * container writes at start (docker/40-legal-config.sh). Never part of the build.
 */
/** @param {Record<string, string>} env @returns {import('vite').Plugin} */
function legalConfig(env) {
  const body = () =>
    JSON.stringify({
      name: env.LEGAL_NAME ?? '',
      street: env.LEGAL_STREET ?? '',
      city: env.LEGAL_CITY ?? '',
      country: env.LEGAL_COUNTRY || 'Deutschland',
      email: env.LEGAL_EMAIL ?? '',
      phone: env.LEGAL_PHONE ?? '',
      hosting: env.LEGAL_HOSTING ?? '',
    });
  // Returns nothing on purpose: a function returned from configureServer would run as a post hook.
  /** @param {import('vite').ViteDevServer | import('vite').PreviewServer} server */
  const serve = (server) => {
    server.middlewares.use('/legal.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(body());
    });
  };
  return { name: 'legal-config', configureServer: serve, configurePreviewServer: serve };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), legalConfig(env)],
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
