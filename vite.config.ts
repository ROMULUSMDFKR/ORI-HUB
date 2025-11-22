
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all addresses (0.0.0.0)
    port: Number(process.env.PORT) || 8080, // Use port from environment or default to 8080
  },
  preview: {
    host: true, // Listen on all addresses (0.0.0.0)
    port: Number(process.env.PORT) || 8080, // Use port from environment or default to 8080
  },
});
