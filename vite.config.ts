import deno from '@deno/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import 'react';
import 'react-dom';

export default defineConfig({
  plugins: [react(), deno()],
  resolve: {
    alias: {
      '@': new URL('.', import.meta.url).pathname,
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  optimizeDeps: {
    include: ['react/jsx-runtime'],
  },
});
