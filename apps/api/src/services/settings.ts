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
