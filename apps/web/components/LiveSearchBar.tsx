"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, X, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  slug: string;
  name: string;
  images: string[];
  minPriceP: number;
  category: { name: string; slug: string };
}

interface LiveSearchBarProps {
  categories?: { name: string; slug: string }[];
}

export function LiveSearchBar({ categories = [] }: LiveSearchBarProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const catDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Click outside to close search results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Click outside to close category dropdown
  useEffect(() => {
    function handleClickOutsideCat(event: MouseEvent) {
      if (catDropdownRef.current && !catDropdownRef.current.contains(event.target as Node)) {
        setCatDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutsideCat);
    return () => document.removeEventListener("mousedown", handleClickOutsideCat);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    setOpen(true);

    const timer = setTimeout(async () => {
      try {
        let url = `/api/search?q=${encodeURIComponent(query)}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setResults(data.products || []);
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      let url = `/search?q=${encodeURIComponent(query.trim())}`;
      if (category) url += `&category=${encodeURIComponent(category)}`;
      router.push(url);
      setOpen(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  if (!mounted) return null;

  return (
    <div ref={containerRef} className="relative z-50 mb-10 w-full max-w-lg">
      <form onSubmit={handleSubmit} className="relative group flex items-center border-b-2 border-charcoal/15 focus-within:border-indigo transition-colors">
        <div className="flex items-center text-charcoal/30 group-focus-within:text-indigo transition-colors pl-2">
          <Search size={22} strokeWidth={1.5} />
        </div>
        
        {categories.length > 0 && (
          <div className="relative ml-3" ref={catDropdownRef}>
            <button
              type="button"
              onClick={() => setCatDropdownOpen(!catDropdownOpen)}
              className="flex items-center gap-1.5 text-sm font-medium tracking-wide text-charcoal/70 hover:text-indigo transition-colors cursor-pointer"
            >
              {category ? categories.find(c => c.slug === category)?.name : "All Categories"}
              <ChevronDown size={14} className={`transition-transform duration-200 ${catDropdownOpen ? 'rotate-180 text-indigo' : ''}`} />
            </button>
            
            {catDropdownOpen && (
              <div className="absolute top-full left-0 mt-3 w-48 overflow-hidden rounded-xl bg-white/95 backdrop-blur-2xl border border-charcoal/5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] py-1.5 z-[60] animate-in fade-in zoom-in-95 duration-200">
                <button
                  type="button"
                  className={`w-full text-left px-4 py-2.5 text-sm transition-all hover:bg-sand/30 hover:pl-5 ${!category ? 'font-medium text-indigo bg-sand/10' : 'text-charcoal/80'}`}
                  onClick={() => { setCategory(""); setCatDropdownOpen(false); if (query.trim()) setOpen(true); }}
                >
                  All Categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    className={`w-full text-left px-4 py-2.5 text-sm transition-all hover:bg-sand/30 hover:pl-5 ${category === c.slug ? 'font-medium text-indigo bg-sand/10' : 'text-charcoal/80'}`}
                    onClick={() => { setCategory(c.slug); setCatDropdownOpen(false); if (query.trim()) setOpen(true); }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.trim()) setOpen(true); }}
          placeholder="Search..."
          className="flex-1 bg-transparent py-3 pl-3 pr-10 text-lg md:text-xl text-charcoal placeholder:text-charcoal/30 placeholder:font-light focus:outline-none rounded-none"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 flex items-center pr-2 text-charcoal/40 hover:text-charcoal/80 transition-colors"
          >
            {loading ? <Loader2 size={20} className="animate-spin text-indigo" /> : <X size={20} strokeWidth={1.5} />}
          </button>
        )}
      </form>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-4 overflow-hidden rounded-xl bg-white/70 backdrop-blur-3xl border border-charcoal/5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] animate-in fade-in slide-in-from-top-2 duration-300 ease-out">
          {loading && results.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-charcoal/40" size={24} />
              <span className="text-charcoal/50 text-sm font-medium tracking-wide uppercase">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-[70vh] overflow-y-auto overscroll-contain py-3">
              <div className="px-5 py-3 text-[10px] font-bold tracking-[0.2em] text-charcoal/30 uppercase flex items-center justify-between">
                <span>Products</span>
                <span>{results.length} results</span>
              </div>
              <div className="flex flex-col gap-1 px-2">
                {results.slice(0, 6).map((product) => (
                  <Link
                    key={product.id}
                    href={`/shop/${product.category.slug}/${product.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-5 p-3 rounded-lg hover:bg-white transition-all duration-300 group hover:shadow-sm"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-sand/30 border border-charcoal/5">
                      {product.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        />
                      ) : (
                        <div className="h-full w-full bg-indigo/5" />
                      )}
                    </div>
                    <div className="flex flex-col flex-grow justify-center transition-transform duration-300 group-hover:translate-x-1">
                      <span className="font-serif text-lg text-charcoal leading-snug line-clamp-1">{product.name}</span>
                      <span className="text-xs text-charcoal/50 uppercase tracking-wider mt-1">{product.category.name}</span>
                    </div>
                    <div className="text-right whitespace-nowrap pl-4 opacity-70 group-hover:opacity-100 transition-opacity">
                      <span className="font-medium text-sm text-charcoal">GHS {(product.minPriceP / 100).toFixed(2)}</span>
                    </div>
                  </Link>
                ))}
              </div>
              {results.length > 6 && (
                <div className="p-2 mt-2">
                  <button
                    onClick={handleSubmit}
                    className="w-full rounded-lg bg-charcoal text-white p-4 text-center text-sm font-medium hover:bg-charcoal/90 transition-all active:scale-[0.98]"
                  >
                    View all {results.length} results
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-charcoal/5 flex items-center justify-center mb-4">
                <Search className="text-charcoal/30" size={20} />
              </div>
              <p className="text-charcoal/80 font-medium">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-sm text-charcoal/40 mt-2 max-w-[80%] mx-auto leading-relaxed">Check your spelling or try searching for a broader term like &quot;denim&quot; or &quot;accessories&quot;.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
