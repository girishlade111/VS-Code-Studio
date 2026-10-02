import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/VS-Code-Studio/',
  plugins: [react()],
  server: {
    port: 3000
  }
})