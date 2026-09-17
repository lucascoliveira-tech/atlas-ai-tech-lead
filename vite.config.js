import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      proxy: env.VITE_API_BASE_URL
        ? {
            // Avoids browser CORS in dev: atlas-core-api has no CORS configuration today.
            '/api': {
              target: env.VITE_API_BASE_URL,
              changeOrigin: true,
            },
          }
        : undefined,
    },
  };
});
