import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      PAYSTACK_MODE: 'sim',
      WHATSAPP_MODE: 'sim',
      IMAGES_MODE: 'sim',
      JWT_SECRET: 'test-secret',
      WHATSAPP_NUMBER: '233238136060',
    },
    globalSetup: './tests/globalSetup.ts',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    include: ['tests/**/*.test.ts'],
  },
});
