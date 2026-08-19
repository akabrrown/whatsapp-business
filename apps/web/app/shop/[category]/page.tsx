// Category / catalog grid: broken grid rhythm, text-based category tabs (ux.md §3.2).
import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

export async function generateMetadata({ params }: { params: Promise<{ category?: string }> }): Promise<Metadata> {
  const { category } = await params;
  const tree = await api.categories();
  
  const flat: any[] = [];
  const add = (c: any) => { flat.push(c); if (c.children) c.children.forEach(add); };
  tree.forEach(add);
  
  const active = flat.find((c) => c.slug === category);
  const name = active?.name ?? 'The Collection';
  return {
    title: `${name} | TOBI CLOTHINGS`,
    description: `Shop ${name.toLowerCase()} from TOBI CLOTHINGS. Tops, footwears, buttoms, bags & eyewears delivered across Accra.`,
  };
}

export default async function ShopPage({ params }: { params: Promise<{ category?: string }> }) {
  const { category } = await params;
  const [products, tree] = await Promise.all([api.catalog(category), api.categories()]);
  
  const flat: any[] = [];
  const parentMap = new Map<string, any>();
  const add = (c: any, p: any) => { 
    flat.push(c); 
    parentMap.set(c.slug, p); 
    if (c.children) c.children.forEach((child: any) => add(child, c)); 
  };
  tree.forEach((c) => add(c, null));
  
  const active = flat.find((c) => c.slug === category || c.slug === decodeURIComponent(category || ''));
  
  let navLinks = tree;
  if (active) {
    if (active.children && active.children.length > 0) {
      navLinks = active.children;
    } else {
      const parent = parentMap.get(active.slug);
      if (parent && parent.children) navLinks = parent.children;
    }
  }

  return (
    <div className="py-10">
      <div className="mb-8 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <h1 className="headline text-3xl">{active?.name ?? 'The Collection'}</h1>
        <nav className="flex flex-wrap gap-4 text-sm text-charcoal/60">
          <Link href="/shop" className={!category ? 'border-b border-indigo text-indigo' : 'hover:text-indigo'}>All</Link>
          {navLinks.map((c) => (
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
