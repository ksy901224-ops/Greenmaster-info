
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            firebase: ['firebase/app', 'firebase/firestore'],
            ui: ['lucide-react']
          }
        }
      }
    },
    define: {
      // Define process.env.API_KEY specifically for Gemini SDK
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // Safe polyfill for other libraries relying on process.env
      'process.env': {}
    }
  };
});
