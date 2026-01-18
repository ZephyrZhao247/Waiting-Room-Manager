import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    https: false, // ngrok will handle HTTPS
    allowedHosts: [
      '.ngrok.io',
      '.ngrok-free.app',
      '.ngrok-free.dev',
      'localhost',
    ],
    headers: {
      // Required OWASP security headers for Zoom Apps
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self' https://appssdk.zoom.us; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://appssdk.zoom.us; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://appssdk.zoom.us https://*.zoom.us wss://*.zoom.us; frame-ancestors 'self' https://*.zoom.us;",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
