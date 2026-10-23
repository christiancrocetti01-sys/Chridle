import { defineConfig } from 'vitest/config';

export default defineConfig({
  // percorsi relativi: funziona sia in locale sia su GitHub Pages (/Chridle/)
  base: './',
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
