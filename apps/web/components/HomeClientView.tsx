'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Truck,
  ShieldCheck,
  MessageCircle,
  ShoppingBag,
  Flame,
  CheckCircle,
  Tag,
  Star,
  ChevronRight,
} from 'lucide-react';
import type { CatalogProduct, Category } from '@/lib/api';
import { optimizeImageUrl } from '@/lib/images';
import { ProductCard } from './ProductCard';
import { LiveSearchBar } from './LiveSearchBar';
import { StoryCategoryBar } from './StoryCategoryBar';
import { FlashDropCountdown } from './FlashDropCountdown';

interface HomeClientViewProps {
  products: CatalogProduct[];
  categories: Category[];
}

export function HomeClientView({ products = [], categories = [] }: HomeClientViewProps) {
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const [activeTab, setActiveTab] = useState<'all' | 'men' | 'women' | 'footwear'>('all');

  // Filter products based on selected tab
  const filteredProducts = safeProducts.filter((p) => {
    if (activeTab === 'all') return true;
    const cat = p.category?.slug?.toLowerCase() || '';
    if (activeTab === 'men') return cat.includes('men') && !cat.includes('women');
    if (activeTab === 'women') return cat.includes('women');
    if (activeTab === 'footwear') return cat.includes('footwear') || cat.includes('shoe');
    return true;
  });

  const featuredList = filteredProducts.slice(0, 8);
  const newArrivals = safeProducts.slice(0, 4);

  // Quick category pills (FORMA & Guza inspiration)
  const quickCategories = [
    { name: 'All Collection', slug: '' },
    { name: "Men's Fashion", slug: 'mens-fashion' },
    { name: "Women's Fashion", slug: 'womens-fashion' },
    { name: 'Tops & Shirts', slug: 'mens-fashion-tops' },
    { name: 'Bottoms & Denim', slug: 'mens-fashion-bottoms' },
    { name: 'Footwears', slug: 'mens-fashion-footwears' },
    { name: 'Bags & Accessories', slug: 'mens-fashion-accessories' },
  ];

  return (
    <div className="space-y-10 sm:space-y-14 md:space-y-18">
      {/* ─── 1. TOP DISCOVERY BAR: EXPLORE STORIES & CATEGORIES (Mobile App & Desktop) ─── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between px-1">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose shrink-0" />
              Live Highlights &amp; Drops
            </span>
            <h2 className="headline text-xl sm:text-2xl font-normal mt-0.5">
              Explore Stories &amp; Categories
            </h2>
          </div>
          <Link
            href="/shop"
            className="text-xs font-semibold text-indigo hover:text-rose transition-colors flex items-center gap-1 group"
          >
            <span>View All</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <StoryCategoryBar categories={categories} />
      </section>

      {/* ─── 2. HERO SECTION (Double-Bezel Architecture & Button-in-Button CTA) ─── */}
      <section className="double-bezel">
        <div className="double-bezel-inner relative overflow-hidden bg-gradient-to-br from-indigo/5 via-cream to-sand/15 p-5 sm:p-8 md:p-12 lg:p-14">
          <div className="grid items-center gap-8 md:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col justify-center">
              {/* Live Search Bar directly accessible on mobile and desktop */}
              <div className="mb-4 max-w-md min-h-[46px]">
                <LiveSearchBar categories={categories} />
              </div>

              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo">
                  <span className="h-1.5 w-1.5 rounded-full bg-sand shrink-0" /> Season Drop &apos;26
                </span>
                <span className="text-xs font-semibold text-charcoal/80 hidden sm:inline">
                  Accra, Ghana
                </span>
              </div>

              <h1 className="headline text-3xl sm:text-5xl lg:text-6xl font-normal leading-[1.12] tracking-tight">
                Tops, Footwears &amp; Everyday Luxury.
              </h1>

              <p className="mt-4 max-w-lg text-xs sm:text-sm md:text-base leading-relaxed text-charcoal/80">
                Hand-picked collections delivered to your doorstep in East Legon, Osu, Cantonments, Spintex &amp; across Accra. Browse online or finish instantly on WhatsApp with Tobi.
              </p>

              {/* High-End Button-in-Button Trailing Icon Architecture */}
              <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/shop"
                  className="group inline-flex items-center gap-3 rounded-full bg-indigo pl-6 pr-2 py-2 text-xs sm:text-sm font-semibold text-cream shadow-md transition-spring hover:bg-indigo-deep active:scale-95"
                >
                  <span>Shop Collection</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-cream transition-spring group-hover:scale-105 group-hover:translate-x-0.5">
                    <ArrowRight size={15} />
                  </span>
                </Link>

                <a
                  href="https://wa.me/233203813606?text=Hi%20Tobi%2C%20I'm%20browsing%20the%20store%20and%20would%20like%20to%20order"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Chat with WhatsApp Concierge to browse and order"
                  className="group inline-flex items-center gap-2.5 rounded-full bg-wagreen/10 border border-wagreen/30 px-5 py-2.5 text-xs sm:text-sm font-semibold text-wagreen-dark hover:bg-wagreen/20 transition-spring active:scale-95"
                >
                  <MessageCircle size={16} />
                  <span>WhatsApp Concierge</span>
                </a>
              </div>
            </div>

            {/* Hero Visual Imagery */}
            <div className="relative aspect-[4/3] sm:aspect-[16/10] md:aspect-square w-full min-h-[260px] sm:min-h-[340px] overflow-hidden rounded-2xl shadow-md border border-sand/30 bg-sand/10">
              {products[0]?.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={optimizeImageUrl(products[0].images[0], { width: 800, quality: 'auto' })}
                  alt={products[0].name}
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  width={700}
                  height={700}
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full min-h-[260px] items-center justify-center bg-indigo text-cream text-5xl font-serif">
                  TOBI
                </div>
              )}
              <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-auto rounded-xl bg-cream/95 backdrop-blur-md px-3.5 py-2.5 shadow-md border border-sand/30">
                <p className="text-xs font-bold text-indigo">Accra Fast Delivery</p>
                <p className="text-[11px] text-charcoal/70">Same-day dispatch available</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. FLASH DROP COUNTDOWN TICKER (Image 1 Mykart & Image 3 PressMart) ─── */}
      <section>
        <FlashDropCountdown />
      </section>

      {/* ─── 4. HORIZONTAL CATEGORY PILL STRIP (FORMA Image 4 Inspiration) ─── */}
      <section className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none sm:flex-wrap">
          {quickCategories.map((cat, idx) => (
            <Link
              key={cat.name}
              href={cat.slug ? `/shop/${cat.slug}` : '/shop'}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-spring shrink-0 ${
                idx === 0
                  ? 'bg-charcoal text-cream shadow-xs'
                  : 'bg-white/80 text-charcoal/70 border border-sand/30 hover:border-indigo hover:text-indigo'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </section>

      {/* ─── 5. 4-PILLAR VALUE PROPOSITION STRIP (PressMart & Mykart Inspiration) ─── */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <div className="double-bezel">
          <div className="double-bezel-inner flex items-start gap-3 bg-white/90 p-3.5 sm:p-4">
            <div className="rounded-xl bg-indigo/10 p-2 text-indigo shrink-0">
              <Truck size={18} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-charcoal">Accra Delivery</h3>
              <p className="text-[11px] text-charcoal/75 leading-tight mt-0.5">East Legon, Osu, Spintex &amp; all zones</p>
            </div>
          </div>
        </div>

        <div className="double-bezel">
          <div className="double-bezel-inner flex items-start gap-3 bg-white/90 p-3.5 sm:p-4">
            <div className="rounded-xl bg-wagreen/10 p-2 text-wagreen-dark shrink-0">
              <MessageCircle size={18} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-charcoal">WhatsApp Order</h3>
              <p className="text-[11px] text-charcoal/75 leading-tight mt-0.5">Direct concierge &amp; live fit check</p>
            </div>
          </div>
        </div>

        <div className="double-bezel">
          <div className="double-bezel-inner flex items-start gap-3 bg-white/90 p-3.5 sm:p-4">
            <div className="rounded-xl bg-rose/10 p-2 text-rose shrink-0">
              <Tag size={18} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-charcoal">Flexible Pay</h3>
              <p className="text-[11px] text-charcoal/75 leading-tight mt-0.5">MoMo, Card &amp; Pay on Delivery</p>
            </div>
          </div>
        </div>

        <div className="double-bezel">
          <div className="double-bezel-inner flex items-start gap-3 bg-white/90 p-3.5 sm:p-4">
            <div className="rounded-xl bg-sand/20 p-2 text-charcoal shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-charcoal">100% Verified</h3>
              <p className="text-[11px] text-charcoal/75 leading-tight mt-0.5">Quality fabrics &amp; inspected sizes</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. PROMOTIONAL BENTO MOSAIC (PressMart & Veloura Inspiration) ─── */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="headline text-2xl sm:text-3xl">Featured Collections</h2>
            <p className="text-xs sm:text-sm text-charcoal/85 mt-1 font-medium">Curated drops for Accra&apos;s tropical lifestyle</p>
          </div>
          <Link href="/shop" className="text-xs sm:text-sm font-semibold text-indigo hover:text-rose transition-colors">
            View All &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Bento Card 1: Men's Fashion */}
          <Link
            href="/shop/mens-fashion"
            className="group relative h-64 sm:h-76 overflow-hidden rounded-2xl bg-indigo p-6 flex flex-col justify-end text-cream transition-spring hover:shadow-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-transparent z-10" />
            <img
              src={optimizeImageUrl('https://images.unsplash.com/photo-1617137984095-74e4e5e3613f', { width: 500, quality: 75 })}
              alt="Men's Fashion"
              loading="lazy"
              decoding="async"
              width={500}
              height={333}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="relative z-20">
              <span className="rounded bg-rose/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream">
                Drop &apos;26
              </span>
              <h3 className="mt-2 font-serif text-2xl sm:text-3xl text-cream font-bold">
                Men&apos;s Streetwear &amp; Footwears
              </h3>
              <p className="mt-1 text-xs text-cream/80">Oversized tees, denim, sneakers &amp; caps</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sand-pale underline underline-offset-4">
                Shop Men&apos;s &rarr;
              </span>
            </div>
          </Link>

          {/* Bento Card 2: Women's Fashion */}
          <Link
            href="/shop/womens-fashion"
            className="group relative h-64 sm:h-76 overflow-hidden rounded-2xl bg-sand p-6 flex flex-col justify-end text-cream transition-spring hover:shadow-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-transparent z-10" />
            <img
              src={optimizeImageUrl('https://images.unsplash.com/photo-1483985988355-763728e1935b', { width: 500, quality: 75 })}
              alt="Women's Fashion"
              loading="lazy"
              decoding="async"
              width={500}
              height={333}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="relative z-20">
              <span className="rounded bg-indigo/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream">
                Editorial
              </span>
              <h3 className="mt-2 font-serif text-2xl sm:text-3xl text-cream font-bold">
                Women&apos;s Chic &amp; Casuals
              </h3>
              <p className="mt-1 text-xs text-cream/80">Dresses, crop tops, matching sets &amp; skirts</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sand-pale underline underline-offset-4">
                Shop Women&apos;s &rarr;
              </span>
            </div>
          </Link>

          {/* Bento Card 3: Footwear & Accessories */}
          <Link
            href="/shop/mens-fashion-footwears"
            className="group relative h-64 sm:h-76 sm:col-span-2 lg:col-span-1 overflow-hidden rounded-2xl bg-charcoal p-6 flex flex-col justify-end text-cream transition-spring hover:shadow-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-transparent z-10" />
            <img
              src={optimizeImageUrl('https://images.unsplash.com/photo-1549298916-b41d501d3772', { width: 500, quality: 75 })}
              alt="Footwear and Accessories"
              loading="lazy"
              decoding="async"
              width={500}
              height={333}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="relative z-20">
              <span className="rounded bg-wagreen/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-charcoal">
                Trending
              </span>
              <h3 className="mt-2 font-serif text-2xl sm:text-3xl text-cream font-bold">
                Sneakers, Loafers &amp; Slides
              </h3>
              <p className="mt-1 text-xs text-cream/80">Everyday comfort, smart casuals &amp; luxury accessories</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sand-pale underline underline-offset-4">
                Explore Footwear &rarr;
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* ─── 7. TABBED CATALOG SHOWCASE (PressMart Image 3 & FORMA Image 4) ─── */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sand/30 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="headline text-2xl sm:text-3xl">Trending Pieces</h2>
              <span className="rounded-full bg-sand/30 px-2.5 py-0.5 text-[11px] font-bold text-charcoal">
                {filteredProducts.length} drops
              </span>
            </div>
            <p className="text-xs sm:text-sm text-charcoal/85 mt-0.5 font-medium">Explore the latest styles in stock</p>
          </div>

          {/* Interactive filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-spring ${
                activeTab === 'all'
                  ? 'bg-indigo text-cream shadow-xs'
                  : 'bg-sand/20 text-charcoal/90 hover:bg-sand/35'
              }`}
            >
              All Pieces
            </button>
            <button
              onClick={() => setActiveTab('men')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-spring ${
                activeTab === 'men'
                  ? 'bg-indigo text-cream shadow-xs'
                  : 'bg-sand/20 text-charcoal/90 hover:bg-sand/35'
              }`}
            >
              Men&apos;s
            </button>
            <button
              onClick={() => setActiveTab('women')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-spring ${
                activeTab === 'women'
                  ? 'bg-indigo text-cream shadow-xs'
                  : 'bg-sand/20 text-charcoal/90 hover:bg-sand/35'
              }`}
            >
              Women&apos;s
            </button>
            <button
              onClick={() => setActiveTab('footwear')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-spring ${
                activeTab === 'footwear'
                  ? 'bg-indigo text-cream shadow-xs'
                  : 'bg-sand/20 text-charcoal/90 hover:bg-sand/35'
              }`}
            >
              Footwear
            </button>
          </div>
        </div>

        {/* Product Grid: 2 columns on mobile (app feel), 4 columns on desktop */}
        {featuredList.length === 0 ? (
          <div className="rounded-2xl border border-sand/30 bg-white/50 p-8 text-center">
            <p className="text-sm text-charcoal/60">
              New arrivals landing this week. Chat with Tobi to request specific sizes.
            </p>
            <Link href="/shop" className="mt-3 inline-block text-xs font-semibold text-indigo underline">
              Browse full inventory
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featuredList.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <div className="pt-4 text-center">
          <Link
            href="/shop"
            className="group inline-flex items-center gap-3 rounded-full border border-indigo pl-6 pr-2 py-2 text-xs sm:text-sm font-semibold text-indigo hover:bg-indigo hover:text-cream transition-spring"
          >
            <span>Explore Complete Catalog</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo/10 group-hover:bg-white/20 transition-spring">
              <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </section>

      {/* ─── 8. NEWSLETTER & VIP DROPS BAR (Guza & Veloura Inspiration) ─── */}
      <section className="double-bezel">
        <div className="double-bezel-inner rounded-2xl bg-charcoal text-cream p-6 sm:p-10 text-center sm:text-left relative overflow-hidden">
          <div className="relative z-10 max-w-xl">
            <span className="rounded bg-rose px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              VIP ACCESS
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl text-cream font-bold mt-2">
              Never miss a weekend drop.
            </h3>
            <p className="text-xs sm:text-sm text-cream/90 mt-1">
              Get instant alerts when new sneakers, tops, and luxury bags land in Accra.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert('Thank you! You have been subscribed for drop alerts.');
              }}
              className="mt-5 flex flex-col sm:flex-row gap-2 max-w-md"
            >
              <input
                type="email"
                required
                aria-label="Email address or phone number"
                placeholder="Enter your email or phone"
                className="rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-xs text-cream placeholder:text-cream/60 focus:outline-none focus:border-rose flex-1"
              />
              <button
                type="submit"
                className="rounded-xl bg-rose px-5 py-2.5 text-xs font-bold text-white hover:bg-rose/90 transition-spring shrink-0 min-h-[44px]"
              >
                Get Notified
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
