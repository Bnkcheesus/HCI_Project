/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    /*
     * The API is proxied rather than called cross-origin.
     *
     * Two things fall out of that, both worth keeping. The browser only ever talks to
     * :5173, so there is no CORS configuration to get wrong — and every Playwright
     * verification script in scripts/ still points at :5173 unchanged, including the ones
     * that wait on `networkidle` and would otherwise never see the API's requests.
     */
    proxy: {
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // The server suite has its own config (vitest.server.config.ts) because it needs a
    // node environment and a live database. Without this exclusion vitest's default glob
    // sweeps it up into the frontend run, where it fails on a missing DATABASE_URL and
    // reports a red suite that has nothing to do with the frontend.
    exclude: ['**/node_modules/**', '**/dist/**', 'server/**'],
  },
})
