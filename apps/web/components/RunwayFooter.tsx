'use client';

import Link from 'next/link';
import { MessageCircle, ShieldCheck, Truck, Sparkles } from 'lucide-react';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/haute-couture-data';

export function RunwayFooter() {
  return (
    <footer className="w-full border-t border-black/10 bg-neutral-950 text-white pt-12 pb-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-white/10">
          {/* Brand Col */}
          <div className="space-y-3">
            <h3 className="font-runway text-base sm:text-lg font-bold tracking-runway text-white">
              {BRAND_NAME}
            </h3>
            <p className="font-mono text-xs text-neutral-400">
              {BRAND_TAGLINE} HAUTE COUTURE
            </p>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-xs">
              Bespoke Kaftans, Senators, Ceremonial Robes, and Tailored Menswear in Accra, Ghana.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-runway text-xs tracking-wider font-bold text-neutral-300">
              COLLECTIONS
            </h4>
            <ul className="space-y-2 text-xs text-neutral-400 font-sans">
              <li><Link href="/#runway" className="hover:text-white transition-colors">Spring Summer 2027</Link></li>
              <li><Link href="/shop/clothing" className="hover:text-white transition-colors">Senators &amp; Two-Piece</Link></li>
              <li><Link href="/shop/clothing" className="hover:text-white transition-colors">Grand Kaftans &amp; Agbadas</Link></li>
              <li><Link href="/shop/clothing" className="hover:text-white transition-colors">Ceremonial Smocks</Link></li>
              <li><Link href="/track" className="hover:text-white transition-colors">Track Order</Link></li>
            </ul>
          </div>

          {/* Client Concierge */}
          <div className="space-y-3">
            <h4 className="font-runway text-xs tracking-wider font-bold text-neutral-300">
              CLIENT SERVICES
            </h4>
            <p className="text-xs text-neutral-400">
              Need custom measurements or private atelier fitting?
            </p>
            <a
              href="https://wa.me/233203813606?text=Hello%20Atelier%20Kwame%2C%20I%20would%20like%20to%20inquire%20about%20a%20bespoke%20order"
              target="_blank"
              rel="noreferrer"
              aria-label="Contact Atelier Kwame WhatsApp Concierge"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white hover:text-black transition-all active:scale-95"
            >
              <MessageCircle size={15} />
              <span>WhatsApp Concierge</span>
            </a>
          </div>

          {/* Location & Atelier */}
          <div className="space-y-3">
            <h4 className="font-runway text-xs tracking-wider font-bold text-neutral-300">
              ATELIER ACCRA
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              East Legon &amp; Cantonments, Accra, Ghana.<br />
              Worldwide express dispatch via DHL.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-[10px] text-neutral-400 font-mono">
              <span className="border border-white/10 px-2 py-0.5 rounded">MTN MOMO</span>
              <span className="border border-white/10 px-2 py-0.5 rounded">TELECEL</span>
              <span className="border border-white/10 px-2 py-0.5 rounded">VISA/CARD</span>
              <span className="border border-white/10 px-2 py-0.5 rounded">PAY ON DELIVERY</span>
            </div>
          </div>
        </div>

        {/* Bottom Legal */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-neutral-500 gap-4">
          <p>© 2027 {BRAND_NAME}. Built with zero-latency edge architecture.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
