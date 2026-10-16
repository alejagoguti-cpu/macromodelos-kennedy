import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Se compila a /docs (GitHub Pages) con rutas relativas.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { headers: { 'Cache-Control': 'no-store' } },
  build: { outDir: 'docs', emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});
