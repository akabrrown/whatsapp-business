'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Plus, Check } from 'lucide-react';
import { RUNWAY_LOOKS, type RunwayLook, CURRENCY_SYMBOL } from '@/lib/haute-couture-data';
import { useCart } from '@/lib/cart';

interface RunwayLookbookCarouselProps {
  onSelectLook?: (look: RunwayLook) => void;
}

export function RunwayLookbookCarousel({ onSelectLook }: RunwayLookbookCarouselProps) {
  const { add } = useCart();
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});

  // Sync wishlist from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('akwame-wishlist');
      if (saved) {
        setWishlist(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const toggleWish = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlist((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('akwame-wishlist', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleQuickAdd = async (e: React.MouseEvent, look: RunwayLook) => {
    e.preventDefault();
    e.stopPropagation();

    // Default to Medium or first size
    const size = look.sizes[0] || 'M';
    const variantId = `${look.id}-var-${size.toLowerCase()}`;

    await add(variantId, 1, {
      name: look.name,
      slug: look.slug,
      size,
      color: 'Runway Original',
      priceP: look.priceP,
      image: look.cardImage || look.heroImage,
      maxQty: 10,
    });

    setAddedMap((prev) => ({ ...prev, [look.id]: true }));
    setTimeout(() => {
      setAddedMap((prev) => ({ ...prev, [look.id]: false }));
    }, 1500);
  };

  return (
    <section id="looks" className="w-full bg-white py-6 sm:py-10 border-b border-black/10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-4">
          <div>
            <h3 className="font-runway text-base sm:text-lg font-bold tracking-runway text-black">
              THE RUNWAY LOOKS
            </h3>
            <p className="font-sans text-xs text-neutral-500 mt-0.5">
              Spring Summer 2027 Couture Edition
            </p>
          </div>
          <Link
            href="/shop"
            className="font-runway text-xs tracking-wider font-semibold text-neutral-600 hover:text-black transition-colors"
          >
            ALL LOOKS &rarr;
          </Link>
        </div>

        {/* ─── Horizontal Lookbook Carousel (from Video) ─── */}
        <div className="relative -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto pb-4 scrollbar-none flex gap-3 sm:gap-4 snap-x snap-mandatory">
          {RUNWAY_LOOKS.map((look) => {
            const isWished = !!wishlist[look.id];
            const isAdded = !!addedMap[look.id];

            return (
              <div
                key={look.id}
                className="group relative flex-none w-[170px] sm:w-[210px] md:w-[230px] snap-start bg-neutral-50/70 rounded-xl border border-black/5 p-3 flex flex-col justify-between transition-all duration-300 hover:bg-white hover:border-black/20 hover:shadow-md"
              >
                {/* Top Bar: Wishlist Toggle */}
                <div className="flex justify-between items-center mb-2">
                  <span className="font-runway text-[10px] tracking-wider text-neutral-400 font-semibold">
                    {look.lookLabel}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => toggleWish(e, look.id)}
                    aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
                    className="p-1 text-neutral-400 hover:text-rose transition-colors"
                  >
                    <Heart
                      size={18}
                      className={isWished ? 'fill-rose text-rose' : 'text-neutral-400 hover:text-rose'}
                    />
                  </button>
                </div>

                {/* Mannequin Thumbnail */}
                <Link
                  href={`/shop/clothing/${look.slug}`}
                  onClick={() => onSelectLook?.(look)}
                  className="relative block w-full aspect-[3/4] overflow-hidden rounded-lg bg-white my-1 flex items-center justify-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={look.cardImage || look.heroImage}
                    alt={look.name}
                    width={300}
                    height={400}
                    loading="lazy"
                    decoding="async"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>

                {/* Bottom Details: Name, Price and Quick Add '+' Button */}
                <div className="mt-3 pt-2 border-t border-black/5 flex items-end justify-between gap-1">
                  <div className="min-w-0 pr-1">
                    <h4 className="font-runway text-[11px] sm:text-xs font-bold tracking-wider text-black line-clamp-2 leading-snug">
                      {look.name}
                    </h4>
                    <p className="mt-1 font-mono text-xs sm:text-sm font-bold text-black">
                      {CURRENCY_SYMBOL}{look.priceGHS.toLocaleString()}
                    </p>
                  </div>

                  {/* High-Fashion Quick Add Button (from Video) */}
                  <button
                    type="button"
                    onClick={(e) => handleQuickAdd(e, look)}
                    aria-label={`Add ${look.name} to cart`}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all active:scale-90 ${
                      isAdded
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-black border-black/15 hover:border-black hover:bg-black hover:text-white shadow-2xs'
                    }`}
                  >
                    {isAdded ? <Check size={16} /> : <Plus size={18} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
