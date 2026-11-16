'use client';

import { useState, useEffect } from 'react';
import { Clock, Flame, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function FlashDropCountdown() {
  // 48-hour rolling flash sale ticker
  const [timeLeft, setTimeLeft] = useState({
    hours: 14,
    minutes: 28,
    seconds: 45,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 24, minutes: 0, seconds: 0 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const format2 = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="double-bezel transition-spring hover:shadow-md">
      <div className="double-bezel-inner bg-charcoal bg-gradient-to-r from-charcoal via-indigo to-charcoal p-4 sm:p-5 text-cream flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="h-10 w-10 rounded-full bg-rose/20 text-rose border border-rose/30 flex items-center justify-center shrink-0">
            <Flame size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="rounded bg-rose px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Limited Drop
              </span>
              <p className="text-xs font-semibold text-white">Weekend Flash Deals</p>
            </div>
            <h2 className="font-serif text-base sm:text-lg font-bold text-white mt-0.5">
              Up to 40% Off Selected Tops &amp; Footwears
            </h2>
          </div>
        </div>

        {/* Countdown Flip Counters (Image 1 Mykart Inspiration) */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <div className="rounded-lg bg-black/60 border border-white/20 px-2.5 py-1.5 min-w-[38px] text-center">
              <span className="font-mono text-sm sm:text-base font-bold text-white">
                {format2(timeLeft.hours)}
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-wider text-white mt-1 font-medium">Hrs</span>
          </div>
          <span className="font-bold text-white -mt-3">:</span>
          <div className="flex flex-col items-center">
            <div className="rounded-lg bg-black/60 border border-white/20 px-2.5 py-1.5 min-w-[38px] text-center">
              <span className="font-mono text-sm sm:text-base font-bold text-white">
                {format2(timeLeft.minutes)}
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-wider text-white mt-1 font-medium">Min</span>
          </div>
          <span className="font-bold text-white -mt-3">:</span>
          <div className="flex flex-col items-center">
            <div className="rounded-lg bg-black/60 border border-white/20 px-2.5 py-1.5 min-w-[38px] text-center">
              <span className="font-mono text-sm sm:text-base font-bold text-rose-light">
                {format2(timeLeft.seconds)}
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-wider text-white mt-1 font-medium">Sec</span>
          </div>

          <Link
            href="/shop"
            aria-label="Claim flash deals and view products"
            className="ml-3 hidden md:flex items-center gap-1.5 rounded-full bg-white text-charcoal px-4 py-2 text-xs font-bold hover:bg-cream transition-colors"
          >
            Claim Deals <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
