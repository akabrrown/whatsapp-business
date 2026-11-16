'use client';

import Link from 'next/link';
import { Flame, ArrowRight, Zap } from 'lucide-react';
import type { Category } from '@/lib/api';
import { optimizeImageUrl } from '@/lib/images';

// Curated high-res editorial imagery matching Accra streetwear & luxury fashion
const STORIES_DATA = [
  {
    id: 'new-in',
    name: 'New Drops',
    slug: 'shop?sort=newest',
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e',
    badge: 'NEW',
    isLive: true,
    tag: 'Season 26',
    subtitle: 'Latest Arrivals',
  },
  {
    id: 'mens',
    name: "Men's Fits",
    slug: 'shop/mens-fashion',
    image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f',
    badge: 'DROP',
    tag: 'Streetwear',
    subtitle: 'Streetwear & Fits',
    isFeatured: true,
  },
  {
    id: 'womens',
    name: "Women's Chic",
    slug: 'shop/womens-fashion',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b',
    badge: 'CHIC',
    tag: 'Chic Edit',
    subtitle: 'Dresses & Sets',
    isFeatured: true,
  },
  {
    id: 'kicks',
    name: 'Footwear',
    slug: 'shop/mens-fashion-footwears',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772',
    badge: 'HOT',
    tag: 'Trending',
    subtitle: 'Sneakers & Slides',
  },
  {
    id: 'tops',
    name: 'Tops & Tees',
    slug: 'shop/mens-fashion-tops',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518',
    badge: 'FIT',
    tag: 'Essentials',
    subtitle: 'Tees & Shirts',
  },
  {
    id: 'bottoms',
    name: 'Denim & Pants',
    slug: 'shop/mens-fashion-bottoms',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246',
    badge: 'DENIM',
    tag: 'Cargos',
    subtitle: 'Jeans & Cargo',
  },
  {
    id: 'accessories',
    name: 'Shades & Bags',
    slug: 'shop/mens-fashion-accessories',
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083',
    badge: 'LUXE',
    tag: 'Accessories',
    subtitle: 'Eyewear & Leather',
  },
  {
    id: 'sale',
    name: 'Flash Sale',
    slug: 'shop?sale=1',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa',
    badge: '40% OFF',
    isSale: true,
    tag: 'Sale Drop',
    subtitle: 'Up to 40% Off',
  },
];

export function StoryCategoryBar({ categories = [] }: { categories?: Category[] }) {
  return (
    <div className="space-y-4">
      {/* ─── 1. MOBILE-APP STORIES RAIL (Smaller Screens: Instagram/App Style) ─── */}
      <div className="block md:hidden -mx-4 px-4">
        <div className="flex items-center gap-3.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {STORIES_DATA.map((story) => (
            <Link
              key={story.id}
              href={`/${story.slug}`}
              className="group flex flex-col items-center shrink-0 snap-start active:scale-95 transition-transform"
            >
              {/* High-End Editorial Story Ring */}
              <div
                className={`relative rounded-full p-[2px] transition-all duration-300 ${
                  story.isSale
                    ? 'ring-2 ring-rose ring-offset-2 ring-offset-cream'
                    : story.isLive
                    ? 'ring-2 ring-indigo ring-offset-2 ring-offset-cream'
                    : 'ring-1 ring-sand/40 group-hover:ring-indigo transition-all ring-offset-1 ring-offset-cream'
                }`}
              >
                {/* White/Cream Gap */}
                <div className="rounded-full bg-cream p-[2px]">
                  {/* Story Thumbnail Avatar */}
                  <div className="relative h-16 w-16 sm:h-18 sm:w-18 overflow-hidden rounded-full bg-charcoal/10 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={optimizeImageUrl(story.image, { width: 140, quality: 75 })}
                      alt={story.name}
                      loading="lazy"
                      decoding="async"
                      width={64}
                      height={64}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                </div>

                {/* Micro Badge Overlay on Ring */}
                {story.badge && (
                  <span
                    className={`absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.2 text-[8px] font-extrabold uppercase tracking-wider text-white shadow-xs ${
                      story.isSale
                        ? 'bg-rose ring-1 ring-white'
                        : 'bg-indigo ring-1 ring-white'
                    }`}
                  >
                    {story.badge}
                  </span>
                )}
              </div>

              {/* Story Title Underneath */}
              <span className="mt-2 text-center text-[11px] font-semibold text-charcoal/90 tracking-tight max-w-[70px] truncate leading-tight group-hover:text-indigo">
                {story.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ─── 2. DESKTOP / WIDE-SCREEN EDITORIAL CARDS (Veloura & Forma & Pressmart Style) ─── */}
      <div className="hidden md:block">
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
          {STORIES_DATA.map((item) => (
            <Link
              key={item.id}
              href={`/${item.slug}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-sand/40 p-2 shadow-xs transition-all duration-300 hover:border-indigo/50 hover:shadow-md hover:-translate-y-1 active:scale-98"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-charcoal/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={optimizeImageUrl(item.image, { width: 320, quality: 75 })}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  width={150}
                  height={150}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-linear-to-t from-charcoal/80 via-charcoal/20 to-transparent" />

                {item.isSale ? (
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-full bg-rose px-1.5 py-0.5 text-[8px] font-bold text-white shadow-xs uppercase">
                    <Flame size={9} /> {item.badge}
                  </span>
                ) : (
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-black/50 backdrop-blur-md px-1.5 py-0.5 text-[8px] font-semibold text-white/95 uppercase tracking-wider border border-white/10">
                    {item.tag}
                  </span>
                )}

                <div className="absolute inset-x-0 bottom-0 p-2 text-left">
                  <p className="text-[9px] font-medium text-sand-pale uppercase tracking-widest truncate">
                    {item.subtitle}
                  </p>
                  <h3 className="font-serif text-xs font-bold text-white leading-tight mt-0.5 truncate group-hover:text-amber-200 transition-colors">
                    {item.name}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
