import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:7777',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:7777',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    // No sourcemaps in the shipped bundle (keeps the wheel small).
    sourcemap: false,
  },
});
