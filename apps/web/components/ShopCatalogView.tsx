'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  SlidersHorizontal,
  LayoutGrid,
  Grid3X3,
  X,
  ChevronDown,
  RotateCcw,
  Check,
  Tag,
  Grid2X2,
} from 'lucide-react';
import type { CatalogProduct, Category } from '@/lib/api';
import { ProductCard } from './ProductCard';

interface ShopCatalogViewProps {
  initialProducts: CatalogProduct[];
  categories: Category[];
  activeCategorySlug?: string;
  categoryName: string;
}

// Color map for swatch preview
const COLOR_HEX: Record<string, string> = {
  black: '#1f2937',
  white: '#f9fafb',
  grey: '#9ca3af',
  gray: '#9ca3af',
  navy: '#1e3a8a',
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#10b981',
  olive: '#556b2f',
  beige: '#f5f5dc',
  brown: '#78350f',
  khaki: '#c3b091',
  yellow: '#f59e0b',
  pink: '#ec4899',
  cream: '#fdfbf7',
  burgundy: '#800020',
};

export function ShopCatalogView({
  initialProducts = [],
  categories = [],
  activeCategorySlug,
  categoryName,
}: ShopCatalogViewProps) {
  const safeProducts = useMemo(() => Array.isArray(initialProducts) ? initialProducts : [], [initialProducts]);
  const safeCategories = useMemo(() => Array.isArray(categories) ? categories : [], [categories]);

  const [selectedSort, setSelectedSort] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [maxPriceGHS, setMaxPriceGHS] = useState<number>(1000);
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(4);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [openPillDropdown, setOpenPillDropdown] = useState<'color' | 'size' | 'price' | null>(null);

  // Extract sizes with item counts (Image 4 FORMA Inspiration)
  const sizeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    safeProducts.forEach((p) => {
      const pSizes = new Set<string>();
      (p.variants || []).forEach((v) => {
        if (v.size && v.available > 0) pSizes.add(v.size);
      });
      pSizes.forEach((s) => {
        counts[s] = (counts[s] || 0) + 1;
      });
    });
    return counts;
  }, [safeProducts]);

  // Extract colors with item counts
  const colorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    safeProducts.forEach((p) => {
      const pColors = new Set<string>();
      (p.variants || []).forEach((v) => {
        if (v.color && v.available > 0) pColors.add(v.color.toLowerCase());
      });
      pColors.forEach((c) => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });
    return counts;
  }, [safeProducts]);

  // Filter & sort logic
  const displayedProducts = useMemo(() => {
    let list = [...safeProducts];

    // Filter by size
    if (selectedSize) {
      list = list.filter((p) =>
        (p.variants || []).some((v) => v.size === selectedSize && v.available > 0),
      );
    }

    // Filter by color
    if (selectedColor) {
      list = list.filter((p) =>
        (p.variants || []).some(
          (v) =>
            v.color?.toLowerCase() === selectedColor.toLowerCase() &&
            v.available > 0,
        ),
      );
    }

    // Filter by max price
    list = list.filter((p) => p.minPriceP / 100 <= maxPriceGHS);

    // Sort
    if (selectedSort === 'price-asc') {
      list.sort((a, b) => a.minPriceP - b.minPriceP);
    } else if (selectedSort === 'price-desc') {
      list.sort((a, b) => b.minPriceP - a.minPriceP);
    }

    return list;
  }, [safeProducts, selectedSize, selectedColor, maxPriceGHS, selectedSort]);

  const activeFilterCount =
    (selectedSize ? 1 : 0) + (selectedColor ? 1 : 0) + (maxPriceGHS < 1000 ? 1 : 0);

  const resetFilters = () => {
    setSelectedSize(null);
    setSelectedColor(null);
    setMaxPriceGHS(1000);
    setOpenPillDropdown(null);
  };

  const togglePill = (pill: 'color' | 'size' | 'price') => {
    setOpenPillDropdown(openPillDropdown === pill ? null : pill);
  };

  return (
    <div className="py-6 sm:py-8 space-y-6">
      {/* ─── Header & Breadcrumb ─── */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-sand/30 pb-4">
        <div>
          <nav className="text-xs text-charcoal/50 mb-1 flex items-center gap-1.5">
            <Link href="/" className="hover:text-indigo">Home</Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-indigo">Shop</Link>
            {activeCategorySlug && (
              <>
                <span>/</span>
                <span className="text-indigo font-medium capitalize">{categoryName}</span>
              </>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <h1 className="headline text-2xl sm:text-4xl">{categoryName}</h1>
            <span className="rounded-full bg-sand/30 px-2.5 py-0.5 text-xs font-bold text-charcoal/70">
              {displayedProducts.length} items
            </span>
          </div>
        </div>

        {/* Desktop Controls: Sort + Grid Columns Toggle (Guza & Veloura inspiration) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-charcoal/60 hidden sm:inline font-semibold">SORT BY:</span>
            <div className="relative">
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value as any)}
                className="appearance-none rounded-xl bg-white/90 border border-sand/40 px-3.5 py-2 pr-8 text-xs font-semibold text-charcoal focus:outline-none focus:border-indigo shadow-2xs"
              >
                <option value="newest">Newest Drops</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal/50" />
            </div>
          </div>

          {/* Desktop Grid Column Switcher (Guza Image 5 Inspiration) */}
          <div className="hidden lg:flex items-center border border-sand/40 rounded-xl bg-white/90 p-1 shadow-2xs">
            <button
              onClick={() => setGridCols(2)}
              className={`p-1.5 rounded-lg transition-colors ${gridCols === 2 ? 'bg-indigo text-cream' : 'text-charcoal/60 hover:text-charcoal'}`}
              title="2 Columns"
              aria-label="Display 2 columns per row"
            >
              <Grid2X2 size={15} />
            </button>
            <button
              onClick={() => setGridCols(3)}
              className={`p-1.5 rounded-lg transition-colors ${gridCols === 3 ? 'bg-indigo text-cream' : 'text-charcoal/60 hover:text-charcoal'}`}
              title="3 Columns"
              aria-label="Display 3 columns per row"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setGridCols(4)}
              className={`p-1.5 rounded-lg transition-colors ${gridCols === 4 ? 'bg-indigo text-cream' : 'text-charcoal/60 hover:text-charcoal'}`}
              title="4 Columns"
              aria-label="Display 4 columns per row"
            >
              <Grid3X3 size={15} />
            </button>
          </div>

          {/* Mobile Filter Trigger Button */}
          <button
            onClick={() => setMobileFilterOpen(true)}
            aria-label={`Open product filters, ${activeFilterCount} active`}
            className="md:hidden flex items-center gap-1.5 rounded-xl border border-sand/40 bg-white px-3.5 py-2 text-xs font-bold text-charcoal shadow-2xs active:scale-95"
          >
            <SlidersHorizontal size={14} />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>
      </div>

      {/* ─── Top Filter Dropdown Pills Bar (Guza Image 5 Inspiration) ─── */}
      <div className="relative border-b border-sand/30 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold uppercase tracking-wider text-charcoal/60 shrink-0 hidden sm:inline mr-1">
            Filter by:
          </span>

          {/* Color Pill */}
          <div className="relative shrink-0">
            <button
              onClick={() => togglePill('color')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                selectedColor
                  ? 'bg-indigo text-cream'
                  : 'bg-white/90 border border-sand/40 text-charcoal/70 hover:border-indigo'
              }`}
            >
              <span>Color {selectedColor ? `: ${selectedColor}` : ''}</span>
              <ChevronDown size={13} />
            </button>

            {openPillDropdown === 'color' && (
              <div className="absolute left-0 top-full mt-2 z-30 min-w-[200px] rounded-2xl bg-white p-3 shadow-xl border border-sand/30 animate-in fade-in zoom-in-95">
                <p className="text-[11px] font-bold uppercase text-charcoal/50 mb-2">Select Color</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {Object.entries(colorCounts).map(([color, count]) => {
                    const isSelected = selectedColor === color;
                    const hex = COLOR_HEX[color] || '#d1d5db';
                    return (
                      <button
                        key={color}
                        onClick={() => {
                          setSelectedColor(isSelected ? null : color);
                          setOpenPillDropdown(null);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs capitalize transition-colors ${
                          isSelected ? 'bg-indigo/10 font-bold text-indigo' : 'hover:bg-sand/15 text-charcoal'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full border border-charcoal/20"
                            style={{ backgroundColor: hex }}
                          />
                          <span>{color}</span>
                        </div>
                        <span className="text-[10px] text-charcoal/40">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Size Pill */}
          <div className="relative shrink-0">
            <button
              onClick={() => togglePill('size')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                selectedSize
                  ? 'bg-indigo text-cream'
                  : 'bg-white/90 border border-sand/40 text-charcoal/70 hover:border-indigo'
              }`}
            >
              <span>Size {selectedSize ? `: ${selectedSize}` : ''}</span>
              <ChevronDown size={13} />
            </button>

            {openPillDropdown === 'size' && (
              <div className="absolute left-0 top-full mt-2 z-30 min-w-[180px] rounded-2xl bg-white p-3 shadow-xl border border-sand/30 animate-in fade-in zoom-in-95">
                <p className="text-[11px] font-bold uppercase text-charcoal/50 mb-2">Select Size</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(sizeCounts).map(([size, count]) => (
                    <button
                      key={size}
                      onClick={() => {
                        setSelectedSize(selectedSize === size ? null : size);
                        setOpenPillDropdown(null);
                      }}
                      className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold border ${
                        selectedSize === size
                          ? 'border-indigo bg-indigo text-cream'
                          : 'border-sand/40 hover:bg-sand/15 text-charcoal'
                      }`}
                    >
                      <span>{size}</span>
                      <span className="text-[10px] opacity-70">({count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Price Range Pill */}
          <div className="relative shrink-0">
            <button
              onClick={() => togglePill('price')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                maxPriceGHS < 1000
                  ? 'bg-indigo text-cream'
                  : 'bg-white/90 border border-sand/40 text-charcoal/70 hover:border-indigo'
              }`}
            >
              <span>Under GH₵{maxPriceGHS}</span>
              <ChevronDown size={13} />
            </button>

            {openPillDropdown === 'price' && (
              <div className="absolute left-0 top-full mt-2 z-30 min-w-[240px] rounded-2xl bg-white p-4 shadow-xl border border-sand/30 animate-in fade-in zoom-in-95">
                <div className="flex justify-between text-xs font-bold text-charcoal mb-2">
                  <span>Max Price:</span>
                  <span className="text-indigo">GH₵{maxPriceGHS}</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={1000}
                  step={10}
                  value={maxPriceGHS}
                  onChange={(e) => setMaxPriceGHS(Number(e.target.value))}
                  className="w-full accent-indigo"
                />
                <button
                  onClick={() => setOpenPillDropdown(null)}
                  className="mt-3 w-full rounded-lg bg-indigo py-1.5 text-xs font-bold text-cream"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs font-semibold text-rose hover:underline shrink-0 ml-2"
            >
              <RotateCcw size={12} /> Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* ─── Main Content Grid: Left Sidebar (Desktop) + Products Area ─── */}
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr] gap-8">
        {/* ─── Desktop Filter Sidebar (Veloura & FORMA Inspiration) ─── */}
        <aside className="hidden md:block double-bezel h-fit sticky top-28">
          <div className="double-bezel-inner bg-white/80 p-5 space-y-6">
            <div className="flex items-center justify-between border-b border-sand/30 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal">
                Shop By
              </h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-[11px] font-semibold text-rose hover:underline"
                >
                  <RotateCcw size={11} /> Reset
                </button>
              )}
            </div>

            {/* Categories List */}
            <div>
              <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider mb-2">
                Categories
              </h4>
              <div className="space-y-1 text-xs">
                <Link
                  href="/shop"
                  className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg transition-colors ${
                    !activeCategorySlug ? 'bg-indigo text-cream font-bold' : 'text-charcoal/70 hover:bg-sand/15'
                  }`}
                >
                  <span>All Collection</span>
                  <span className="text-[10px] opacity-70">({safeProducts.length})</span>
                </Link>
                {safeCategories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/shop/${cat.slug}`}
                    className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg transition-colors ${
                      activeCategorySlug === cat.slug
                        ? 'bg-indigo text-cream font-bold'
                        : 'text-charcoal/70 hover:bg-sand/15'
                    }`}
                  >
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Size Chips with Counts (Image 4 FORMA Inspiration) */}
            {Object.keys(sizeCounts).length > 0 && (
              <div className="border-t border-sand/30 pt-4">
                <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider mb-2">
                  Sizes
                </h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(sizeCounts).map(([size, count]) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        selectedSize === size
                          ? 'border-indigo bg-indigo text-cream'
                          : 'border-sand/40 bg-white/70 text-charcoal hover:border-indigo'
                      }`}
                    >
                      <span>{size}</span>
                      <span className="text-[10px] opacity-60">({count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Swatches with Labels (Image 2 & 4 Inspiration) */}
            {Object.keys(colorCounts).length > 0 && (
              <div className="border-t border-sand/30 pt-4">
                <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider mb-2">
                  Colours
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {Object.entries(colorCounts).map(([color, count]) => {
                    const isSelected = selectedColor === color;
                    const hex = COLOR_HEX[color] || '#d1d5db';
                    return (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(isSelected ? null : color)}
                        className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-lg text-xs capitalize transition-colors ${
                          isSelected ? 'bg-indigo/10 font-bold text-indigo' : 'hover:bg-sand/15 text-charcoal/80'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-charcoal/20 shadow-2xs"
                            style={{ backgroundColor: hex }}
                          />
                          <span>{color}</span>
                        </div>
                        <span className="text-[10px] text-charcoal/40">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price Slider */}
            <div className="border-t border-sand/30 pt-4">
              <div className="flex items-center justify-between text-xs font-bold text-charcoal mb-2">
                <span>Max Price:</span>
                <span className="text-indigo">GH₵{maxPriceGHS}</span>
              </div>
              <input
                type="range"
                min={20}
                max={1000}
                step={10}
                value={maxPriceGHS}
                onChange={(e) => setMaxPriceGHS(Number(e.target.value))}
                className="w-full accent-indigo"
              />
            </div>
          </div>
        </aside>

        {/* ─── Product Cards Grid ─── */}
        <div>
          {displayedProducts.length === 0 ? (
            <div className="double-bezel">
              <div className="double-bezel-inner bg-white/80 p-12 text-center">
                <p className="text-base font-serif text-charcoal font-bold">
                  No items match your selected filters
                </p>
                <p className="text-xs text-charcoal/60 mt-1">
                  Try clearing your size or price filters to view all available drops.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-4 rounded-full bg-indigo px-6 py-2 text-xs font-bold text-cream hover:bg-indigo-deep transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`grid grid-cols-2 gap-3 sm:gap-4 ${
                gridCols === 2
                  ? 'md:grid-cols-2'
                  : gridCols === 3
                  ? 'md:grid-cols-3'
                  : 'md:grid-cols-3 lg:grid-cols-4'
              }`}
            >
              {displayedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Mobile Filters Drawer (Bottom Sheet) ─── */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-charcoal/60 backdrop-blur-xs animate-in fade-in"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-cream p-5 shadow-2xl border-t border-sand/40 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between border-b border-sand/30 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-indigo" />
                <h3 className="font-serif text-lg font-bold text-charcoal">Filters</h3>
              </div>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="rounded-full p-1 text-charcoal/60 hover:text-charcoal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-4 space-y-5">
              {/* Size Filter */}
              {Object.keys(sizeCounts).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal mb-2">Select Size</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(sizeCounts).map(([s, count]) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(selectedSize === s ? null : s)}
                        className={`min-w-[42px] h-10 px-3 rounded-xl border text-xs font-bold ${
                          selectedSize === s
                            ? 'border-indigo bg-indigo text-cream'
                            : 'border-sand/40 bg-white text-charcoal'
                        }`}
                      >
                        {s} <span className="text-[10px] opacity-70">({count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Filter */}
              {Object.keys(colorCounts).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal mb-2">Select Color</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(colorCounts).map(([c, count]) => (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(selectedColor === c ? null : c)}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 border text-xs capitalize ${
                          selectedColor === c
                            ? 'border-indigo bg-indigo text-cream font-bold'
                            : 'border-sand/40 bg-white text-charcoal'
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-charcoal/20"
                          style={{ backgroundColor: COLOR_HEX[c] || '#d1d5db' }}
                        />
                        <span>{c}</span>
                        <span className="text-[10px] opacity-70">({count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Filter */}
              <div>
                <div className="flex justify-between text-xs font-bold text-charcoal mb-1">
                  <span>Max Price:</span>
                  <span className="text-indigo">GH₵{maxPriceGHS}</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={1000}
                  step={10}
                  value={maxPriceGHS}
                  onChange={(e) => setMaxPriceGHS(Number(e.target.value))}
                  className="w-full accent-indigo"
                />
              </div>
            </div>

            {/* Bottom Actions in Drawer */}
            <div className="pt-3 border-t border-sand/30 flex gap-2">
              <button
                onClick={resetFilters}
                className="w-1/3 rounded-xl border border-sand/40 py-3 text-xs font-bold text-charcoal hover:bg-sand/20"
              >
                Reset
              </button>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-2/3 rounded-xl bg-indigo py-3 text-xs font-bold text-cream hover:bg-indigo-deep shadow-sm"
              >
                Show ({displayedProducts.length} items)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
