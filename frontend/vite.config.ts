import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy /api requests to backend server
      '/api': {
        target: 'http://localhost:5001', // Update to match your backend port
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
