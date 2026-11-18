import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so the build also works from any folder.
  base: './',
  build: {
    // Embed images, sounds and fonts into the bundle: the game ships as a single html file (see tools/make-single.mjs).
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 6000,
  },
});
