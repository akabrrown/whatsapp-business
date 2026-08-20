import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { ProductDetailView } from '@/components/ProductDetailView';

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
      <ProductDetailView product={product} whatsappNumber={settings.whatsappNumber} />
    </>
  );
}
