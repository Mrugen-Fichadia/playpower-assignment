import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // proxy: {
    //   '/api': 'http://localhost:5000',
    //   '/uploads': 'http://localhost:5000',
    // },
  },
  optimizeDeps: {
    include: ['react-pdf'], // Pre-bundle react-pdf to resolve dependencies
    // Use a single asterisk to match files in the dist directory only
    exclude: ['react-pdf/dist/*.css'], // Matches AnnotationLayer.css and TextLayer.css in dist/
  },
  css: {
    modules: false, // Disable CSS modules if not needed
    preprocessorOptions: {
      // No additional preprocessors unless using SCSS/Sass
    },
  },
  resolve: {
    alias: {
      // Optional: If you move CSS files manually, configure aliases here
    },
  },
});