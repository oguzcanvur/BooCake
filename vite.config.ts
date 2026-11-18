import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so the build works when uploaded to itch.io (served from a sub-folder).
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
  },
});
