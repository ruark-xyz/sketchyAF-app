import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer for production builds
    process.env.ANALYZE && visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    copyPublicDir: true,
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['framer-motion', 'lucide-react'],
          forms: ['react-hook-form'],
          
          // Feature-based chunks
          auth: [
            './src/pages/Auth/Login',
            './src/pages/Auth/Signup', 
            './src/pages/Auth/ForgotPassword',
            './src/context/OptimizedAuthContext',
          ],
          profile: [
            './src/pages/Profile',
            './src/pages/UserProfile',
          ],
          art: [
            './src/pages/ArtGallery',
            './src/pages/ArtDetail',
          ],
          premium: [
            './src/pages/Premium',
            './src/pages/BoosterPackDetail',
          ],
        },
      },
    },
    // Minification and optimization
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Source maps for production debugging
    sourcemap: process.env.NODE_ENV === 'development',
    // Asset optimization
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
  },
  publicDir: 'public',
  define: {
    global: 'globalThis',
    'process.env.IS_PREACT': JSON.stringify("false"),
  },
  // Development server configuration
  server: {
    port: 5173,
    host: true,
    // Enable HTTP/2 for better performance
    https: false,
  },
  // Preview server configuration
  preview: {
    port: 4173,
    host: true,
  },
});