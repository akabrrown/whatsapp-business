// Server-side API client: every page fetches the Express API with no caching
// so catalog stock/availability is always live (§3.1).
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export interface CatalogVariant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  priceP: number;
  stockQuantity: number;
  available: number;
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
    get<{ ok: boolean; products: CatalogProduct[] }>(`/api/catalog${category ? `?category=${category}` : ''}`).then((r) => r.products),
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
  settings: () =>
    get<{ ok: boolean; whatsappNumber: string }>('/api/settings/whatsapp'),
};
