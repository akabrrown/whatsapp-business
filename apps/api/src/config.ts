import 'dotenv/config';

const bool = (v: string | undefined, dflt = false) =>
  v === undefined ? dflt : ['1', 'true', 'yes', 'real', 'cloudinary'].includes(v.toLowerCase());

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
  whatsappNumber: process.env.WHATSAPP_NUMBER ?? '233200000000',

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
  ownerEmail: process.env.OWNER_EMAIL ?? 'kukua@roseanddenim.com',
  ownerPassword: ownerPassword || 'denim-rose-2026',
};

export type Config = typeof config;
