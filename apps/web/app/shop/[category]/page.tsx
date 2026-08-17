// Category / catalog grid: broken grid rhythm, text-based category tabs (ux.md §3.2).
import Link from 'next/link';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

export default async function ShopPage({ params }: { params: Promise<{ category?: string }> }) {
  const { category } = await params;
  const [products, categories] = await Promise.all([api.catalog(category), api.categories()]);
  const active = categories.find((c) => c.slug === category);

  return (
    <div className="py-10">
      <div className="mb-8 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <h1 className="headline text-3xl">{active?.name ?? 'The Collection'}</h1>
        <nav className="flex flex-wrap gap-4 text-sm text-charcoal/60">
          <Link href="/shop" className={!category ? 'border-b border-indigo text-indigo' : 'hover:text-indigo'}>All</Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/shop/${c.slug}`}
              className={c.slug === category ? 'border-b border-indigo text-indigo' : 'hover:text-indigo'}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </div>

      {products.length === 0 ? (
        <p className="mt-16 text-center text-charcoal/60">
          Nothing here yet: new pieces land every week.{' '}
          <Link href="/shop" className="text-indigo underline">Browse everything</Link>
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => (
            // every 7th tile spans two columns for editorial rhythm (§3.2)
            <div key={p.id} className={i % 7 === 3 ? 'col-span-2' : ''}>
              <ProductCard product={p} large={i % 7 === 3} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
