
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    define: {
      // Only manually define API_KEY since it doesn't start with VITE_
      // Vite automatically exposes VITE_* variables on import.meta.env
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      
      // Polyfill process.env for libraries that expect it, 
      // but do not overwrite keys defined above.
      'process.env': {}
    }
  };
});