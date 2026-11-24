// Category / catalog grid: responsive editorial filters, mobile bottom sheet & column switchers.
import type { Metadata } from 'next';
import { api, type CatalogProduct, type Category } from '@/lib/api';
import { ShopCatalogView } from '@/components/ShopCatalogView';
import { CATALOG_PRODUCTS, HAUTE_CATEGORIES, BRAND_NAME } from '@/lib/haute-couture-data';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category?: string }>;
}): Promise<Metadata> {
  try {
    const { category } = await params;
    const active = HAUTE_CATEGORIES.find((c) => c.slug === category);
    const name = active?.name ?? 'The Runway Collection';
    return {
      title: `${name} | ${BRAND_NAME}`,
      description: `Shop ${name.toLowerCase()} from ${BRAND_NAME}. Spring Summer 2027 Couture, Senators, Robes & Bespoke Menswear delivered across Accra and worldwide.`,
    };
  } catch {
    return {
      title: `The Runway Collection | ${BRAND_NAME}`,
      description: `Shop curated haute couture menswear from ${BRAND_NAME} delivered across Accra and worldwide.`,
    };
  }
}

export default async function ShopPage({
  params,
}: {
  params: Promise<{ category?: string }>;
}) {
  const { category } = await params;
  let products: CatalogProduct[] = [];
  let tree: Category[] = [];

  try {
    [products, tree] = await Promise.all([
      api.catalog(category).catch(() => []),
      api.categories().catch(() => []),
    ]);
  } catch {}

  // If backend returns products, prepend or merge with Haute Couture runway looks
  const combinedProducts = [
    ...CATALOG_PRODUCTS,
    ...(Array.isArray(products) ? products : []),
  ];

  const combinedTree = [
    ...HAUTE_CATEGORIES,
    ...(Array.isArray(tree) ? tree : []),
  ];

  const active = combinedTree.find(
    (c) =>
      c.slug === category || c.slug === decodeURIComponent(category || ''),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <ShopCatalogView
        initialProducts={combinedProducts}
        categories={combinedTree}
        activeCategorySlug={category}
        categoryName={active?.name ?? 'The Runway Collection'}
      />
    </div>
  );
}
