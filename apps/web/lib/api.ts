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

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const api = {
  catalog: async (category?: string): Promise<CatalogProduct[]> => {
    try {
      const r = await get<{ ok: boolean; products: CatalogProduct[] }>(
        `/api/catalog${category ? `?category=${encodeURIComponent(category)}` : ''}`
      );
      return Array.isArray(r?.products) ? r!.products : [];
    } catch {
      return [];
    }
  },
  search: async (q: string, category?: string): Promise<CatalogProduct[]> => {
    try {
      const r = await get<{ ok: boolean; products: CatalogProduct[] }>(
        `/api/catalog/search?q=${encodeURIComponent(q)}${category ? `&category=${encodeURIComponent(category)}` : ''}`
      );
      return Array.isArray(r?.products) ? r!.products : [];
    } catch {
      return [];
    }
  },
  categories: async (): Promise<Category[]> => {
    try {
      const r = await get<{ ok: boolean; categories: Category[] }>('/api/categories');
      return Array.isArray(r?.categories) ? r!.categories : [];
    } catch {
      return [];
    }
  },
  product: async (slug: string): Promise<CatalogProduct | null> => {
    try {
      const r = await get<{ ok: boolean; product: CatalogProduct }>(`/api/products/${encodeURIComponent(slug)}`);
      return r?.product || null;
    } catch {
      return null;
    }
  },
  related: async (slug: string, limit: number = 4): Promise<CatalogProduct[]> => {
    try {
      const r = await get<{ ok: boolean; products: CatalogProduct[] }>(
        `/api/products/${encodeURIComponent(slug)}/related?limit=${limit}`
      );
      return Array.isArray(r?.products) ? r!.products : [];
    } catch {
      return [];
    }
  },
  settings: async (): Promise<{ ok: boolean; whatsappNumber: string }> => {
    try {
      const r = await get<{ ok: boolean; whatsappNumber: string }>('/api/settings/whatsapp');
      return { ok: true, whatsappNumber: r?.whatsappNumber || '233203813606' };
    } catch {
      return { ok: false, whatsappNumber: '233203813606' };
    }
  },
};
