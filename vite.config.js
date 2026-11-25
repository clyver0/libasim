import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 0,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.js', 'src/**/*.test.js'],
  },
});
