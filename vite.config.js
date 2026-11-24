import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { api } from './server/api.js';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    { name: 'queue-api', configureServer(server) { server.middlewares.use(api); } },
  ],
  server: { host: true },
});
