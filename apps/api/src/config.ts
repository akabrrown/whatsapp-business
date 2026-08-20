import 'dotenv/config';

const jwtSecret = process.env.JWT_SECRET || 'rose-denim-prod-secret-2026-auth';
const ownerPassword = process.env.OWNER_PASSWORD || 'Option#5';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret,
  whatsappNumber: process.env.WHATSAPP_NUMBER ?? '233238136060',
  apiUrl: process.env.API_URL ?? 'http://localhost:4000',
  storefrontUrl: process.env.STOREFRONT_URL ?? 'http://localhost:3000',

  paystack: {
    mode: ((process.env.PAYSTACK_MODE === 'real' && process.env.PAYSTACK_SECRET_KEY) ? 'real' : 'sim') as 'sim' | 'real',
    secretKey: process.env.PAYSTACK_SECRET_KEY ?? '',
    webhookSecret: process.env.PAYSTACK_SECRET_KEY || 'sim-paystack-secret',
    callbackUrl:
      process.env.PAYSTACK_CALLBACK_URL ??
      `http://localhost:${process.env.PORT ?? 4000}/webhooks/paystack`,
  },
  whatsapp: {
    mode: ((process.env.WHATSAPP_MODE === 'real' && process.env.META_ACCESS_TOKEN) ? 'real' : 'sim') as 'sim' | 'real',
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
  ownerPassword,
};

export type Config = typeof config;
