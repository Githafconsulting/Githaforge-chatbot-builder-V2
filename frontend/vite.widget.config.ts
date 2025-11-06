import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite configuration for building standalone chat widget
 *
 * Build command: vite build --config vite.widget.config.ts
 * Output: dist-widget/githaf-chat-widget.js (standalone bundle)
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Replace regular API service with widget API service during widget build
      './services/api': resolve(__dirname, 'src/services/api.widget.ts'),
      '../services/api': resolve(__dirname, 'src/services/api.widget.ts'),
    },
  },
  build: {
    outDir: 'dist-widget',
    lib: {
      entry: resolve(__dirname, 'src/widget-entry.tsx'),
      name: 'GithafChatWidget',
      formats: ['iife'],
      fileName: () => 'githaf-chat-widget.js',
    },
    rollupOptions: {
      // No external dependencies - bundle everything
      output: {
        // Inline all CSS into the JS bundle
        inlineDynamicImports: true,
        // Make it a single file
        manualChunks: undefined,
      },
    },
    // Ensure source maps for debugging
    sourcemap: true,
    // Minify for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console.log for debugging
      },
    },
  },
  // Define environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
