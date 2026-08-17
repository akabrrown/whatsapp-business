// Homepage — asymmetric hero, editorial category strip, irregular "New In" (ux.md §3.1).
import Link from 'next/link';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

export default async function HomePage() {
  let products: Awaited<ReturnType<typeof api.catalog>> = [];
  let categories: Awaited<ReturnType<typeof api.categories>> = [];
  try {
    [products, categories] = await Promise.all([api.catalog(), api.categories()]);
  } catch {
    // render the brand shell even if the API is momentarily down
  }
  const newIn = products.slice(0, 3); // catalog returns newest first

  return (
    <>
      {/* Hero — image bleeds right, copy overlaps its edge */}
      <section className="relative -mx-4 md:-mx-6">
        <div className="grid md:grid-cols-[55%_45%]">
          <div className="relative z-10 flex flex-col justify-center px-6 py-16 md:py-24 lg:pr-0">
            <p className="mb-4 inline-block w-fit bg-sand/30 px-2 py-1 text-xs tracking-widest text-charcoal/70">
              ACCRA · BY KUKUA
            </p>
            <h1 className="headline text-4xl leading-tight md:text-6xl">
              Denim that fits the life you&apos;re actually living.
            </h1>
            <p className="mt-5 max-w-md text-charcoal/70">
              Jeans, female wear, bags and accessories — browse here, finish your order
              in a WhatsApp chat with Kukua herself.
            </p>
            <Link
              href="/shop"
              className="mt-8 w-fit border-b-2 border-indigo pb-1 text-sm font-medium text-indigo hover:border-rose hover:text-rose"
            >
              Shop the Collection →
            </Link>
          </div>
          <div className="relative min-h-[320px] bg-indigo md:min-h-[520px]">
            {products[0]?.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={products[0].images[0]} alt={products[0].name} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-end justify-end p-8 font-serif text-6xl text-cream/40">R&amp;D</div>
            )}
            <div className="absolute -left-6 bottom-10 hidden bg-cream px-4 py-3 text-xs text-charcoal/70 shadow-sm md:block">
              New drop, hand-picked weekly
            </div>
          </div>
        </div>
      </section>

      {/* Shop by category — flagship card larger than the rest */}
      {categories.length > 0 && (
        <section className="mt-20">
          <h2 className="headline mb-6 text-2xl">Shop by Category</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2">
            {categories.slice(0, 5).map((c, i) => (
              <Link
                key={c.slug}
                href={`/shop/${c.slug}`}
                className={`group relative flex items-end overflow-hidden bg-indigo/5 p-5 hover:bg-sand/20 ${
                  c.flagship ? 'col-span-2 row-span-2 min-h-[260px] bg-indigo/10' : 'min-h-[120px]'
                }`}
              >
                <span className={`${c.flagship ? 'headline text-3xl' : 'text-base text-charcoal'}`}>{c.name}</span>
                {c.flagship && <span className="absolute right-4 top-4 text-xs tracking-widest text-rose">FLAGSHIP</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* New In — one featured + two smaller */}
      {newIn.length > 0 && (
        <section className="mt-20">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="headline text-2xl">New In</h2>
            <Link href="/shop" className="text-sm text-charcoal/60 underline hover:text-indigo">view all</Link>
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="col-span-2">
              <ProductCard product={newIn[0]} large />
            </div>
            {newIn.slice(1, 3).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
