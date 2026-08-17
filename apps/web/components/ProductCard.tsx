// Product card: placeholder-safe image (§3.4), restrained stock tags (§3.2).
import Link from 'next/link';
import { formatGHS } from '@rose/shared';
import type { CatalogProduct } from '@/lib/api';
import { AddToBag } from './AddToBag';

export function ProductCard({ product, large = false }: { product: CatalogProduct; large?: boolean }) {
  const src = product.images[0];
  return (
    <div className={`group flex flex-col ${large ? 'md:row-span-2' : ''}`}>
      <Link href={`/product/${product.slug}`} className="relative block overflow-hidden bg-sand/20">
        {src ? (
          // Images arrive as data-URI placeholders (sim) or CDN URLs (real mode).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={product.name}
            className={`w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${large ? 'aspect-[3/4]' : 'aspect-[3/4]'}`}
          />
        ) : (
          <div className={`flex w-full items-center justify-center bg-sand/20 text-sm text-charcoal/40 ${large ? 'aspect-[3/4]' : 'aspect-[3/4]'}`}>
            Image coming soon
          </div>
        )}
        {product.soldOut && (
          <span className="absolute left-3 top-3 bg-charcoal/80 px-2 py-1 text-xs tracking-wide text-cream">
            Sold out: chat to pre-order
          </span>
        )}
      </Link>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <Link href={`/product/${product.slug}`} className="text-sm text-charcoal hover:text-indigo">
            {product.name}
          </Link>
          <p className="mt-0.5 text-sm font-medium text-indigo">{formatGHS(product.minPriceP)}</p>
          {product.lowStock && !product.soldOut && (
            <p className="mt-1 inline-block bg-sand/30 px-1.5 py-0.5 text-xs text-charcoal/80">
              Only {product.totalAvailable} left
            </p>
          )}
        </div>
        {!product.soldOut && <AddToBag product={product} compact />}
      </div>
    </div>
  );
}
