import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['__tests__/setup.ts'],
    include: [
      '__tests__/unit/**/*.test.ts',
      '__tests__/unit/**/*.test.tsx',
      '__tests__/security/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      include: ['lib/**', 'app/api/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
})
