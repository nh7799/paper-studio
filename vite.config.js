import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'ES2020',
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'jspdf': ['jspdf'],
        },
      },
    },
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 500,
  },
  server: {
    strictPort: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5178,
    },
  },
  preview: {
    port: 4173,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'jspdf'],
  },
})