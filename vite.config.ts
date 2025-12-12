import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    define: {
      // Polyfill process.env for libraries or code relying on it (like the Gemini usage)
      'process.env': {
        API_KEY: env.API_KEY,
        NODE_ENV: JSON.stringify(mode),
      }
    }
  };
});