import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': import.meta.dirname,
      },
    },

    server: {
      hmr: process.env.DISABLE_HMR !== 'true',

      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {},

      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
          secure: false,
          rewrite: (path) =>
            path.replace(
              /^\/api(?=\/|$)/,
              '/discipline-os-backend/api'
            ),
          cookiePathRewrite: '/',
        },
      },
    },
  };
});
