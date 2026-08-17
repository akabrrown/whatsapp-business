'use client';
// Site header + mobile menu (ux.md §3.6 — serif category links, warm base).
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cart';
import type { Category } from '@/lib/api';

export function Navbar({ categories }: { categories: Category[] }) {
  const { count, setDrawerOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-sand/40 bg-cream/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <button
            aria-label="Menu"
            className="mr-3 text-2xl leading-none text-indigo md:hidden"
            onClick={() => setMenuOpen(true)}
          >
            ≡
          </button>
          <Link href="/" className="headline text-xl tracking-wide md:text-2xl">
            ROSE <span className="text-rose">&amp;</span> DENIM
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-charcoal/80 md:flex">
            {categories.map((c) => (
              <Link key={c.slug} href={`/shop/${c.slug}`} className="hover:text-indigo">
                {c.name}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <form action="/search" className="hidden md:block">
              <input
                name="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="w-36 border-b border-charcoal/30 bg-transparent py-1 text-sm outline-none focus:border-indigo"
              />
            </form>
            <button
              aria-label="Shopping bag"
              onClick={() => setDrawerOpen(true)}
              className="relative text-indigo"
            >
              <span className="text-xl">🧺</span>
              {count > 0 && (
                <span className="absolute -right-2 -top-2 rounded-full bg-rose px-1.5 text-xs text-cream">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-cream md:hidden">
          <div className="flex items-center justify-between px-4 py-4">
            <span className="headline text-xl">ROSE <span className="text-rose">&amp;</span> DENIM</span>
            <button aria-label="Close menu" className="text-2xl text-indigo" onClick={() => setMenuOpen(false)}>
              ×
            </button>
          </div>
          <nav className="mt-8 flex flex-col gap-6 px-8">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/shop/${c.slug}`}
                onClick={() => setMenuOpen(false)}
                className="headline text-3xl"
              >
                {c.name}
              </Link>
            ))}
            <Link href="/shop" onClick={() => setMenuOpen(false)} className="headline text-3xl text-rose">
              Shop All
            </Link>
          </nav>
          <div className="absolute bottom-10 right-6 h-24 w-24 rounded-tl-[3rem] bg-sand/50" aria-hidden />
        </div>
      )}
    </>
  );
}
