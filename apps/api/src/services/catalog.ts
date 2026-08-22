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

export interface ProductImageDetail {
  url: string;
  color?: string;
}

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: { slug: string; name: string };
  images: string[];
  imageDetails?: ProductImageDetail[];
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
  const rawSeeds: (string | { url?: string; src?: string; color?: string })[] = JSON.parse(p.images || '[]');
  const imageDetails: ProductImageDetail[] = rawSeeds.map((s) => {
    if (typeof s === 'string') {
      const url = s.startsWith('http') || s.startsWith('data:') ? s : productImage(s.replace('/api/img/', ''));
      return { url };
    }
    const rawUrl = s.url || s.src || '';
    const url = rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : productImage(rawUrl.replace('/api/img/', ''));
    return { url, color: s.color || undefined };
  });
  return {
    id: p.id, slug: p.slug, name: p.name, description: p.description,
    category: p.category,
    images: imageDetails.map((i) => i.url),
    imageDetails,
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

function getSlugVariations(slugOrName: string): string[] {
  const decoded = decodeURIComponent(slugOrName).trim();
  const set = new Set<string>();
  set.add(slugOrName);
  set.add(decoded);
  set.add(decoded.toLowerCase());
  // -s- to 's conversions (e.g. men-s-fashion -> men's fashion)
  set.add(decoded.replace(/-s-/g, "'s "));
  set.add(decoded.replace(/-s-/g, "’s "));
  set.add(decoded.replace(/-s-/g, "s "));
  set.add(decoded.replace(/-s-/g, "-"));
  // Common replacements
  set.add(decoded.replace(/-/g, ' '));
  set.add(decoded.replace(/['’]/g, '-'));
  set.add(decoded.replace(/['’]/g, ''));
  set.add(decoded.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').toLowerCase());
  set.add(decoded.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim());
  return Array.from(set).filter(Boolean);
}

export async function listActive(categorySlug?: string): Promise<CatalogProduct[]> {
  let categoryFilter = {};

  if (categorySlug) {
    const variations = getSlugVariations(categorySlug);

    // 1. Find matching categories across all variations of slug and name
    const matchingCategories = await db.category.findMany({
      where: {
        OR: [
          { slug: { in: variations } },
          { name: { in: variations } },
        ],
      },
      select: { id: true },
    });

    if (matchingCategories.length > 0) {
      // 2. Recursively gather all child / grandchild category IDs
      async function getDescendantIds(parentIds: string[]): Promise<string[]> {
        if (parentIds.length === 0) return [];
        const children = await db.category.findMany({
          where: { parentId: { in: parentIds } },
          select: { id: true },
        });
        if (children.length === 0) return [];
        const childIds = children.map((c) => c.id);
        const nextIds = await getDescendantIds(childIds);
        return [...childIds, ...nextIds];
      }

      const rootIds = matchingCategories.map((c) => c.id);
      const descendantIds = await getDescendantIds(rootIds);
      const allCategoryIds = [...new Set([...rootIds, ...descendantIds])];

      categoryFilter = { categoryId: { in: allCategoryIds } };
    } else {
      categoryFilter = { category: { slug: categorySlug } };
    }
  }

  const products = await db.product.findMany({
    where: { status: 'active', ...categoryFilter },
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
export async function search(term: string, categorySlug?: string): Promise<CatalogProduct[]> {
  const all = await listActive(categorySlug);
  const t = term.trim().toLowerCase();
  if (!t) return all;
  return all.filter(
    (p) =>
      p.name.toLowerCase().includes(t) ||
      p.description.toLowerCase().includes(t) ||
      p.category.name.toLowerCase().includes(t),
  );
}

export async function relatedProducts(slug: string, limit: number = 4): Promise<CatalogProduct[]> {
  const current = await db.product.findFirst({
    where: { slug, status: 'active' },
    include: { category: { select: { id: true, parentId: true, name: true, slug: true } } },
  });
  if (!current) return [];

  // 1. Same exact sub-category first
  const sameCategoryProducts = await db.product.findMany({
    where: {
      status: 'active',
      categoryId: current.categoryId,
      id: { not: current.id },
    },
    include,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  const results: CatalogProduct[] = sameCategoryProducts.map(toCatalog);
  if (results.length >= limit) return results;

  // 2. If product has a parent category (e.g. Men's Fashion), query sibling subcategories under SAME parent only
  const parentId = current.category.parentId;
  if (parentId) {
    const siblingCategories = await db.category.findMany({
      where: {
        OR: [
          { id: parentId },
          { parentId: parentId },
        ],
        id: { not: current.categoryId },
      },
      select: { id: true },
    });
    const siblingIds = siblingCategories.map((c) => c.id);

    if (siblingIds.length > 0) {
      const needed = limit - results.length;
      const siblingProducts = await db.product.findMany({
        where: {
          status: 'active',
          categoryId: { in: siblingIds },
          id: { not: current.id },
        },
        include,
        take: needed,
        orderBy: { createdAt: 'desc' },
      });
      for (const p of siblingProducts) {
        if (!results.some((r) => r.id === p.id)) {
          results.push(toCatalog(p));
        }
      }
    }
  } else {
    // If product is at the root category level, query its direct child categories only
    const childCategories = await db.category.findMany({
      where: { parentId: current.categoryId },
      select: { id: true },
    });
    if (childCategories.length > 0) {
      const needed = limit - results.length;
      const childProducts = await db.product.findMany({
        where: {
          status: 'active',
          categoryId: { in: childCategories.map((c) => c.id) },
          id: { not: current.id },
        },
        include,
        take: needed,
        orderBy: { createdAt: 'desc' },
      });
      for (const p of childProducts) {
        if (!results.some((r) => r.id === p.id)) {
          results.push(toCatalog(p));
        }
      }
    }
  }

  return results;
}

export async function categories() {
  return db.category.findMany({ 
    where: { parentId: null },
    orderBy: { flagship: 'desc' },
    include: { 
      children: { 
        orderBy: { name: 'asc' },
        include: { children: { orderBy: { name: 'asc' } } }
      } 
    }
  });
}
