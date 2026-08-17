import 'dotenv/config';

const bool = (v: string | undefined, dflt = false) =>
  v === undefined ? dflt : ['1', 'true', 'yes', 'real', 'cloudinary'].includes(v.toLowerCase());

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
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
  },
  images: {
    mode: (process.env.IMAGES_MODE ?? 'sim') as 'sim' | 'cloudinary',
    cloudinaryUrl: process.env.CLOUDINARY_URL ?? '',
  },
  redisUrl: process.env.REDIS_URL ?? '',
  ownerEmail: process.env.OWNER_EMAIL ?? 'kukua@roseanddenim.com',
  ownerPassword: process.env.OWNER_PASSWORD ?? 'denim-rose-2026',
};

export type Config = typeof config;
