import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { api, type CatalogProduct } from '@/lib/api';
import { ProductDetailView } from '@/components/ProductDetailView';
import { ProductCard } from '@/components/ProductCard';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await api.product(slug);
  if (!product) return { title: 'Product Not Found' };
  const price = (product.minPriceP / 100).toFixed(2);
  const imageUrl = product.images[0] || '';
  return {
    title: `${product.name} | TOBI CLOTHINGS`,
    description: product.description.slice(0, 160) || `Buy ${product.name} at TOBI CLOTHINGS. Price: GH₵${price}`,
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
  const [product, settings, recommended] = await Promise.all([
    api.product(slug),
    api.settings(),
    api.related(slug, 4),
  ]);
  if (!product) notFound(); // §3.5: unknown slug resolves to a clean 404

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
      <ProductDetailView product={product} whatsappNumber={settings.whatsappNumber} />

      {/* Recommended Products in Same Category */}
      {recommended.length > 0 && (
        <section className="border-t border-sand/40 pt-12">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-indigo/70 mb-1">
                <Sparkles size={14} className="text-amber-500" />
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
