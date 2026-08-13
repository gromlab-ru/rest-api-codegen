import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/cli.ts', 'src/index.ts'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        statements: 90,
        lines: 90,
        functions: 90,
        branches: 85
      }
    }
  }
});
