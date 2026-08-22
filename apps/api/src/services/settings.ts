// Settings service: runtime-configurable values stored in the database.
import { db } from '../db.js';
import { config } from '../config.js';

const cache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL = 60_000; // 1 minute

export async function getSetting(key: string): Promise<string | null> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const row = await db.setting.findUnique({ where: { key } });
  if (row) {
    cache.set(key, { value: row.value, expiresAt: Date.now() + CACHE_TTL });
    return row.value;
  }
  return null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    update: { value, updatedAt: new Date() },
    create: { key, value },
  });
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL });
}

export async function getWhatsAppNumber(): Promise<string> {
  const stored = await getSetting('whatsapp_number');
  return stored ?? config.whatsappNumber;
}

export interface PromoBanner {
  enabled: boolean;
  text: string;
  link?: string;
  badge?: string;
}

export interface CouponItem {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'FREE_DELIVERY';
  value: number; // e.g. 15 for 15% or 2000 for GH₵20
  minOrderP: number;
  active: boolean;
  usageLimit?: number;
  usedCount: number;
  expiresAt?: string;
}

export interface ProductPromotion {
  compareAtPriceP?: number;
  badge?: string;
  featured?: boolean;
}

export async function getPromoBanner(): Promise<PromoBanner> {
  const raw = await getSetting('promo_banner');
  if (!raw) return { enabled: false, text: '' };
  try {
    return JSON.parse(raw);
  } catch {
    return { enabled: false, text: '' };
  }
}

export async function setPromoBanner(banner: PromoBanner): Promise<void> {
  await setSetting('promo_banner', JSON.stringify(banner));
}

export async function getCoupons(): Promise<CouponItem[]> {
  const raw = await getSetting('promo_coupons');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveCoupons(coupons: CouponItem[]): Promise<void> {
  await setSetting('promo_coupons', JSON.stringify(coupons));
}

export async function getProductPromotions(): Promise<Record<string, ProductPromotion>> {
  const raw = await getSetting('product_promotions');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function setProductPromotion(productId: string, promo: ProductPromotion | null): Promise<void> {
  const current = await getProductPromotions();
  if (promo === null) {
    delete current[productId];
  } else {
    current[productId] = promo;
  }
  await setSetting('product_promotions', JSON.stringify(current));
}
