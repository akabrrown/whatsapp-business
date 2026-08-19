// Catalog reads: live stock, sold-out flags, search (§3.1–3.6, §11.1–11.2).
import { db } from '../db.js';
import { productImage } from '../adapters/images.js';

export interface CatalogVariant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  priceP: number;
  stockQuantity: number;
  available: number; // stock - reserved (§6.2: others see Sold Out when reserved)
}

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: { slug: string; name: string };
  images: string[];
  minPriceP: number;
  soldOut: boolean;
  totalAvailable: number;
  lowStock: boolean;
  variants: CatalogVariant[];
}

function toCatalog(p: {
  id: string; slug: string; name: string; description: string; images: string;
  category: { slug: string; name: string };
  variants: { id: string; sku: string; size: string | null; color: string | null; priceP: number; stockQuantity: number; reservedStock: number; lowStockThreshold: number }[];
}): CatalogProduct {
  const variants: CatalogVariant[] = p.variants.map((v) => ({
    id: v.id, sku: v.sku, size: v.size, color: v.color, priceP: v.priceP,
    stockQuantity: v.stockQuantity,
    available: Math.max(0, v.stockQuantity - v.reservedStock),
  }));
  const totalAvailable = variants.reduce((s, v) => s + v.available, 0);
  const seeds: string[] = JSON.parse(p.images || '[]');
  return {
    id: p.id, slug: p.slug, name: p.name, description: p.description,
    category: p.category,
    images: seeds.map((s: string) => (s.startsWith('http') || s.startsWith('data:') ? s : productImage(s.replace('/api/img/', '')))),
    minPriceP: Math.min(...variants.map((v) => v.priceP)),
    soldOut: totalAvailable === 0, // §3.2: flag, never hide
    totalAvailable,
    lowStock: variants.some((v) => v.available > 0 && v.available <= 3),
    variants,
  };
}

const include = {
  category: { select: { slug: true, name: true } },
  variants: true,
} as const;

export async function listActive(categorySlug?: string): Promise<CatalogProduct[]> {
  const products = await db.product.findMany({
    where: { status: 'active', ...(categorySlug ? { category: { slug: categorySlug } } : {}) },
    include,
    orderBy: { createdAt: 'desc' },
  });
  return products.map(toCatalog);
}

export async function bySlug(slug: string): Promise<CatalogProduct | null> {
  const p = await db.product.findFirst({ where: { slug, status: 'active' }, include });
  return p ? toCatalog(p) : null;
}

/** §3.6: empty search returns empty set; UI shows category shortcuts. */
export async function search(term: string): Promise<CatalogProduct[]> {
  const all = await listActive();
  const t = term.trim().toLowerCase();
  if (!t) return all;
  return all.filter(
    (p) =>
      p.name.toLowerCase().includes(t) ||
      p.description.toLowerCase().includes(t) ||
      p.category.name.toLowerCase().includes(t),
  );
}

export async function categories() {
  return db.category.findMany({ 
    where: { parentId: null },
    orderBy: { flagship: 'desc' },
    include: { children: { orderBy: { name: 'asc' } } }
  });
}
