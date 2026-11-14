'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Flame,
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'details' | 'delivery' | 'sizing'>('details');

  // When a color is selected, automatically switch the main image to the matching color image
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    if (product.imageDetails && product.imageDetails.length > 0) {
      const matchIdx = product.imageDetails.findIndex(
        (img) => img.color?.trim().toLowerCase() === color.trim().toLowerCase(),
      );
      if (matchIdx !== -1) {
        setActiveImageIndex(matchIdx);
        return;
      }
    }
    const colorIndex = colors.indexOf(color);
    if (colorIndex !== -1 && product.images[colorIndex]) {
      setActiveImageIndex(colorIndex);
    }
  };

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
        (img) => img.color?.trim().toLowerCase() === c.trim().toLowerCase(),
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
  const available = selectedVariant?.available ?? product.totalAvailable ?? 0;
  const activeImage = product.images[activeImageIndex] || product.images[0] || '';

  const discountPercent =
    product.compareAtPriceP && product.compareAtPriceP > price
      ? Math.round(((product.compareAtPriceP - price) / product.compareAtPriceP) * 100)
      : null;

  return (
    <div className="py-4 sm:py-8 space-y-8">
      {/* ─── Breadcrumbs (Image 1 Mykart & Image 5 Guza Inspiration) ─── */}
      <nav className="text-xs text-charcoal/50 flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:text-indigo">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-indigo">Shop</Link>
        <span>/</span>
        <Link href={`/shop/${product.category.slug}`} className="hover:text-indigo">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-indigo font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      {/* ─── Two-Column Product Experience ─── */}
      <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] lg:gap-14">
        {/* ─── Left Column: Gallery & Thumbnails ─── */}
        <div className="space-y-4">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-sand/15 border border-sand/40 group shadow-xs">
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

            {/* Overlays */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
              {discountPercent !== null && discountPercent > 0 && (
                <span className="rounded bg-rose px-2.5 py-1 text-xs font-bold text-white shadow-xs">
                  {discountPercent}% OFF
                </span>
              )}
              {selectedColor && (
                <div className="rounded-full bg-charcoal/80 backdrop-blur-md px-3 py-1 text-xs font-medium text-white shadow-xs flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose" />
                  <span>{selectedColor}</span>
                </div>
              )}
            </div>

            {/* Nav Arrows */}
            {product.images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={() =>
                    setActiveImageIndex((prev) =>
                      prev > 0 ? prev - 1 : product.images.length - 1,
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md text-charcoal backdrop-blur-sm transition hover:bg-white active:scale-95"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={() =>
                    setActiveImageIndex((prev) =>
                      prev < product.images.length - 1 ? prev + 1 : 0,
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md text-charcoal backdrop-blur-sm transition hover:bg-white active:scale-95"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>

          {/* Filmstrip */}
          {product.images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
              {product.images.map((src, i) => {
                const isSelected = i === activeImageIndex;
                const matchingColor = product.imageDetails?.[i]?.color || colors[i];
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleThumbnailClick(i)}
                    className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-indigo ring-2 ring-indigo/30 scale-105'
                        : 'border-sand/50 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    {matchingColor && (
                      <span className="absolute inset-x-0 bottom-0 bg-charcoal/80 py-0.5 text-center text-[9px] text-white truncate px-1">
                        {matchingColor}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Right Column: Details, Urgency, Options & Buy ─── */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo/80">
                {product.category.name}
              </span>
              <ShareButton
                title={`${product.name} | TOBI CLOTHINGS`}
                text={product.description.slice(0, 100)}
              />
            </div>
            <h1 className="headline mt-1.5 text-3xl sm:text-4xl">{product.name}</h1>

            {/* Price Row */}
            <div className="mt-3 flex items-center gap-3">
              <p className="headline text-2xl sm:text-3xl font-bold text-indigo">
                {formatGHS(price)}
              </p>
              {product.compareAtPriceP && product.compareAtPriceP > price && (
                <p className="text-lg text-charcoal/40 line-through">
                  {formatGHS(product.compareAtPriceP)}
                </p>
              )}
              {product.badge && (
                <span className="rounded-full bg-rose/10 text-rose font-bold px-3 py-0.5 text-xs uppercase tracking-wider">
                  {product.badge}
                </span>
              )}
            </div>

            {/* Stock Urgency Progress Bar (Image 1 Mykart Inspiration) */}
            {available > 0 && available <= 8 && (
              <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Flame size={14} className="text-amber-600 animate-bounce" />
                    Hurry! Only {available} piece{available > 1 ? 's' : ''} left in stock
                  </span>
                  <span className="text-[11px] text-amber-700">High Demand</span>
                </div>
                <div className="h-2 w-full rounded-full bg-amber-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-amber-500 to-rose"
                    style={{ width: `${Math.max(15, (available / 8) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Color Selector */}
          {colors.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-charcoal/70 font-semibold mb-2">
                Colour: <span className="font-bold text-indigo">{selectedColor}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c, idx) => {
                  const isSelected = selectedColor === c;
                  const thumb = getThumbnailForColor(c, idx);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleColorChange(c)}
                      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-indigo bg-indigo text-white shadow-xs'
                          : 'border-sand/60 bg-white text-charcoal hover:border-indigo/50'
                      }`}
                    >
                      {thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={c}
                          className="h-4 w-4 rounded-full object-cover border border-white/40"
                        />
                      )}
                      <span>{c}</span>
                      {isSelected && <Check size={13} className="ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selector + Size Guide */}
          {sizes.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-charcoal/70 font-semibold">
                  Size: <span className="font-bold text-indigo">{selectedSize}</span>
                </p>
                <SizeGuide />
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const v = product.variants.find(
                    (x) =>
                      x.size === s && (selectedColor ? x.color === selectedColor : true),
                  );
                  const out = (v?.available ?? 0) <= 0;
                  const isSelected = selectedSize === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSize(s)}
                      className={`min-w-[42px] h-10 px-3 rounded-xl border text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-indigo bg-indigo text-white shadow-xs'
                          : 'border-sand/60 bg-white text-charcoal hover:border-indigo/50'
                      } ${out ? 'opacity-40 line-through cursor-not-allowed' : ''}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dual CTAs: Web Cart + Direct WhatsApp */}
          <div className="space-y-3 pt-2">
            {selectedVariant && (
              <AddToBag
                product={product}
                variantId={selectedVariant.id}
                image={activeImage}
              />
            )}

            <a
              href={`https://api.whatsapp.com/send/?phone=${whatsappNumber}&text=${encodeURIComponent(
                `Hi Tobi! I want to order ${product.name} (${selectedColor || ''} ${selectedSize || ''}) - ${formatGHS(price)}. Is it available for delivery in Accra?`,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-wagreen bg-wagreen/10 py-3 text-sm font-semibold text-wagreen hover:bg-wagreen/20 transition-all active:scale-95"
            >
              <MessageCircle size={18} /> Instant Order on WhatsApp
            </a>
          </div>

          {/* Value Badges Block (Image 1 Mykart Inspiration) */}
          <div className="rounded-xl border border-sand/30 bg-white/70 p-4 grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 text-charcoal/80">
              <Truck size={17} className="text-indigo shrink-0" />
              <span>Accra Express Delivery</span>
            </div>
            <div className="flex items-center gap-2 text-charcoal/80">
              <ShieldCheck size={17} className="text-wagreen shrink-0" />
              <span>MoMo &amp; Cash Accepted</span>
            </div>
            <div className="flex items-center gap-2 text-charcoal/80">
              <CheckCircle2 size={17} className="text-sand shrink-0" />
              <span>Hand-Inspected Quality</span>
            </div>
            <div className="flex items-center gap-2 text-charcoal/80">
              <RotateCcw size={17} className="text-rose shrink-0" />
              <span>Hassle-Free Fit Exchange</span>
            </div>
          </div>

          {/* Description Tabs */}
          <div className="border-t border-sand/30 pt-4">
            <div className="flex border-b border-sand/30 text-xs font-semibold gap-6 pb-2">
              <button
                onClick={() => setActiveTab('details')}
                className={`transition-colors ${
                  activeTab === 'details'
                    ? 'border-b-2 border-indigo text-indigo pb-2 -mb-2.5 font-bold'
                    : 'text-charcoal/60 hover:text-charcoal'
                }`}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab('delivery')}
                className={`transition-colors ${
                  activeTab === 'delivery'
                    ? 'border-b-2 border-indigo text-indigo pb-2 -mb-2.5 font-bold'
                    : 'text-charcoal/60 hover:text-charcoal'
                }`}
              >
                Accra Delivery
              </button>
              <button
                onClick={() => setActiveTab('sizing')}
                className={`transition-colors ${
                  activeTab === 'sizing'
                    ? 'border-b-2 border-indigo text-indigo pb-2 -mb-2.5 font-bold'
                    : 'text-charcoal/60 hover:text-charcoal'
                }`}
              >
                Fit Advice
              </button>
            </div>

            <div className="pt-3 text-xs leading-relaxed text-charcoal/70">
              {activeTab === 'details' && (
                <p>{product.description || 'Premium curated clothing tailored for modern comfort.'}</p>
              )}
              {activeTab === 'delivery' && (
                <p>
                  Dispatched from Central Accra. Delivery zones include East Legon (GH₵25), Osu (GH₵20), Cantonments (GH₵20), Airport (GH₵25), Spintex (GH₵30), Dansoman (GH₵30), Madina (GH₵30), and Tema (GH₵40).
                </p>
              )}
              {activeTab === 'sizing' && (
                <p>
                  True to size. For an oversized streetwear aesthetic, order one size up. Feel free to send your height &amp; build to Tobi on WhatsApp for instant confirmation.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Sticky Mobile Action Bar (Native App Inspiration) ─── */}
      <div className="fixed bottom-14 left-0 right-0 z-30 md:hidden bg-white/95 backdrop-blur-md border-t border-sand/40 p-3 shadow-lg flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] text-charcoal/50 uppercase font-semibold">Total Price</p>
          <p className="headline text-base font-bold text-indigo">{formatGHS(price)}</p>
        </div>
        {selectedVariant ? (
          <div className="flex-1 max-w-[200px]">
            <AddToBag
              product={product}
              variantId={selectedVariant.id}
              image={activeImage}
            />
          </div>
        ) : (
          <span className="text-xs text-charcoal/50">Unavailable</span>
        )}
      </div>
    </div>
  );
}
