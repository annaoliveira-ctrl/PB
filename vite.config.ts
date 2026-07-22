import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente (como a GEMINI_API_KEY do GitHub Secrets)
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || env.API_KEY || '';

  return {
    base: '/PB/',
    plugins: [react(), tailwindcss()],
    define: {
      // Injeta a chave de API nos nomes que o código da IA costuma buscar no navegador
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
      'process.env.API_KEY': JSON.stringify(apiKey),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(apiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
