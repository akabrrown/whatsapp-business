'use client';
import { useState, useEffect, useRef } from 'react';
import { Share2, Check, MessageCircle, Link as LinkIcon } from 'lucide-react';

export function ShareButton({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const url = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        // user cancelled or failed
      }
    } else {
      setOpen(!open);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 2000);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button 
        onClick={handleShare}
        className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-charcoal/50 hover:text-indigo transition-colors"
        aria-label="Share product"
      >
        <Share2 size={14} /> Share
      </button>

      {open && (
        <div className="absolute left-0 right-auto mt-2 w-48 rounded bg-white p-2 shadow-xl border border-sand/30 z-20 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 md:left-auto md:right-0">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 text-sm text-charcoal/80 hover:bg-sand/30 rounded transition-colors"
          >
            <MessageCircle size={16} className="text-[#25D366]" /> WhatsApp
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 text-sm text-charcoal/80 hover:bg-sand/30 rounded transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#1DA1F2]">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
            </svg> 
            Twitter
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 text-sm text-charcoal/80 hover:bg-sand/30 rounded transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#4267B2]">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Facebook
          </a>
          <div className="my-1 border-t border-sand/20" />
          <button
            onClick={copyLink}
            className="flex items-center gap-3 px-3 py-2 text-sm text-charcoal/80 hover:bg-sand/30 rounded text-left transition-colors"
          >
            {copied ? <Check size={16} className="text-wagreen" /> : <LinkIcon size={16} />} 
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      )}
    </div>
  );
}
