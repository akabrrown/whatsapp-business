'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Star } from 'lucide-react';
import { formatGHS } from '@rose/shared';
import type { CatalogProduct } from '@/lib/api';
import { optimizeImageUrl } from '@/lib/images';
import { AddToBag } from './AddToBag';

// Map common color names to CSS colors for swatch preview
const COLOR_MAP: Record<string, string> = {
  black: '#1f2937',
  white: '#f9fafb',
  grey: '#9ca3af',
  gray: '#9ca3af',
  navy: '#1e3a8a',
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#10b981',
  olive: '#556b2f',
  beige: '#f5f5dc',
  brown: '#78350f',
  khaki: '#c3b091',
  yellow: '#f59e0b',
  pink: '#ec4899',
  cream: '#fdfbf7',
  burgundy: '#800020',
};

export function ProductCard({
  product,
  large = false,
}: {
  product: CatalogProduct;
  large?: boolean;
}) {
  const [isWished, setIsWished] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`wish_${product.id}`);
      if (saved === '1') setIsWished(true);
    } catch {}
  }, [product.id]);

  const toggleWish = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !isWished;
    setIsWished(next);
    try {
      if (next) localStorage.setItem(`wish_${product.id}`, '1');
      else localStorage.removeItem(`wish_${product.id}`);
    } catch {}
  };

  const src = product.images[0];
  const colors = Array.from(
    new Set(product.variants.map((v) => v.color).filter(Boolean)),
  ) as string[];

  const discountPercent =
    product.compareAtPriceP && product.compareAtPriceP > product.minPriceP
      ? Math.round(
          ((product.compareAtPriceP - product.minPriceP) /
            product.compareAtPriceP) *
            100,
        )
      : null;

  return (
    <div
      className={`group relative flex flex-col rounded-xl bg-white/70 p-2 sm:p-2.5 transition-all duration-300 hover:shadow-md hover:bg-white border border-sand/20 ${
        large ? 'md:row-span-2' : ''
      }`}
    >
      {/* ─── Media Container ─── */}
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-[3/4] w-full overflow-hidden rounded-lg bg-sand/15"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={optimizeImageUrl(src, { width: 450, quality: 'auto' })}
            alt={product.name}
            loading="lazy"
            decoding="async"
            width={300}
            height={400}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-charcoal/40">
            Image coming soon
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute left-2 top-2 flex flex-col gap-1 z-10">
          {product.soldOut ? (
            <span className="rounded bg-charcoal/90 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-cream shadow-xs">
              Sold Out
            </span>
          ) : (
            <>
              {discountPercent !== null && discountPercent > 0 && (
                <span className="rounded bg-rose px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                  -{discountPercent}%
                </span>
              )}
              {product.badge && (
                <span className="rounded bg-indigo px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                  {product.badge}
                </span>
              )}
            </>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={toggleWish}
          aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition-all active:scale-90 ${
            isWished
              ? 'bg-rose text-white shadow-sm'
              : 'bg-white/80 text-charcoal/70 hover:bg-white hover:text-rose'
          }`}
        >
          <Heart
            size={14}
            className={isWished ? 'fill-current' : ''}
            strokeWidth={isWished ? 2.5 : 2}
          />
        </button>
      </Link>

      {/* ─── Product Info ─── */}
      <div className="mt-2.5 flex flex-1 flex-col justify-between">
        <div>
          {/* Color swatch dots preview (Veloura & Guza inspiration) */}
          {colors.length > 0 && (
            <div className="mb-1.5 flex items-center gap-1">
              {colors.slice(0, 4).map((c) => {
                const hex = COLOR_MAP[c.toLowerCase()] || '#d1d5db';
                return (
                  <span
                    key={c}
                    title={c}
                    className="h-2.5 w-2.5 rounded-full border border-charcoal/20 shadow-2xs"
                    style={{ backgroundColor: hex }}
                  />
                );
              })}
              {colors.length > 4 && (
                <span className="text-[10px] font-medium text-charcoal/75">
                  +{colors.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Rating stars preview */}
          <div className="mb-1 flex items-center gap-1 text-amber-500">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={11}
                  className="fill-current text-amber-500"
                />
              ))}
            </div>
            <span className="text-[10px] font-semibold text-charcoal/75">
              5.0
            </span>
          </div>

          {/* Title */}
          <Link
            href={`/product/${product.slug}`}
            className="line-clamp-1 text-xs font-medium text-charcoal transition-colors hover:text-indigo sm:text-sm"
          >
            {product.name}
          </Link>

          {/* Price */}
          <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-indigo">
              {formatGHS(product.minPriceP)}
            </span>
            {product.compareAtPriceP &&
              product.compareAtPriceP > product.minPriceP && (
                <span className="text-xs text-charcoal/60 line-through">
                  {formatGHS(product.compareAtPriceP)}
                </span>
              )}
          </div>

          {/* Urgency indicator if low stock */}
          {product.lowStock && !product.soldOut && (
            <p className="mt-1 text-[10px] font-bold text-rose flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-rose animate-pulse" />
              Only {product.totalAvailable} left
            </p>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-2.5 pt-1 border-t border-sand/20">
          {!product.soldOut ? (
            <AddToBag product={product} compact />
          ) : (
            <span className="block text-center text-[11px] font-medium text-charcoal/70 py-1">
              Out of stock
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
