import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all /api requests to backend
      '/api': {
        // local dev backend config
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: true

        // Ngrok config
        // target: 'https://emely-unmorphological-unconsiderablely.ngrok-free.dev',
        // changeOrigin: true,
        // secure: true,
        // headers: {
        //   'ngrok-skip-browser-warning': 'true',
        // },
      },
      // Proxy /health endpoint to backend
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    },
    allowedHosts: [
      "*.ngrok-free.app",
      "*.ngrok-free.dev",
      "maren-unpricked-percy.ngrok-free.dev"
    ]
  }
})
