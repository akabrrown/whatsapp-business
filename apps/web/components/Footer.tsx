import { api } from '@/lib/api';
import { normalizeWhatsAppNumber } from '@rose/shared';
import { Truck, MessageCircle, ShieldCheck } from 'lucide-react';

export async function Footer() {
  let whatsappNumber = '';
  try {
    const res = await api.settings();
    whatsappNumber = res.whatsappNumber;
  } catch {
    // API down, storefront still renders its shell (§13.3 browsing resilience).
  }
  const WA_NUMBER = normalizeWhatsAppNumber(whatsappNumber || '233203813606');

  return (
    <footer className="mt-20 border-t border-sand/40 bg-cream pb-24 md:pb-8">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:px-6">
        {/* Brand Info */}
        <div>
          <p className="headline text-2xl font-bold tracking-tight">TOBI CLOTHINGS</p>
          <p className="mt-3 max-w-sm text-xs leading-relaxed text-charcoal/70">
            Premium tops, footwears, bottoms, bags, eyewears and streetwear in Accra, Ghana.
            Shop online with door-to-door delivery across all Accra zones.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-md border border-sand/40 bg-white/90 px-2.5 py-1 font-medium text-charcoal">East Legon</span>
            <span className="rounded-md border border-sand/40 bg-white/90 px-2.5 py-1 font-medium text-charcoal">Osu</span>
            <span className="rounded-md border border-sand/40 bg-white/90 px-2.5 py-1 font-medium text-charcoal">Cantonments</span>
            <span className="rounded-md border border-sand/40 bg-white/90 px-2.5 py-1 font-medium text-charcoal">Spintex</span>
            <span className="rounded-md border border-sand/40 bg-white/90 px-2.5 py-1 font-medium text-charcoal">Airport</span>
            <span className="rounded-md border border-sand/40 bg-white/90 px-2.5 py-1 font-medium text-charcoal">Tema</span>
          </div>
        </div>

        {/* Collections */}
        <div className="text-xs">
          <p className="mb-3 font-bold uppercase tracking-wider text-indigo">Collections</p>
          <ul className="space-y-2 text-charcoal/70">
            <li><a className="hover:text-indigo transition-colors" href="/shop">All Items</a></li>
            <li><a className="hover:text-indigo transition-colors" href="/shop/mens-fashion">Men&apos;s Streetwear</a></li>
            <li><a className="hover:text-indigo transition-colors" href="/shop/womens-fashion">Women&apos;s Chic</a></li>
            <li><a className="hover:text-indigo transition-colors" href="/shop/mens-fashion-footwears">Footwear &amp; Sneakers</a></li>
            <li><a className="hover:text-indigo transition-colors" href="/track">Track Your Order</a></li>
          </ul>
        </div>

        {/* Customer Care */}
        <div className="text-xs">
          <p className="mb-3 font-bold uppercase tracking-wider text-indigo">Talk to Tobi</p>
          <a
            href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hi TOBI CLOTHINGS! I have a question.')}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-wagreen bg-wagreen/10 px-3.5 py-2 text-xs font-semibold text-charcoal hover:bg-wagreen/20 transition-all active:scale-95"
          >
            <span className="h-2 w-2 rounded-full bg-wagreen animate-pulse" aria-hidden />
            WhatsApp Concierge
          </a>
          <p className="mt-2 text-[11px] font-medium text-charcoal/75">Fast replies: sizing, advice &amp; custom drops.</p>
        </div>

        {/* Trust & Payments */}
        <div className="text-xs">
          <p className="mb-3 font-bold uppercase tracking-wider text-indigo">Accepted Payments</p>
          <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold text-charcoal/80">
            <span className="rounded border border-sand/40 bg-white px-2 py-1 shadow-2xs">MTN MoMo</span>
            <span className="rounded border border-sand/40 bg-white px-2 py-1 shadow-2xs">Telecel Cash</span>
            <span className="rounded border border-sand/40 bg-white px-2 py-1 shadow-2xs">Visa / Card</span>
            <span className="rounded border border-sand/40 bg-white px-2 py-1 shadow-2xs">Pay on Delivery</span>
          </div>

          <div className="mt-4 flex flex-col gap-0.5 text-xs text-charcoal/80">
            <a className="inline-flex items-center min-h-[44px] py-2 hover:text-indigo transition-colors" href="/privacy">
              Privacy Policy
            </a>
            <a className="inline-flex items-center min-h-[44px] py-2 hover:text-indigo transition-colors" href="/terms">
              Terms of Service
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-sand/30 py-4 text-center text-xs text-charcoal/70">
        <p>© {new Date().getFullYear()} TOBI CLOTHINGS · Developed by Codey Dev</p>
      </div>
    </footer>
  );
}
