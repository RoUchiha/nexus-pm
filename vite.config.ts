import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isGHPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  plugins: [react()],
  base: isGHPages ? '/nexus-pm/' : '/',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    sourcemap: true,
    target: 'es2020',
  },
})
