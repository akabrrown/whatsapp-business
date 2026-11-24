import { RUNWAY_LOOKS, BRAND_NAME, BRAND_TAGLINE } from '@/lib/haute-couture-data';
import { RunwayHeroStage } from '@/components/RunwayHeroStage';
import { RunwayLookbookCarousel } from '@/components/RunwayLookbookCarousel';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, ShieldCheck, Ruler, Scissors } from 'lucide-react';

export const revalidate = 60;

export default function HomePage() {
  return (
    <div className="w-full bg-white text-black">
      {/* ─── 1. Runway Hero Stage (From Video: SPRING SUMMER 2027 LOOKS 1-9) ─── */}
      <section id="runway" className="w-full">
        <RunwayHeroStage />
      </section>

      {/* ─── 2. Lookbook Horizontal Carousel (From Video: THE LOOKBOOK with quick-add +) ─── */}
      <section className="w-full">
        <RunwayLookbookCarousel />
      </section>

      {/* ─── 3. Editorial Haute Couture Feature Grid ─── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col sm:flex-row items-baseline justify-between border-b border-black/10 pb-4 mb-8">
          <div>
            <span className="font-mono text-xs tracking-widest text-neutral-500 uppercase">
              HAUTE COUTURE EDITORIAL
            </span>
            <h2 className="font-runway text-lg sm:text-2xl font-bold tracking-runway text-black mt-1">
              THE 2027 RUNWAY SUITE
            </h2>
          </div>
          <Link
            href="/shop"
            className="font-runway text-xs font-semibold tracking-wider text-black hover:opacity-60 transition-opacity flex items-center gap-1.5 mt-2 sm:mt-0"
          >
            <span>VIEW ALL LOOKS</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature Look 1: Ceremonial Robe */}
          <Link
            href={`/product/${RUNWAY_LOOKS[0].slug}`}
            className="group relative overflow-hidden bg-neutral-100 flex flex-col justify-end aspect-[3/4] p-6 border border-black/5 hover:border-black/20 transition-all"
          >
            <Image
              src={RUNWAY_LOOKS[0].cardImage}
              alt={RUNWAY_LOOKS[0].name}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="relative z-10 text-white">
              <span className="font-mono text-[10px] tracking-widest uppercase text-amber-300">
                LOOK 01 · CEREMONIAL
              </span>
              <h3 className="font-runway text-sm sm:text-base font-bold tracking-wider mt-1">
                {RUNWAY_LOOKS[0].name}
              </h3>
              <p className="font-mono text-xs text-neutral-300 mt-1">
                GH₵{RUNWAY_LOOKS[0].priceGHS.toLocaleString()}
              </p>
            </div>
          </Link>

          {/* Feature Look 2: The Green Tuxedo */}
          <Link
            href={`/product/${RUNWAY_LOOKS[7].slug}`}
            className="group relative overflow-hidden bg-neutral-100 flex flex-col justify-end aspect-[3/4] p-6 border border-black/5 hover:border-black/20 transition-all md:translate-y-4"
          >
            <Image
              src={RUNWAY_LOOKS[7].cardImage}
              alt={RUNWAY_LOOKS[7].name}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="relative z-10 text-white">
              <span className="font-mono text-[10px] tracking-widest uppercase text-emerald-300">
                LOOK 08 · RUNWAY HEADLINER
              </span>
              <h3 className="font-runway text-sm sm:text-base font-bold tracking-wider mt-1">
                {RUNWAY_LOOKS[7].name}
              </h3>
              <p className="font-mono text-xs text-neutral-300 mt-1">
                GH₵{RUNWAY_LOOKS[7].priceGHS.toLocaleString()}
              </p>
            </div>
          </Link>

          {/* Feature Look 3: The Grand Kaftan */}
          <Link
            href={`/product/${RUNWAY_LOOKS[4].slug}`}
            className="group relative overflow-hidden bg-neutral-100 flex flex-col justify-end aspect-[3/4] p-6 border border-black/5 hover:border-black/20 transition-all"
          >
            <Image
              src={RUNWAY_LOOKS[4].cardImage}
              alt={RUNWAY_LOOKS[4].name}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="relative z-10 text-white">
              <span className="font-mono text-[10px] tracking-widest uppercase text-amber-300">
                LOOK 05 · SIGNATURE SILK
              </span>
              <h3 className="font-runway text-sm sm:text-base font-bold tracking-wider mt-1">
                {RUNWAY_LOOKS[4].name}
              </h3>
              <p className="font-mono text-xs text-neutral-300 mt-1">
                GH₵{RUNWAY_LOOKS[4].priceGHS.toLocaleString()}
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* ─── 4. The Atelier Kwame Standard (Craft & Concierge) ─── */}
      <section className="w-full bg-neutral-900 text-white py-16 border-t border-black/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="font-mono text-xs tracking-widest text-neutral-400 uppercase">
              SAVOIR-FAIRE &amp; HERITAGE
            </span>
            <h2 className="font-runway text-xl sm:text-3xl font-bold tracking-runway mt-2 text-white">
              THE ATELIER STANDARD
            </h2>
            <p className="text-neutral-400 text-sm mt-3 leading-relaxed">
              Every garment is hand-drafted in Accra using premium wool blends, handwoven smock yarns, and gold metallic filament embroidery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="border border-white/10 p-6 bg-white/[0.02]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white mb-4">
                <Scissors size={20} />
              </div>
              <h3 className="font-runway text-xs font-bold tracking-wider text-white">
                BESPOKE PATTERN DRAFTING
              </h3>
              <p className="text-neutral-400 text-xs mt-2 leading-relaxed">
                Individually cut to your exact anatomical proportions. Select bespoke sizing at checkout for a personal concierge consultation.
              </p>
            </div>

            <div className="border border-white/10 p-6 bg-white/[0.02]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white mb-4">
                <Ruler size={20} />
              </div>
              <h3 className="font-runway text-xs font-bold tracking-wider text-white">
                METRIC &amp; IMPERIAL ACCURACY
              </h3>
              <p className="text-neutral-400 text-xs mt-2 leading-relaxed">
                Standard ready-to-wear sizes S to 2XL available for rapid express courier dispatch across Greater Accra and worldwide DHL Express.
              </p>
            </div>

            <div className="border border-white/10 p-6 bg-white/[0.02]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white mb-4">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-runway text-xs font-bold tracking-wider text-white">
                DIRECT ATELIER GUARANTEE
              </h3>
              <p className="text-neutral-400 text-xs mt-2 leading-relaxed">
                Complementary alteration coverage within 14 days of delivery. Instant support and fitting adjustments via WhatsApp Concierge.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
