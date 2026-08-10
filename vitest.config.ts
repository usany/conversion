import deno from '@deno/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const alias = { '@': new URL('.', import.meta.url).pathname };

export default defineConfig({
  plugins: [react(), deno()],
  resolve: { alias },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'storybook-static/**', 'tests/e2e/**'],
  },
});
