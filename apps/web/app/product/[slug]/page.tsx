import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { api, type CatalogProduct } from '@/lib/api';
import { RUNWAY_LOOKS, lookToCatalogProduct, BRAND_NAME } from '@/lib/haute-couture-data';
import { ProductDetailView } from '@/components/ProductDetailView';
import { ProductCard } from '@/components/ProductCard';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const runwayMatch = RUNWAY_LOOKS.find((l) => l.slug === slug);
  const product = runwayMatch ? lookToCatalogProduct(runwayMatch) : await api.product(slug);
  if (!product) return { title: 'Look Not Found' };
  const price = (product.minPriceP / 100).toFixed(2);
  const imageUrl = product.images[0] || '';
  return {
    title: `${product.name} | ${BRAND_NAME}`,
    description: product.description.slice(0, 160) || `Buy ${product.name} at ${BRAND_NAME}. Price: GH₵${price}`,
    openGraph: {
      title: `${product.name} — GH₵${price}`,
      description: product.description.slice(0, 160),
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: product.name,
            },
          ]
        : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} — GH₵${price}`,
      description: product.description.slice(0, 160),
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const runwayMatch = RUNWAY_LOOKS.find((l) => l.slug === slug);

  let product: CatalogProduct | null = null;
  let recommended: CatalogProduct[] = [];
  let whatsappNumber = '233203813606';

  if (runwayMatch) {
    product = lookToCatalogProduct(runwayMatch);
    // Other runway looks as recommended
    recommended = RUNWAY_LOOKS.filter((l) => l.slug !== slug).slice(0, 4).map(lookToCatalogProduct);
  } else {
    const [fetchedProd, settings, fetchedRec] = await Promise.all([
      api.product(slug).catch(() => null),
      api.settings().catch(() => ({ whatsappNumber: '233203813606' })),
      api.related(slug, 4).catch(() => []),
    ]);
    product = fetchedProd;
    recommended = fetchedRec;
    if (settings?.whatsappNumber) whatsappNumber = settings.whatsappNumber;
  }

  if (!product) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images,
    offers: {
      '@type': 'Offer',
      price: (product.minPriceP / 100).toFixed(2),
      priceCurrency: 'GHS',
      availability: product.soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    },
  };

  return (
    <div className="space-y-16 pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      
      {/* Main Product Details View */}
      <ProductDetailView product={product} whatsappNumber={whatsappNumber} />

      {/* Recommended Products in Same Category */}
      {recommended.length > 0 && (
        <section className="border-t border-sand/40 pt-12">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-indigo/70 mb-1">
                <ShoppingBag size={14} className="text-indigo" />
                <span>You Might Also Like</span>
              </div>
              <h2 className="headline text-2xl sm:text-3xl text-indigo">
                More in {product.category.name}
              </h2>
            </div>
            <Link
              href={`/shop?category=${encodeURIComponent(product.category.slug)}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo hover:text-indigo/80 underline decoration-sand transition group"
            >
              <span>View All in {product.category.name}</span>
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {recommended.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
