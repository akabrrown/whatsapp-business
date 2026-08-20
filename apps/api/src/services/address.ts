// Delivery address & zone matching (§7.1–7.6).
// Text matching via zone names/aliases; pin matching via nearest seeded coordinate.
import { db } from '../db.js';
import type { ZoneMatch } from '../shared.js';

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** §7.1: known zone text → automatic fee. §7.4: gibberish → unrecognized. */
export async function matchZone(text: string): Promise<ZoneMatch> {
  const zones = await db.deliveryZone.findMany();
  const t = norm(text);
  if (!t) return { ok: false, reason: 'unrecognized' };

  for (const z of zones) {
    const candidates = [z.name.toLowerCase(), ...JSON.parse(z.aliases || '[]')].map(norm);
    if (candidates.some((c) => c && (t.includes(c) || c.includes(t)))) {
      return { ok: true, zone: { id: z.id, name: z.name, feeP: z.feeP } };
    }
  }

  // Heuristic: address mentions Accra but no zone → out of zone (manual quote, §7.3);
  // otherwise unrecognized text (§7.4).
  if (/accra|ghana/.test(t)) return { ok: false, reason: 'out_of_zone' };
  return { ok: false, reason: 'unrecognized' };
}

/** §7.2: location pin → nearest known zone (haversine over seeded coordinates). */
export async function matchPin(lat: number, lng: number): Promise<ZoneMatch> {
  const zones = await db.deliveryZone.findMany();
  let best: { id: string; name: string; feeP: number } | null = null;
  let bestDist = Infinity;
  for (const z of zones) {
    if (z.lat == null || z.lng == null) continue;
    const d = haversineKm(lat, lng, z.lat, z.lng);
    if (d < bestDist) {
      bestDist = d;
      best = { id: z.id, name: z.name, feeP: z.feeP };
    }
  }
  // Beyond ~15km from any mapped zone → outside standard zones (§7.3).
  if (!best || bestDist > 15) return { ok: false, reason: 'out_of_zone' };
  return { ok: true, zone: best };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
