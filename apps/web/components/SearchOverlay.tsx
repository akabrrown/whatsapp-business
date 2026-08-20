"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { LiveSearchBar } from "./LiveSearchBar";
import { usePathname } from "next/navigation";

interface SearchOverlayProps {
  categories?: { name: string; slug: string }[];
}

export function SearchOverlay({ categories = [] }: SearchOverlayProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close overlay on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  // Keyboard shortcut (Escape to close, Cmd+K to open)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="text-charcoal hover:text-indigo transition-colors flex items-center justify-center p-2 rounded-full hover:bg-charcoal/5"
      >
        <Search size={24} strokeWidth={1.5} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-cream/95 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between p-6 md:p-8">
            <span className="font-serif text-2xl tracking-tight text-charcoal">Search</span>
            <button 
              onClick={() => setOpen(false)}
              className="p-2 text-charcoal hover:text-rose transition-colors rounded-full hover:bg-charcoal/5"
              aria-label="Close search"
            >
              <X size={28} strokeWidth={1.5} />
            </button>
          </div>
          
          <div className="flex-1 px-6 md:px-8 mt-10">
            <div className="max-w-2xl mx-auto">
              <LiveSearchBar categories={categories} />
              
              <div className="mt-8 text-charcoal/50 text-sm flex gap-4">
                <span>Press <kbd className="font-sans px-2 py-1 bg-charcoal/5 rounded border border-charcoal/10 text-charcoal">ESC</kbd> to close</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
