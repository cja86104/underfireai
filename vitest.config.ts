import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Vitest configuration for UnderFireAI.
 *
 * - Mirrors the `@/*` path alias from tsconfig.json so imports written
 *   against the production path resolution work in tests unchanged.
 * - jsdom environment so future React component tests can mount and
 *   query the DOM without needing a real browser.
 * - setupFiles wires @testing-library/jest-dom matchers into expect().
 * - Explicitly excludes the e2e/ directory — Playwright owns that scope.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      'e2e/**',
    ],
    css: false,
  },
});
