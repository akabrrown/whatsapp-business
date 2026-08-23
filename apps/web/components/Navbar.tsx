'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, ShoppingBag, X, Truck } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { SearchOverlay } from './SearchOverlay';
import { PromoBanner } from './PromoBanner';
import type { Category } from '@/lib/api';

export function Navbar({ categories }: { categories: Category[] }) {
  const { count, setDrawerOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState('');
  const [expandedMobile, setExpandedMobile] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveDropdown(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const openDropdown = (slug: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setActiveDropdown(slug);
  };

  const closeDropdown = () => {
    dropdownTimeout.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  const toggleMobileSection = (slug: string) => {
    setExpandedMobile(expandedMobile === slug ? null : slug);
  };

  return (
    <>
      <div className="sticky top-0 z-40 bg-cream shadow-xs border-b border-sand/40">
        {/* ─── Storewide Announcement / Promo Banner ─── */}
        <PromoBanner />

        {/* ─── Top Bar: Brand + Actions ─── */}
        <header className="relative bg-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          {/* Mobile hamburger */}
          <button
            aria-label="Open navigation menu"
            className="mr-3 text-charcoal/70 transition-colors hover:text-indigo md:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} aria-hidden />
          </button>

          {/* Brand */}
          <Link href="/" className="headline text-xl tracking-wide md:text-2xl">
            TOBI <span className="text-rose">CLOTHINGS</span>
          </Link>

          {/* Actions: Track + Search + Cart */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/track"
              className="flex items-center gap-1 text-xs font-medium text-charcoal/70 transition-colors hover:text-indigo"
              title="Track Order"
            >
              <Truck size={18} aria-hidden />
              <span className="hidden sm:inline">Track Order</span>
            </Link>

            <SearchOverlay categories={categories} />

            <button
              aria-label="Shopping bag"
              onClick={() => setDrawerOpen(true)}
              className="relative text-charcoal/70 transition-colors hover:text-indigo"
            >
              <ShoppingBag size={21} aria-hidden />
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose text-[10px] font-medium text-cream">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ─── Desktop Category Navigation Strip ─── */}
        <nav className="hidden border-t border-sand/30 md:block" aria-label="Main navigation">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-1 px-4 md:px-6">
            <Link
              href="/"
              className="px-4 py-2.5 text-sm tracking-wide text-charcoal/70 transition-colors hover:text-indigo"
            >
              Home
            </Link>

            {categories.map((cat) => {
              const hasChildren = cat.children && cat.children.length > 0;

              if (!hasChildren) {
                return (
                  <Link
                    key={cat.slug}
                    href={`/shop/${cat.slug}`}
                    className="px-4 py-2.5 text-sm tracking-wide text-charcoal/70 transition-colors hover:text-indigo"
                  >
                    {cat.name}
                  </Link>
                );
              }

              return (
                <div
                  key={cat.slug}
                  className="relative"
                  onMouseEnter={() => openDropdown(cat.slug)}
                  onMouseLeave={closeDropdown}
                >
                  <button
                    className={`flex items-center gap-1 px-4 py-2.5 text-sm tracking-wide transition-colors ${
                      activeDropdown === cat.slug ? 'text-indigo' : 'text-charcoal/70 hover:text-indigo'
                    }`}
                    onClick={() => setActiveDropdown(activeDropdown === cat.slug ? null : cat.slug)}
                    aria-expanded={activeDropdown === cat.slug}
                    aria-haspopup="true"
                  >
                    {cat.name}
                    <ChevronDown
                      size={14}
                      aria-hidden
                      className={`transition-transform duration-200 ${activeDropdown === cat.slug ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Dropdown panel */}
                  <div
                    className={`absolute left-1/2 top-full z-50 -translate-x-1/2 pt-1 transition-all duration-200 ${
                      activeDropdown === cat.slug
                        ? 'pointer-events-auto translate-y-0 opacity-100'
                        : 'pointer-events-none -translate-y-1 opacity-0'
                    }`}
                    onMouseEnter={() => openDropdown(cat.slug)}
                    onMouseLeave={closeDropdown}
                  >
                    <div className="w-max max-w-4xl rounded-lg border border-sand/30 bg-cream p-3 shadow-lg shadow-charcoal/5">
                      {/* Link to browse entire parent category */}
                      <Link
                        href={`/shop/${cat.slug}`}
                        className="block rounded-md px-4 py-2 text-sm font-medium text-indigo transition-colors hover:bg-sand/20"
                        onClick={() => setActiveDropdown(null)}
                      >
                        All {cat.name}
                      </Link>
                      <div className="my-1.5 border-t border-sand/20" />
                      <div className="grid grid-cols-5 gap-1">
                        {cat.children!.map((child) => (
                          <Link
                            key={child.slug}
                            href={`/shop/${child.slug}`}
                            className="block whitespace-nowrap rounded-md px-4 py-2 text-sm text-charcoal/70 transition-colors hover:bg-sand/20 hover:text-indigo"
                            onClick={() => setActiveDropdown(null)}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <Link
              href="/shop"
              className="px-4 py-2.5 text-sm font-medium tracking-wide text-rose transition-colors hover:text-rose/80"
            >
              Shop All
            </Link>

            <Link
              href="/track"
              className="px-4 py-2.5 text-sm tracking-wide text-charcoal/70 transition-colors hover:text-indigo"
            >
              Track Order
            </Link>
          </div>
        </nav>
      </header>
    </div>

      {/* ─── Mobile Full-Screen Drawer ─── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-charcoal/30 transition-opacity duration-300 md:hidden ${
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-4/5 max-w-sm flex-col bg-cream shadow-xl transition-transform duration-300 ease-in-out md:hidden ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-label="Mobile navigation"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-sand/30 px-5 py-4">
          <span className="headline text-lg text-indigo">Menu</span>
          <button
            aria-label="Close menu"
            className="text-charcoal/60 transition-colors hover:text-indigo"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-5 py-4" aria-label="Mobile categories">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="block py-2.5 text-base text-charcoal/80 transition-colors hover:text-indigo"
          >
            Home
          </Link>

          {categories.map((cat) => {
            const hasChildren = cat.children && cat.children.length > 0;
            const isExpanded = expandedMobile === cat.slug;

            if (!hasChildren) {
              return (
                <Link
                  key={cat.slug}
                  href={`/shop/${cat.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className="block py-2.5 text-base text-charcoal/80 transition-colors hover:text-indigo"
                >
                  {cat.name}
                </Link>
              );
            }

            return (
              <div key={cat.slug} className="border-b border-sand/15 last:border-b-0">
                <button
                  onClick={() => toggleMobileSection(cat.slug)}
                  className="flex w-full items-center justify-between py-2.5 text-left text-base text-charcoal/80 transition-colors hover:text-indigo"
                  aria-expanded={isExpanded}
                >
                  {cat.name}
                  <ChevronDown
                    size={16}
                    aria-hidden
                    className={`text-charcoal/40 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Accordion content */}
                <div
                  className={`overflow-hidden transition-all duration-250 ${
                    isExpanded ? 'max-h-96 pb-2' : 'max-h-0'
                  }`}
                >
                  <Link
                    href={`/shop/${cat.slug}`}
                    onClick={() => setMenuOpen(false)}
                    className="block py-2 pl-4 text-sm font-medium text-indigo transition-colors hover:text-indigo/80"
                  >
                    All {cat.name}
                  </Link>
                  {cat.children!.map((child) => (
                    <Link
                      key={child.slug}
                      href={`/shop/${child.slug}`}
                      onClick={() => setMenuOpen(false)}
                      className="block py-2 pl-4 text-sm text-charcoal/65 transition-colors hover:text-indigo"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          <Link
            href="/shop"
            onClick={() => setMenuOpen(false)}
            className="mt-2 block border-t border-sand/15 py-3 text-base font-medium text-rose transition-colors hover:text-rose/80"
          >
            Shop All
          </Link>
          
          <Link
            href="/track"
            onClick={() => setMenuOpen(false)}
            className="block border-t border-sand/15 py-3 text-base text-charcoal/80 transition-colors hover:text-indigo"
          >
            Track Order
          </Link>
        </nav>

        {/* Drawer footer */}
        <div className="border-t border-sand/30 px-5 py-4">
          <button
            onClick={() => { setMenuOpen(false); setDrawerOpen(true); }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-indigo py-2.5 text-sm font-medium text-cream transition-colors hover:bg-indigo-deep"
          >
            <ShoppingBag size={16} aria-hidden />
            View Bag{count > 0 ? ` (${count})` : ''}
          </button>
        </div>
      </div>
    </>
  );
}
