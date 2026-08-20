"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, X } from "lucide-react";
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

export function LiveSearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
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
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
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
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-y-0 left-0 flex items-center text-charcoal/30 group-focus-within:text-indigo transition-colors">
          <Search size={22} strokeWidth={1.5} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.trim()) setOpen(true); }}
          placeholder="Search for tops, denim, accessories..."
          className="w-full bg-transparent border-b-2 border-charcoal/15 py-3 pl-10 pr-10 text-lg md:text-xl text-charcoal placeholder:text-charcoal/30 placeholder:font-light focus:outline-none focus:border-indigo transition-colors rounded-none"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 flex items-center text-charcoal/40 hover:text-charcoal/80 transition-colors"
          >
            {loading ? <Loader2 size={20} className="animate-spin text-indigo" /> : <X size={20} strokeWidth={1.5} />}
          </button>
        )}
      </form>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-3 overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl border border-charcoal/10 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          {loading && results.length === 0 ? (
            <div className="p-8 text-center text-charcoal/50 text-sm">Searching...</div>
          ) : results.length > 0 ? (
            <div className="max-h-[60vh] overflow-y-auto overscroll-contain py-2">
              <div className="px-4 py-2 text-xs font-semibold tracking-wider text-charcoal/40 uppercase">
                Products
              </div>
              {results.slice(0, 6).map((product) => (
                <Link
                  key={product.id}
                  href={`/shop/${product.category.slug}/${product.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-sand/30 transition-colors group"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-charcoal/5">
                    {product.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-indigo/10" />
                    )}
                  </div>
                  <div className="flex flex-col flex-grow">
                    <span className="font-serif text-lg text-charcoal leading-tight line-clamp-1">{product.name}</span>
                    <span className="text-sm text-charcoal/60">{product.category.name}</span>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <span className="font-medium text-charcoal">GHS {(product.minPriceP / 100).toFixed(2)}</span>
                  </div>
                </Link>
              ))}
              {results.length > 6 && (
                <button
                  onClick={handleSubmit}
                  className="w-full border-t border-charcoal/5 p-4 text-center text-sm font-medium text-indigo hover:bg-indigo/5 transition-colors"
                >
                  View all {results.length} results
                </button>
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-charcoal/60">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-sm text-charcoal/40 mt-1">Try searching for something else.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
