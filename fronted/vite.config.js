// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  optimizeDeps: {
    include: ['leaflet'],
  },
  build: {
    commonjsOptions: {
      include: [/leaflet/, /node_modules/],
    },
  },
  server: {
    port: 3000,                // Frontend server port
    proxy: {
      // '/api': {
      //   target: 'http://127.0.0.1:5000/',  // Backend server
      //   changeOrigin: true,
      //   secure: false,
      '/socket.io': {
        target: 'http://127.0.0.1:5000',   // Backend WebSocket server
        ws: true,                          // Enable WebSocket proxying
        changeOrigin: true,                // Change origin to match backend
      }
    }
  }
})

