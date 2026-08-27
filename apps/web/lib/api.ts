let rawApiUrl = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').trim();
if (!rawApiUrl.startsWith('http://') && !rawApiUrl.startsWith('https://')) {
  rawApiUrl = `https://${rawApiUrl}`;
}
const API_URL = rawApiUrl.replace(/\/+$/, '');

export interface CatalogVariant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  priceP: number;
  stockQuantity: number;
  available: number;
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
  compareAtPriceP?: number;
  badge?: string;
  featured?: boolean;
  soldOut: boolean;
  totalAvailable: number;
  lowStock: boolean;
  variants: CatalogVariant[];
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  flagship: boolean;
  image?: string;
  children?: Category[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`api ${res.status} for ${path}`);
  return (await res.json()) as T;
}

export const api = {
  catalog: (category?: string) =>
    get<{ ok: boolean; products: CatalogProduct[] }>(`/api/catalog${category ? `?category=${encodeURIComponent(category)}` : ''}`).then((r) => r.products),
  search: (q: string, category?: string) =>
    get<{ ok: boolean; products: CatalogProduct[] }>(`/api/catalog/search?q=${encodeURIComponent(q)}${category ? `&category=${encodeURIComponent(category)}` : ''}`).then((r) => r.products),
  categories: () => get<{ ok: boolean; categories: Category[] }>('/api/categories').then((r) => r.categories),
  product: async (slug: string) => {
    try {
      const r = await get<{ ok: boolean; product: CatalogProduct }>(`/api/products/${slug}`);
      return r.product;
    } catch {
      return null;
    }
  },
  related: async (slug: string, limit: number = 4) => {
    try {
      const r = await get<{ ok: boolean; products: CatalogProduct[] }>(`/api/products/${encodeURIComponent(slug)}/related?limit=${limit}`);
      return r.products || [];
    } catch {
      return [];
    }
  },
  settings: async () => {
    try {
      return await get<{ ok: boolean; whatsappNumber: string }>('/api/settings/whatsapp');
    } catch {
      return { ok: false, whatsappNumber: '' };
    }
  },
};
