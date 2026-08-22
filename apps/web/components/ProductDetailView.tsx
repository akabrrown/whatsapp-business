'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MessageCircle, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatGHS } from '@rose/shared';
import type { CatalogProduct } from '@/lib/api';
import { AddToBag } from './AddToBag';
import { SizeGuide } from './SizeGuide';
import { ShareButton } from './ShareButton';

export function ProductDetailView({
  product,
  whatsappNumber,
}: {
  product: CatalogProduct;
  whatsappNumber: string;
}) {
  const sizes = useMemo(
    () => [...new Set(product.variants.map((v) => v.size))].filter(Boolean) as string[],
    [product],
  );
  const colors = useMemo(
    () => [...new Set(product.variants.map((v) => v.color))].filter(Boolean) as string[],
    [product],
  );

  const [selectedSize, setSelectedSize] = useState<string | null>(sizes[0] ?? null);
  const [selectedColor, setSelectedColor] = useState<string | null>(colors[0] ?? null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // When a color is selected, automatically switch the main image to the matching color image
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    // 1. Look for explicit image tagged with this color
    if (product.imageDetails && product.imageDetails.length > 0) {
      const matchIdx = product.imageDetails.findIndex(
        (img) => img.color?.trim().toLowerCase() === color.trim().toLowerCase()
      );
      if (matchIdx !== -1) {
        setActiveImageIndex(matchIdx);
        return;
      }
    }
    // 2. Fallback to index-based mapping
    const colorIndex = colors.indexOf(color);
    if (colorIndex !== -1 && product.images[colorIndex]) {
      setActiveImageIndex(colorIndex);
    }
  };

  // When a thumbnail is clicked, switch image and sync matching color if applicable
  const handleThumbnailClick = (index: number) => {
    setActiveImageIndex(index);
    const assignedColor = product.imageDetails?.[index]?.color;
    if (assignedColor && colors.includes(assignedColor)) {
      setSelectedColor(assignedColor);
    } else if (colors[index]) {
      setSelectedColor(colors[index]);
    }
  };

  const getThumbnailForColor = (c: string, idx: number) => {
    if (product.imageDetails && product.imageDetails.length > 0) {
      const match = product.imageDetails.find(
        (img) => img.color?.trim().toLowerCase() === c.trim().toLowerCase()
      );
      if (match) return match.url;
    }
    return product.images[idx] || product.images[0];
  };

  const selectedVariant =
    product.variants.find(
      (v) =>
        (sizes.length ? v.size === selectedSize : true) &&
        (colors.length ? v.color === selectedColor : true),
    ) ?? product.variants.find((v) => v.available > 0);

  const price = selectedVariant?.priceP ?? product.minPriceP;
  const available = selectedVariant?.available ?? 0;
  const activeImage = product.images[activeImageIndex] || product.images[0] || '';

  return (
    <div className="grid gap-10 py-8 md:grid-cols-[1.2fr_1fr] lg:gap-14">
      {/* ─── Left Column: Dynamic Interactive Gallery ─── */}
      <div className="space-y-4">
        {/* Main Image */}
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-sand/20 border border-sand/40 group">
          {activeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={activeImage}
              src={activeImage}
              alt={`${product.name} — ${selectedColor || 'View'}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-charcoal/40">
              Image coming soon
            </div>
          )}

          {/* Color tag overlay */}
          {selectedColor && (
            <div className="absolute top-4 left-4 rounded-full bg-charcoal/80 backdrop-blur-md px-3.5 py-1 text-xs font-medium text-white shadow-sm flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose animate-pulse" />
              <span>{selectedColor}</span>
            </div>
          )}

          {/* Navigation arrows for multiple images */}
          {product.images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() =>
                  setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : product.images.length - 1))
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md text-charcoal backdrop-blur-sm transition hover:bg-white md:opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={() =>
                  setActiveImageIndex((prev) => (prev < product.images.length - 1 ? prev + 1 : 0))
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md text-charcoal backdrop-blur-sm transition hover:bg-white md:opacity-0 group-hover:opacity-100"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Filmstrip */}
        {product.images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none">
            {product.images.map((src, i) => {
              const isSelected = i === activeImageIndex;
              const matchingColor = product.imageDetails?.[i]?.color || colors[i];
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleThumbnailClick(i)}
                  className={`group relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-indigo ring-2 ring-indigo/30 scale-105'
                      : 'border-sand/60 opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Thumbnail ${i + 1}`} className="h-full w-full object-cover" />
                  {matchingColor && (
                    <span className="absolute inset-x-0 bottom-0 bg-charcoal/80 py-0.5 text-center text-[10px] text-white truncate px-1">
                      {matchingColor}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Right Column: Details & Variant Selection ─── */}
      <div className="flex flex-col justify-between">
        <div className="space-y-6">
          {/* Header & Share */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo/80">
                <Link href={`/shop/${product.category.slug}`} className="hover:underline">
                  {product.category.name}
                </Link>
              </p>
              <ShareButton
                title={`${product.name} | TOBI CLOTHINGS`}
                text={product.description.slice(0, 100)}
              />
            </div>
            <h1 className="headline mt-2 text-3xl sm:text-4xl text-indigo">{product.name}</h1>
            <div className="mt-3 flex items-center gap-3">
              <p className="headline text-2xl text-indigo">{formatGHS(price)}</p>
              {product.compareAtPriceP && product.compareAtPriceP > price && (
                <p className="headline text-lg text-charcoal/40 line-through">
                  {formatGHS(product.compareAtPriceP)}
                </p>
              )}
              {product.badge && (
                <span className="rounded-full bg-rose/10 text-rose font-bold px-2.5 py-0.5 text-xs uppercase tracking-wider">
                  {product.badge}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="leading-relaxed text-sm text-charcoal/70 border-y border-sand/40 py-4">
            {product.description}
          </p>

          {/* Color Selector with Live Image Switch */}
          {colors.length > 0 && (
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-charcoal/60 font-semibold">
                  Colour: <span className="font-bold text-indigo">{selectedColor}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {colors.map((c, idx) => {
                  const isSelected = selectedColor === c;
                  const thumbnail = getThumbnailForColor(c, idx);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleColorChange(c)}
                      className={`relative flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all touch-manipulation ${
                        isSelected
                          ? 'border-indigo bg-indigo text-white shadow-sm'
                          : 'border-sand/80 bg-white text-charcoal hover:border-indigo/50'
                      }`}
                    >
                      {thumbnail && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbnail}
                          alt={c}
                          className="h-5 w-5 rounded-full object-cover border border-white/40"
                        />
                      )}
                      <span>{c}</span>
                      {isSelected && <Check size={14} className="ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selector */}
          {sizes.length > 0 && (
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-charcoal/60 font-semibold">
                  Size: <span className="font-bold text-indigo">{selectedSize}</span>
                </p>
                <SizeGuide />
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const v = product.variants.find((x) => x.size === s && (selectedColor ? x.color === selectedColor : true));
                  const out = (v?.available ?? 0) <= 0;
                  const isSelected = selectedSize === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSize(s)}
                      className={`min-w-[3rem] h-11 rounded-xl border text-xs font-bold transition-all touch-manipulation ${
                        isSelected
                          ? 'border-indigo bg-indigo text-white shadow-sm'
                          : 'border-sand/80 bg-white text-charcoal hover:border-indigo/50'
                      } ${out ? 'opacity-40 line-through cursor-not-allowed' : ''}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock Indicator */}
          {available > 0 && available <= 3 && (
            <div className="rounded-lg bg-sand/30 px-3 py-2 text-xs font-medium text-charcoal/80 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose animate-ping" />
              <span>Only {available} left in this color & size</span>
            </div>
          )}
          {available === 0 && (
            <div className="rounded-lg bg-charcoal/90 px-3 py-2 text-xs font-medium text-cream flex items-center gap-2">
              <span>Sold out in this selection: Chat on WhatsApp to pre-order</span>
            </div>
          )}

          {/* Add to Bag CTA */}
          {selectedVariant && <AddToBag product={product} variantId={selectedVariant.id} image={activeImage} />}

          {/* Sizing Help Link */}
          <a
            href={`https://api.whatsapp.com/send/?phone=${whatsappNumber}&text=${encodeURIComponent(
              `Hi! I have a question about sizing and fit for ${product.name} (${selectedColor || ''} ${selectedSize || ''})`,
            )}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs text-charcoal/60 transition hover:text-indigo"
          >
            <MessageCircle size={15} className="text-wagreen" />
            <span>Questions about sizing or colours? Chat with Tobi on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
