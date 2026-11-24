'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Search, ShoppingBag, Truck } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { useState, useEffect } from 'react';

export function MobileBottomNav({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const pathname = usePathname();
  const { count, setDrawerOpen } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // On product detail page, yield the bottom screen area to the dedicated product action bar
  if (pathname.startsWith('/product/')) {
    return null;
  }

  const navItems = [
    {
      label: 'Home',
      href: '/',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      label: 'Shop',
      href: '/shop',
      icon: LayoutGrid,
      isActive: pathname.startsWith('/shop'),
    },
    {
      label: 'Search',
      href: '/search',
      icon: Search,
      isActive: pathname === '/search',
      onClick: onOpenSearch,
    },
    {
      label: 'Bag',
      icon: ShoppingBag,
      isCart: true,
      badge: mounted && count > 0 ? count : null,
      onClick: () => setDrawerOpen(true),
    },
    {
      label: 'Track',
      href: '/track',
      icon: Truck,
      isActive: pathname.startsWith('/track'),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 block md:hidden bg-cream/95 backdrop-blur-md border-t border-sand/40 shadow-[0_-4px_25px_rgba(43,43,43,0.06)]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.isCart) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="relative flex flex-col items-center justify-center py-1 px-3 text-charcoal/70 transition-transform active:scale-95 hover:text-indigo focus:outline-none"
                aria-label={`Shopping bag with ${count} items`}
              >
                <div className="relative">
                  <Icon size={21} strokeWidth={2} />
                  {item.badge !== null && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose px-1 text-[10px] font-bold text-cream shadow-xs animate-in zoom-in-75 duration-200">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="mt-1 text-[11px] font-medium tracking-tight">
                  {item.label}
                </span>
              </button>
            );
          }

          if (item.onClick && !item.href) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="flex flex-col items-center justify-center py-1 px-3 text-charcoal/70 transition-transform active:scale-95 hover:text-indigo focus:outline-none"
              >
                <Icon size={21} strokeWidth={2} />
                <span className="mt-1 text-[11px] font-medium tracking-tight">
                  {item.label}
                </span>
              </button>
            );
          }

          const isActive = item.isActive;
          return (
            <Link
              key={item.label}
              href={item.href!}
              className={`relative flex flex-col items-center justify-center py-1 px-3 transition-transform active:scale-95 ${
                isActive ? 'text-indigo font-semibold' : 'text-charcoal/60 hover:text-charcoal'
              }`}
            >
              <div className="relative">
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? 'text-indigo' : ''}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo" />
                )}
              </div>
              <span className={`mt-1 text-[11px] tracking-tight ${isActive ? 'text-indigo font-bold' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
