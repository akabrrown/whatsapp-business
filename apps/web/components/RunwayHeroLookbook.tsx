'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, MessageCircle, ShoppingBag, Check } from 'lucide-react';
import { formatGHS } from '@rose/shared';
import { optimizeImageUrl } from '@/lib/images';
import type { CatalogProduct } from '@/lib/api';
import { useCart } from '@/lib/cart';

interface RunwayHeroLookbookProps {
  products: CatalogProduct[];
}

export function RunwayHeroLookbook({ products }: RunwayHeroLookbookProps) {
  const { add } = useCart();
  // Filter for explicitly featured products configured by admin, or fallback to first items
  const featuredProducts = products.filter((p) => p.featured);
  const displayItems = featuredProducts.length > 0 ? featuredProducts : products.slice(0, 6);

  const [activeIndex, setActiveIndex] = useState(0);
  const [addedId, setAddedId] = useState<string | null>(null);
  const activeProduct = displayItems[activeIndex] || displayItems[0];
  const carouselRef = useRef<HTMLDivElement>(null);

  // Auto-advance looks gently every 8 seconds if user is idle
  useEffect(() => {
    if (displayItems.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % displayItems.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [displayItems.length]);

  // Scroll active item thumbnail into view
  useEffect(() => {
    if (carouselRef.current) {
      const activeEl = carouselRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeIndex]);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % displayItems.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
  };

  const handleQuickAdd = async (product: CatalogProduct) => {
    const firstVariant = product.variants?.[0];
    if (!firstVariant) return;
    await add(firstVariant.id, 1, {
      name: product.name,
      slug: product.slug,
      priceP: firstVariant.priceP,
      image: product.images?.[0] || '',
      size: firstVariant.size ?? null,
      color: firstVariant.color ?? null,
      maxQty: firstVariant.available,
    });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 2000);
  };

  if (!activeProduct) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#0F1013] text-[#FAF8F5] border border-neutral-800 shadow-2xl">
      {/* ─── Top Runway Stage Header ─── */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 px-4 py-3 sm:px-8 sm:py-4">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-rose animate-pulse" />
          <span className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-neutral-300">
            Runway Edit &bull; Look {String(activeIndex + 1).padStart(2, '0')} of {String(displayItems.length).padStart(2, '0')}
          </span>
          <span className="hidden md:inline text-[11px] font-mono text-neutral-400">
            [Featured Collection &bull; Accra]
          </span>
        </div>

        {/* Stage Navigation Arrows */}
        {displayItems.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              aria-label="Previous look"
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/80 text-neutral-300 hover:border-neutral-500 hover:text-white transition active:scale-95"
            >
              <ArrowLeft size={13} />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next look"
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/80 text-neutral-300 hover:border-neutral-500 hover:text-white transition active:scale-95"
            >
              <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ─── Runway Stage: Multi-Plane Depth Viewport ─── */}
      <div className="flex flex-col-reverse lg:grid lg:grid-cols-[1.1fr_0.9fr] items-stretch min-h-[440px] sm:min-h-[500px]">
        {/* Editorial Product Information & Actions */}
        <div className="flex flex-col justify-between p-4 sm:p-8 md:p-12 z-10 border-t lg:border-t-0 border-neutral-800/80">
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              {activeProduct.category && (
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded">
                  {activeProduct.category.name}
                </span>
              )}
              {activeProduct.badge && (
                <span className="text-[10px] font-mono uppercase tracking-widest text-rose-300 bg-rose-900/30 border border-rose-500/30 px-2 py-0.5 rounded">
                  {activeProduct.badge}
                </span>
              )}
            </div>

            <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-normal leading-[1.12] tracking-tight text-white">
              {activeProduct.name}
            </h1>

            <p className="mt-2.5 sm:mt-4 max-w-md text-xs sm:text-sm text-neutral-300 font-light leading-relaxed line-clamp-2">
              {activeProduct.description ||
                'Curated piece from our latest season drop. Tailored silhouette, precision cut, and available for immediate dispatch across Accra.'}
            </p>

            {/* Price & Availability Indicator */}
            <div className="mt-4 sm:mt-6 flex items-baseline gap-2.5 sm:gap-3 flex-wrap">
              <span className="font-mono text-xl sm:text-3xl font-semibold text-white">
                {formatGHS(activeProduct.minPriceP)}
              </span>
              {activeProduct.compareAtPriceP && activeProduct.compareAtPriceP > activeProduct.minPriceP && (
                <span className="font-mono text-xs sm:text-sm text-neutral-400 line-through">
                  {formatGHS(activeProduct.compareAtPriceP)}
                </span>
              )}
              <span className="text-[10px] sm:text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                In Stock &bull; Accra Fast Delivery
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-5 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => handleQuickAdd(activeProduct)}
              disabled={activeProduct.soldOut}
              className={`inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-3.5 rounded-lg font-semibold text-xs sm:text-sm tracking-wide transition-all ${
                addedId === activeProduct.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-neutral-950 hover:bg-neutral-200 active:scale-98'
              }`}
            >
              {addedId === activeProduct.id ? (
                <>
                  <Check size={16} />
                  <span>Added to Bag</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={16} />
                  <span>Add to Bag</span>
                </>
              )}
            </button>

            <Link
              href={`/product/${activeProduct.slug}`}
              className="inline-flex items-center justify-center gap-2 border border-neutral-700 bg-neutral-900/60 text-neutral-200 hover:text-white hover:border-neutral-500 font-medium px-4 py-3 sm:py-3.5 rounded-lg transition-all text-xs sm:text-sm"
            >
              <span>View Piece Details</span>
              <ArrowRight size={14} />
            </Link>

            <a
              href={`https://wa.me/233203813606?text=Hi%20Tobi%2C%20I'm%20interested%20in%20Look%20${activeIndex + 1}%3A%20${encodeURIComponent(activeProduct.name)}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Order via WhatsApp with Tobi"
              className="inline-flex items-center justify-center gap-2 border border-neutral-800 bg-neutral-950/80 text-neutral-400 hover:text-neutral-200 font-medium px-4 py-2.5 sm:py-3.5 rounded-lg transition-all text-xs"
            >
              <MessageCircle size={15} className="text-[#25D366]" />
              <span>WhatsApp Concierge</span>
            </a>
          </div>
        </div>

        {/* Visual Stage Column: Multi-Plane Depth Model Stage (Catchy Front & Center on Mobile) */}
        <div className="relative min-h-[260px] sm:min-h-[360px] lg:min-h-full w-full bg-gradient-to-b from-[#16181D] to-[#0A0B0D] flex items-center justify-center overflow-hidden lg:border-l border-neutral-800/80">
          {/* Subtle Ambient Runway Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
            <span className="font-serif text-[80px] sm:text-[140px] lg:text-[160px] font-normal text-white/[0.04] tracking-tighter uppercase whitespace-nowrap">
              LOOK {String(activeIndex + 1).padStart(2, '0')}
            </span>
          </div>

          {/* Staged Models Layer with Mobile-Optimized Translate Offsets */}
          <div className="relative w-full h-[250px] sm:h-[360px] lg:h-[460px] flex items-center justify-center">
            {displayItems.map((prod, idx) => {
              const offset = idx - activeIndex;
              const isCurrent = offset === 0;

              // Hide far away models for clean performance
              if (Math.abs(offset) > 1 && displayItems.length > 3) return null;

              return (
                <div
                  key={prod.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`absolute transition-all duration-700 ease-out cursor-pointer ${
                    isCurrent ? 'z-20 pointer-events-auto' : 'z-10 opacity-30 hover:opacity-50'
                  }`}
                  style={{
                    transform: `translate3d(${offset * 105}px, 0, 0) scale(${isCurrent ? 1 : 0.72})`,
                    filter: isCurrent ? 'none' : 'blur(4px) grayscale(40%)',
                  }}
                >
                  {prod.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={optimizeImageUrl(prod.images[0], { width: 700, quality: 'auto' })}
                      alt={prod.name}
                      loading={isCurrent ? 'eager' : 'lazy'}
                      decoding="async"
                      width={440}
                      height={580}
                      className="h-[230px] sm:h-[330px] lg:h-[420px] w-auto object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.85)] transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-[230px] sm:h-[330px] lg:h-[420px] w-[200px] flex items-center justify-center bg-neutral-900 text-neutral-600 font-serif text-3xl">
                      TOBI
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Floating Switcher Dots for Mobile */}
          <div className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 lg:hidden">
            {displayItems.map((_, dotIdx) => (
              <button
                key={dotIdx}
                onClick={() => setActiveIndex(dotIdx)}
                aria-label={`Jump to look ${dotIdx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  dotIdx === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* Lookbook Badge */}
          <div className="absolute top-3 right-3 sm:top-auto sm:bottom-4 sm:right-4 z-30 bg-neutral-900/80 backdrop-blur-md border border-neutral-700/60 rounded px-2.5 py-1 text-right">
            <p className="text-[9px] sm:text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
              Featured Piece
            </p>
            <p className="text-[11px] sm:text-xs font-semibold text-white font-serif truncate max-w-[120px] sm:max-w-[180px]">
              {activeProduct.name}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Bottom Lookbook SKU Rail (Bidirectional Switcher) ─── */}
      {displayItems.length > 1 && (
        <div className="border-t border-neutral-800/80 bg-neutral-950/60 px-4 py-3 sm:px-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
              Runway Looks Sequence &bull; Tap Piece to Showcase
            </span>
            <span className="text-[10px] font-mono text-neutral-400">
              {displayItems.length} Featured Pieces
            </span>
          </div>

          <div
            ref={carouselRef}
            className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none"
          >
            {displayItems.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`group flex items-center gap-2.5 p-1.5 pr-3 rounded-lg border transition-all text-left shrink-0 ${
                    isSelected
                      ? 'border-neutral-400 bg-neutral-800/90 text-white shadow-md ring-1 ring-white/20'
                      : 'border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  {item.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={optimizeImageUrl(item.images[0], { width: 100, quality: 'auto' })}
                      alt={item.name}
                      width={36}
                      height={44}
                      className="h-10 w-8 rounded object-cover border border-neutral-800 shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-8 rounded bg-neutral-800 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </div>
                  )}
                  <div className="min-w-0 pr-1">
                    <p className="text-[11px] font-medium truncate max-w-[130px]">
                      {item.name}
                    </p>
                    <p className="text-[10px] font-mono text-neutral-400">
                      {formatGHS(item.minPriceP)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
