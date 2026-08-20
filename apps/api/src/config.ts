import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET ?? '';
if (isProd && (!jwtSecret || jwtSecret === 'dev-secret' || jwtSecret === 'change-me-in-production')) {
  throw new Error('JWT_SECRET must be set to a strong, unique value in production');
}
const ownerPassword = process.env.OWNER_PASSWORD ?? '';
if (isProd && (!ownerPassword || ownerPassword === 'denim-rose-2026')) {
  throw new Error('OWNER_PASSWORD must be set to a strong, unique value in production');
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: jwtSecret || 'dev-secret',
  whatsappNumber: process.env.WHATSAPP_NUMBER ?? '233238136060',
  apiUrl: process.env.API_URL ?? 'http://localhost:4000',
  storefrontUrl: process.env.STOREFRONT_URL ?? 'http://localhost:3000',

  paystack: {
    mode: (process.env.PAYSTACK_MODE ?? 'sim') as 'sim' | 'real',
    secretKey: process.env.PAYSTACK_SECRET_KEY ?? '',
    // In sim mode the webhook secret is fixed so tests/local runs are deterministic.
    webhookSecret: process.env.PAYSTACK_SECRET_KEY || 'sim-paystack-secret',
    callbackUrl:
      process.env.PAYSTACK_CALLBACK_URL ??
      `http://localhost:${process.env.PORT ?? 4000}/webhooks/paystack`,
  },
  whatsapp: {
    mode: (process.env.WHATSAPP_MODE ?? 'sim') as 'sim' | 'real',
    accessToken: process.env.META_ACCESS_TOKEN ?? '',
    phoneNumberId: process.env.META_PHONE_NUMBER_ID ?? '',
    verifyToken: process.env.META_VERIFY_TOKEN ?? 'rose-denim-verify',
    appSecret: process.env.META_APP_SECRET ?? '',
  },
  images: {
    mode: (process.env.IMAGES_MODE ?? 'sim') as 'sim' | 'cloudinary',
    cloudinaryUrl: process.env.CLOUDINARY_URL ?? '',
  },
  redisUrl: process.env.REDIS_URL ?? '',
  ownerEmail: process.env.OWNER_EMAIL ?? 'akayetb@gmail.com',
  ownerPassword: ownerPassword || 'Option#5',
};

// Startup guards: crash immediately when real-mode credentials are missing,
// rather than starting the server and silently failing on every call.
if (config.paystack.mode === 'real' && !config.paystack.secretKey) {
  throw new Error('PAYSTACK_SECRET_KEY is required when PAYSTACK_MODE=real');
}
if (config.whatsapp.mode === 'real') {
  if (!config.whatsapp.accessToken) throw new Error('META_ACCESS_TOKEN is required when WHATSAPP_MODE=real');
  if (!config.whatsapp.phoneNumberId) throw new Error('META_PHONE_NUMBER_ID is required when WHATSAPP_MODE=real');
  if (!config.whatsapp.appSecret) throw new Error('META_APP_SECRET is required when WHATSAPP_MODE=real (webhook signature verification)');
}

export type Config = typeof config;
