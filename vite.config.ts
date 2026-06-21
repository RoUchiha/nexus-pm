import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const enableSourceMaps = env.VITE_ENABLE_SOURCEMAPS === 'true';
  const clerkPublishableKey =
    env.VITE_CLERK_PUBLISHABLE_KEY ??
    env.CLERK_PUBLISHABLE_KEY ??
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    '';

  return {
    plugins: [react()],
    base: '/',
    define: {
      'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(clerkPublishableKey),
    },
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
  };
});
