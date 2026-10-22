import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  // Architecture has its own app in 03_ARCHITECTURE/web; never ship its assets here.
  build: { rollupOptions: { input: { main: resolve(import.meta.dirname, 'index.html'), admin: resolve(import.meta.dirname, 'admin.html') } } },
  server: {
    port: 5174,
    host: '127.0.0.1'
  }
});
