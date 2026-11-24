'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { BRAND_NAME } from '@/lib/haute-couture-data';
import { RunwayNavigationDrawer } from './RunwayNavigationDrawer';

export function RunwayNavbar() {
  const { count, setDrawerOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-black/10 transition-all">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          {/* ─── 1. Brand Logo (from Video: TJ'S FASHION) ─── */}
          <Link
            href="/"
            className="font-runway tracking-runway text-base sm:text-xl font-bold text-black hover:opacity-80 transition-opacity"
          >
            {BRAND_NAME}
          </Link>

          {/* ─── 2. Cart (X) & Hamburger Menu Button (from Video) ─── */}
          <div className="flex items-center gap-5 sm:gap-7">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={`Open shopping cart with ${count} items`}
              className="font-runway text-xs sm:text-sm tracking-wider font-semibold text-black hover:opacity-60 transition-opacity cursor-pointer"
            >
              CART ({mounted ? count : 0})
            </button>

            {/* Minimalist 2-line Fashion Hamburger Menu */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation menu"
              className="flex flex-col justify-center items-center gap-1.5 w-8 h-8 p-1 text-black hover:opacity-60 transition-opacity cursor-pointer"
            >
              <span className="w-5 h-[1.5px] bg-black block transition-all" />
              <span className="w-5 h-[1.5px] bg-black block transition-all" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Overlay */}
      <RunwayNavigationDrawer
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        cartCount={mounted ? count : 0}
        onOpenCart={() => setDrawerOpen(true)}
      />
    </>
  );
}
