import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    copyPublicDir: true,
  },
  publicDir: 'public',
  define: {
    global: 'globalThis',
    'process.env.IS_PREACT': JSON.stringify("false"),
  },
});
