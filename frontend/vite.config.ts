import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Ensure react-toastify CSS is resolved correctly
      'react-toastify/dist/ReactToastify.css': path.resolve(
        __dirname,
        'node_modules/react-toastify/dist/ReactToastify.css'
      ),
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer(),
      ],
    },
    preprocessorOptions: {
      scss: {
        additionalData: `@import "./src/styles/global.css";`,
      },
    },
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-toastify',
      '@tanstack/react-query',
      'tailwindcss',
      'autoprefixer',
    ],
    esbuildOptions: {
      // Ensure CSS files are processed
      loader: {
        '.css': 'css',
      },
      // Enable source maps in development
      sourcemap: process.env.NODE_ENV !== 'production',
    },
  },
  define: {
    'process.env': {}
  },
});
