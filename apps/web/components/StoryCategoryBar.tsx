'use client';

import Link from 'next/link';
import { ArrowRight, Flame, Sparkles } from 'lucide-react';
import type { Category } from '@/lib/api';

// Curated high-res editorial imagery matching Accra streetwear & luxury fashion
const CATEGORY_VISUALS: Record<string, { image: string; tag: string; subtitle: string }> = {
  'mens-fashion': {
    image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=600&q=80',
    tag: 'Drop 26',
    subtitle: 'Streetwear & Fits',
  },
  'womens-fashion': {
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80',
    tag: 'Chic',
    subtitle: 'Dresses & Sets',
  },
  'mens-fashion-footwears': {
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80',
    tag: 'Trending',
    subtitle: 'Sneakers & Slides',
  },
  'mens-fashion-tops': {
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80',
    tag: 'Essentials',
    subtitle: 'Tees & Shirts',
  },
  'mens-fashion-bottoms': {
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=80',
    tag: 'Denim',
    subtitle: 'Jeans & Cargo',
  },
  'mens-fashion-accessories': {
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80',
    tag: 'Luxury',
    subtitle: 'Eyewear & Bags',
  },
};

export function StoryCategoryBar({ categories }: { categories: Category[] }) {
  // Built curated department cards list
  const departments = [
    {
      name: "Men's Fashion",
      slug: 'shop/mens-fashion',
      image: CATEGORY_VISUALS['mens-fashion'].image,
      tag: 'Drop 26',
      subtitle: 'Streetwear & Fits',
      isFeatured: true,
    },
    {
      name: "Women's Fashion",
      slug: 'shop/womens-fashion',
      image: CATEGORY_VISUALS['womens-fashion'].image,
      tag: 'Chic',
      subtitle: 'Dresses & Sets',
      isFeatured: true,
    },
    {
      name: 'Footwear & Kicks',
      slug: 'shop/mens-fashion-footwears',
      image: CATEGORY_VISUALS['mens-fashion-footwears'].image,
      tag: 'Trending',
      subtitle: 'Sneakers & Slides',
      isFeatured: false,
    },
    {
      name: 'Tops & Tees',
      slug: 'shop/mens-fashion-tops',
      image: CATEGORY_VISUALS['mens-fashion-tops'].image,
      tag: 'Essential',
      subtitle: 'Oversized & Polos',
      isFeatured: false,
    },
    {
      name: 'Denim & Bottoms',
      slug: 'shop/mens-fashion-bottoms',
      image: CATEGORY_VISUALS['mens-fashion-bottoms'].image,
      tag: 'Denim',
      subtitle: 'Cargos & Jeans',
      isFeatured: false,
    },
    {
      name: 'Bags & Eyewear',
      slug: 'shop/mens-fashion-accessories',
      image: CATEGORY_VISUALS['mens-fashion-accessories'].image,
      tag: 'Accessories',
      subtitle: 'Shades & Leather',
      isFeatured: false,
    },
    {
      name: 'Weekend Sale',
      slug: 'shop?sale=1',
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
      tag: 'Up to 40% Off',
      subtitle: 'Limited Drop',
      isSale: true,
    },
  ];

  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none">
        {departments.map((dept) => (
          <Link
            key={dept.name}
            href={`/${dept.slug}`}
            className="group relative shrink-0 active:scale-98 transition-spring"
          >
            {/* Double-Bezel Card Container */}
            <div className="p-1 rounded-2xl bg-white/80 border border-sand/35 shadow-xs group-hover:border-indigo/40 group-hover:shadow-md transition-spring">
              <div className="relative aspect-[3/4] w-28 sm:w-34 md:w-40 overflow-hidden rounded-[calc(1rem-2px)] bg-charcoal">
                {/* Visual Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dept.image}
                  alt={dept.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-charcoal/90 via-charcoal/30 to-transparent" />

                {/* Top Badge */}
                <div className="absolute top-2 left-2 z-10">
                  {dept.isSale ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-rose px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-xs">
                      <Flame size={9} /> {dept.tag}
                    </span>
                  ) : (
                    <span className="rounded-full bg-black/50 backdrop-blur-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/90 border border-white/10">
                      {dept.tag}
                    </span>
                  )}
                </div>

                {/* Bottom Content */}
                <div className="absolute inset-x-0 bottom-0 p-2.5 z-10">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-sand-pale">
                    {dept.subtitle}
                  </p>
                  <h3 className="font-serif text-xs sm:text-sm font-bold text-cream leading-tight mt-0.5 truncate">
                    {dept.name}
                  </h3>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
