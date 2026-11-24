'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Plus, ArrowRight } from 'lucide-react';
import { RUNWAY_LOOKS, type RunwayLook, BRAND_TAGLINE, CURRENCY_SYMBOL } from '@/lib/haute-couture-data';
import { formatGHS } from '@rose/shared';

interface RunwayHeroStageProps {
  onSelectLook?: (look: RunwayLook) => void;
  onQuickAdd?: (look: RunwayLook) => void;
}

export function RunwayHeroStage({ onSelectLook, onQuickAdd }: RunwayHeroStageProps) {
  const [activeIdx, setActiveIdx] = useState(7); // Start on Look 8 (The Green Tuxedo Set, as seen in the video)
  const currentLook = RUNWAY_LOOKS[activeIdx];

  const nextLook = () => {
    setActiveIdx((prev) => (prev + 1) % RUNWAY_LOOKS.length);
  };

  const prevLook = () => {
    setActiveIdx((prev) => (prev - 1 + RUNWAY_LOOKS.length) % RUNWAY_LOOKS.length);
  };

  return (
    <section className="relative w-full overflow-hidden bg-white pt-2 sm:pt-4 pb-8 border-b border-black/10">
      {/* ─── 1. Runway Collection Banner ─── */}
      <div className="mx-auto max-w-5xl px-4 text-center">
        <h2 className="font-runway text-xs sm:text-sm md:text-base tracking-[0.22em] font-bold text-black uppercase">
          {BRAND_TAGLINE}
        </h2>
      </div>

      {/* ─── 2. Interactive Stage Presentation ─── */}
      <div className="relative mx-auto mt-4 max-w-2xl px-4 flex flex-col items-center">
        {/* Navigation Arrows for Runway switching */}
        <button
          type="button"
          onClick={prevLook}
          aria-label="Previous runway look"
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white/80 backdrop-blur-md border border-black/10 text-black shadow-sm transition-all hover:bg-black hover:text-white active:scale-95"
        >
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>

        <button
          type="button"
          onClick={nextLook}
          aria-label="Next runway look"
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white/80 backdrop-blur-md border border-black/10 text-black shadow-sm transition-all hover:bg-black hover:text-white active:scale-95"
        >
          <ChevronRight size={22} strokeWidth={1.5} />
        </button>

        {/* Mannequin Centerpiece with Runway Shadow */}
        <div className="relative w-full max-w-[340px] sm:max-w-[420px] aspect-[4/5] overflow-hidden flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentLook.heroImage}
            alt={currentLook.name}
            width={600}
            height={600}
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            className="h-full w-full object-contain transition-all duration-500 ease-out select-none scale-100 hover:scale-102"
          />

          {/* Runway Floor Shadow Perspective */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-6 rounded-full bg-black/15 blur-lg"
          />
        </div>

        {/* ─── 3. Look Details Overlay (from Video) ─── */}
        <div className="mt-2 text-center flex flex-col items-center">
          <div className="flex items-center gap-3">
            <span className="font-runway text-2xl sm:text-4xl tracking-runway font-bold text-black">
              {currentLook.lookLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onQuickAdd) onQuickAdd(currentLook);
              if (onSelectLook) onSelectLook(currentLook);
            }}
            className="mt-2 font-runway text-xs sm:text-sm tracking-wider font-semibold text-black runway-underline hover:text-gold transition-colors py-1 cursor-pointer"
          >
            SHOP THE LOOK
          </button>

          {/* Quick specs pill */}
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-neutral-50 px-3.5 py-1 text-xs">
            <span className="font-runway text-[10px] tracking-wider text-neutral-500 font-semibold">
              {currentLook.name}
            </span>
            <span className="font-mono font-bold text-black">
              {CURRENCY_SYMBOL}{currentLook.priceGHS.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ─── 4. Look Progression Dots ─── */}
        <div className="mt-6 flex items-center gap-1.5">
          {RUNWAY_LOOKS.map((look, i) => (
            <button
              key={look.id}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={`Go to ${look.lookLabel}`}
              className={`h-1.5 transition-all duration-300 rounded-full ${
                i === activeIdx ? 'w-8 bg-black' : 'w-2 bg-neutral-300 hover:bg-neutral-400'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
