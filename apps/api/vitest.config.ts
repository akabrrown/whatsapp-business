import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: 'file:./test.db',
      PAYSTACK_MODE: 'sim',
      WHATSAPP_MODE: 'sim',
      IMAGES_MODE: 'sim',
      JWT_SECRET: 'test-secret',
      WHATSAPP_NUMBER: '233200000000',
    },
    globalSetup: './tests/globalSetup.ts',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    include: ['tests/**/*.test.ts'],
  },
});
