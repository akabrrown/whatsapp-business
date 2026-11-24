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
      className={`group relative flex flex-col rounded-xl bg-white p-2.5 sm:p-3 transition-all duration-300 hover:shadow-md border border-neutral-200/80 ${
        large ? 'md:row-span-2' : ''
      }`}
    >
      {/* ─── Media Container ─── */}
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-[3/4] w-full overflow-hidden rounded-lg bg-neutral-100"
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
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
            Image coming soon
          </div>
        )}

        {/* Minimal Badges Overlay */}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1 z-10 max-w-[calc(100%-44px)]">
          {product.soldOut ? (
            <span className="rounded bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white">
              Sold Out
            </span>
          ) : (
            <>
              {discountPercent !== null && discountPercent > 0 && (
                <span className="rounded bg-neutral-900 text-white px-2 py-0.5 text-[10px] font-bold">
                  -{discountPercent}%
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
          className={`absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all active:scale-90 ${
            isWished
              ? 'bg-neutral-900 text-white'
              : 'bg-white/80 text-neutral-700 hover:bg-white hover:text-black'
          }`}
        >
          <Heart
            size={14}
            className={isWished ? 'fill-current' : ''}
            strokeWidth={isWished ? 2.5 : 2}
          />
        </button>
      </Link>

      {/* ─── Product Info (Clean Editorial Typography) ─── */}
      <div className="mt-3 flex flex-1 flex-col justify-between">
        <div>
          {/* Title */}
          <Link
            href={`/product/${product.slug}`}
            className="line-clamp-1 text-xs sm:text-sm font-medium text-neutral-900 transition-colors hover:text-neutral-600"
          >
            {product.name}
          </Link>

          {/* Price */}
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-neutral-950 font-mono">
              {formatGHS(product.minPriceP)}
            </span>
            {product.compareAtPriceP &&
              product.compareAtPriceP > product.minPriceP && (
                <span className="text-xs text-neutral-400 line-through font-mono">
                  {formatGHS(product.compareAtPriceP)}
                </span>
              )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-3 pt-2 border-t border-neutral-100">
          {!product.soldOut ? (
            <AddToBag product={product} compact />
          ) : (
            <span className="block text-center text-[11px] font-medium text-neutral-400 py-1">
              Sold out
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
