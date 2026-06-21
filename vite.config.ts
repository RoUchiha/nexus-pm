import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const enableSourceMaps = process.env.VITE_ENABLE_SOURCEMAPS === 'true';

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    open: false,
  },
  build: {
    sourcemap: enableSourceMaps,
    target: 'es2020',
  },
});
