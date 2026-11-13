// Category / catalog grid: responsive editorial filters, mobile bottom sheet & column switchers.
import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { ShopCatalogView } from '@/components/ShopCatalogView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category?: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const tree = await api.categories();

  const flat: any[] = [];
  const add = (c: any) => {
    flat.push(c);
    if (c.children) c.children.forEach(add);
  };
  tree.forEach(add);

  const active = flat.find((c) => c.slug === category);
  const name = active?.name ?? 'The Collection';
  return {
    title: `${name} | TOBI CLOTHINGS`,
    description: `Shop ${name.toLowerCase()} from TOBI CLOTHINGS. Tops, footwears, buttoms, bags & eyewears delivered across Accra.`,
  };
}

export default async function ShopPage({
  params,
}: {
  params: Promise<{ category?: string }>;
}) {
  const { category } = await params;
  const [products, tree] = await Promise.all([
    api.catalog(category),
    api.categories(),
  ]);

  const flat: any[] = [];
  const add = (c: any) => {
    flat.push(c);
    if (c.children) c.children.forEach(add);
  };
  tree.forEach(add);

  const active = flat.find(
    (c) =>
      c.slug === category || c.slug === decodeURIComponent(category || ''),
  );

  return (
    <ShopCatalogView
      initialProducts={products}
      categories={tree}
      activeCategorySlug={category}
      categoryName={active?.name ?? 'The Collection'}
    />
  );
}
