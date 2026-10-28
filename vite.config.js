import { defineConfig } from 'vite';

const buildVersion = Date.now().toString(36);

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${buildVersion}.js`,
        chunkFileNames: `assets/[name]-[hash]-${buildVersion}.js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      }
    }
  }
});
