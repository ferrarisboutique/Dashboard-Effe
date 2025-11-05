
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      // Main path alias for src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'build',
    // Disabilita code splitting per evitare problemi durante il build
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    // Aumenta il limite di chunk size
    chunkSizeWarningLimit: 2000,
    // Usa minify più veloce
    minify: 'esbuild',
  },
  server: {
    port: 3000,
    open: true,
  },
});