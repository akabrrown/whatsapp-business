// Search results: empty result shows category shortcuts instead of a dead end (§3.6).
import Link from 'next/link';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const term = q?.trim() ?? '';
  const [products, categories] = term ? await Promise.all([api.search(term), api.categories()]) : [await api.catalog(), []];

  return (
    <div className="py-10">
      <h1 className="headline text-3xl">{term ? `Search: “${term}”` : 'The Collection'}</h1>
      {products.length === 0 ? (
        <div className="mt-12 max-w-md">
          <p className="text-charcoal/70">
            Nothing matched that: yet. Try one of these instead, or ask Tobi on WhatsApp;
            he knows where everything is.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {categories.map((c) => (
              <Link key={c.slug} href={`/shop/${c.slug}`} className="border border-charcoal/30 px-3 py-1.5 text-sm hover:border-indigo hover:text-indigo">
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
