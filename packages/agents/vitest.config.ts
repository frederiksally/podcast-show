import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000, // 30s for AI agent calls
    hookTimeout: 30000, // 30s for setup/teardown
    teardownTimeout: 30000,
  },
  esbuild: {
    target: 'esnext'
  }
});