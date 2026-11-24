'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X, Search, Heart, User, ArrowRight } from 'lucide-react';
import { BRAND_NAME } from '@/lib/haute-couture-data';

interface RunwayNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartCount: number;
  onOpenCart: () => void;
}

export function RunwayNavigationDrawer({
  isOpen,
  onClose,
  cartCount,
  onOpenCart,
}: RunwayNavigationDrawerProps) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation Menu"
      className="fixed inset-0 z-[100] flex bg-white/95 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto"
    >
      <div className="w-full min-h-screen flex flex-col justify-between px-6 py-8 sm:px-12 sm:py-10 max-w-4xl mx-auto">
        {/* Top Bar inside Drawer */}
        <div className="flex items-center justify-between border-b border-black/10 pb-6">
          <Link
            href="/"
            onClick={onClose}
            className="font-runway tracking-runway text-base sm:text-lg font-bold text-black"
          >
            {BRAND_NAME}
          </Link>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCart();
              }}
              className="font-runway text-xs sm:text-sm tracking-wider font-semibold text-black hover:opacity-60 transition-opacity"
            >
              CART ({cartCount})
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="p-1 text-black hover:opacity-60 transition-opacity"
            >
              <X size={24} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Primary High-Fashion Links */}
        <div className="my-10 space-y-6 sm:space-y-8">
          <nav className="flex flex-col space-y-4 sm:space-y-6">
            {[
              { label: 'RUNWAY', href: '/#runway' },
              { label: 'ABOUT US', href: '/#about' },
              { label: 'THE LOOKS', href: '/#looks' },
              { label: 'SHOP', href: '/shop' },
              { label: 'KWAME COLLECTION', href: '/shop/clothing' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className="font-runway text-2xl sm:text-4xl lg:text-5xl tracking-runway font-bold text-black hover:text-gold transition-colors block"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Shop by Category Divider */}
          <div className="pt-8 border-t border-black/10">
            <p className="font-runway text-[11px] sm:text-xs tracking-runway text-neutral-400 font-semibold mb-4">
              SHOP BY CATEGORY
            </p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { label: 'NEW ARRIVALS', href: '/shop' },
                { label: 'CLOTHING', href: '/shop/clothing' },
                { label: 'THE LOOKS', href: '/#looks' },
                { label: 'SENATORS', href: '/shop/senators' },
                { label: 'KAFTANS & ROBES', href: '/shop/kaftans' },
                { label: 'ACCESSORIES', href: '/shop/accessories' },
                { label: 'OUR STORY', href: '/#about' },
              ].map((cat) => (
                <Link
                  key={cat.label}
                  href={cat.href}
                  onClick={onClose}
                  className="font-runway text-xs sm:text-sm tracking-wider text-black/80 hover:text-black font-semibold transition-colors py-1 block"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>

          {/* User Account / Tools */}
          <div className="pt-6 border-t border-black/10">
            <p className="font-runway text-[11px] sm:text-xs tracking-runway text-neutral-400 font-semibold mb-4">
              CLIENT SERVICES
            </p>
            <div className="flex flex-wrap gap-6 text-xs sm:text-sm font-runway tracking-wider font-medium text-black">
              <Link
                href="/track"
                onClick={onClose}
                className="flex items-center gap-2 hover:text-gold transition-colors"
              >
                <Search size={14} /> TRACK ORDER
              </Link>
              <a
                href="https://wa.me/233203813606?text=Hello%20Atelier%20Kwame%2C%20I%20would%20like%20to%20book%20a%20private%20bespoke%20session"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-gold transition-colors"
              >
                <User size={14} /> VIP ATELIER CONCIERGE
              </a>
            </div>
          </div>
        </div>

        {/* Footer info inside menu */}
        <div className="pt-6 border-t border-black/10 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-neutral-500 font-sans gap-2">
          <p>© 2027 ATELIER KWAME. All Rights Reserved. Accra, Ghana.</p>
          <p className="font-mono text-[11px]">SPRING SUMMER 2027 HAUTE COUTURE</p>
        </div>
      </div>
    </div>
  );
}
