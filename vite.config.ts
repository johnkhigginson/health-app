import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // NOTE: `define` inlines these as literals in the client bundle. Anything
        // put here is readable by anyone who loads the app. See "Security note on the API key" in the README.
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
        'process.env.GA_MEASUREMENT_ID': JSON.stringify(env.GA_MEASUREMENT_ID ?? '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
