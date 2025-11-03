import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/predict-type': 'http://localhost:5000',
      '/predict-fertility': 'http://localhost:5000',
      '/health': 'http://localhost:5000',
      '/chat': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
