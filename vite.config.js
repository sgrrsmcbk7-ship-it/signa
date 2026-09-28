import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/ — set BASE_PATH=/signa/ for that build.
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  server: { host: true, port: 5173 },
  build: { target: 'es2020', chunkSizeWarningLimit: 1500 },
});
