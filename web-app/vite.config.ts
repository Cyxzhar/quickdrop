import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ocr': ['tesseract.js'],
          'vendor-canvas': ['konva', 'react-konva'],
          'vendor-ui': ['framer-motion', 'qrcode.react', 'browser-image-compression']
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
})
