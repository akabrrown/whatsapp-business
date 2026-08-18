// Product detail page: asymmetric two-column, filmstrip incl. detail shot (ux.md §3.3).
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { VariantPicker } from '@/components/VariantPicker';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await api.product(slug);
  if (!product) return { title: 'Product Not Found' };
  const price = (product.minPriceP / 100).toFixed(2);
  return {
    title: `${product.name} | ROSE & DENIM BY KUKUA`,
    description: product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 160),
      images: product.images[0] ? [{ url: product.images[0], alt: product.name }] : [],
      type: 'website',
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([
    api.product(slug),
    api.settings(),
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
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="grid gap-10 py-10 md:grid-cols-[3fr_2fr]">
      <div>
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0]} alt={product.name} className="w-full object-cover" />
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center bg-sand/20 text-charcoal/40">Image coming soon</div>
        )}
        {product.images.length > 1 && (
          <div className="mt-3 flex gap-3">
            {product.images.slice(1, 4).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt={`${product.name} detail ${i + 1}`} className="h-24 w-20 object-cover opacity-90 hover:opacity-100" />
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-charcoal/50">
          <Link href={`/shop/${product.category.slug}`} className="hover:text-indigo">{product.category.name}</Link>
        </p>
        <h1 className="headline mt-2 text-3xl md:text-4xl">{product.name}</h1>
        <p className="mt-4 leading-relaxed text-charcoal/70">{product.description}</p>
        <div className="mt-8">
          <VariantPicker product={product} whatsappNumber={settings.whatsappNumber} />
        </div>
      </div>
      </div>
    </>
  );
}
