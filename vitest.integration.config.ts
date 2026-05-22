import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['apps/*/src/**/*.integration.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ['./vitest.integration.setup.ts'],
    fileParallelism: false,
  },
});
