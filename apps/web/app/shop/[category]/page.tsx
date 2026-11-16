// Category / catalog grid: responsive editorial filters, mobile bottom sheet & column switchers.
import type { Metadata } from 'next';
import { api, type CatalogProduct, type Category } from '@/lib/api';
import { ShopCatalogView } from '@/components/ShopCatalogView';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category?: string }>;
}): Promise<Metadata> {
  try {
    const { category } = await params;
    const tree = await api.categories();
    const safeTree = Array.isArray(tree) ? tree : [];

    const flat: any[] = [];
    const add = (c: any) => {
      flat.push(c);
      if (c.children && Array.isArray(c.children)) c.children.forEach(add);
    };
    safeTree.forEach(add);

    const active = flat.find((c) => c.slug === category);
    const name = active?.name ?? 'The Collection';
    return {
      title: `${name} | TOBI CLOTHINGS`,
      description: `Shop ${name.toLowerCase()} from TOBI CLOTHINGS. Tops, footwears, buttoms, bags & eyewears delivered across Accra.`,
    };
  } catch {
    return {
      title: 'The Collection | TOBI CLOTHINGS',
      description: 'Shop curated fashion from TOBI CLOTHINGS delivered across Accra.',
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
      api.catalog(category),
      api.categories(),
    ]);
  } catch {}

  const safeProducts = Array.isArray(products) ? products : [];
  const safeTree = Array.isArray(tree) ? tree : [];

  const flat: any[] = [];
  const add = (c: any) => {
    flat.push(c);
    if (c.children && Array.isArray(c.children)) c.children.forEach(add);
  };
  safeTree.forEach(add);

  const active = flat.find(
    (c) =>
      c.slug === category || c.slug === decodeURIComponent(category || ''),
  );

  return (
    <ShopCatalogView
      initialProducts={safeProducts}
      categories={safeTree}
      activeCategorySlug={category}
      categoryName={active?.name ?? 'The Collection'}
    />
  );
}
