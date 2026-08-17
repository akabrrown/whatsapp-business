// Footer — warm off-white, denim text, WhatsApp invitation as the one green
// accent on the site (ux.md §3.1).
const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '233200000000';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-sand/40 bg-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[2fr_1fr_1fr] md:px-6">
        <div>
          <p className="headline text-2xl">ROSE &amp; DENIM</p>
          <p className="mt-2 max-w-sm text-sm text-charcoal/70">
            By Kukua — Accra, Ghana. Denim, dresses, bags and the little things,
            ordered the way you already chat.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-medium text-indigo">Shop</p>
          <ul className="space-y-2 text-charcoal/70">
            <li><a className="hover:text-indigo" href="/shop/jeans">Jeans</a></li>
            <li><a className="hover:text-indigo" href="/shop/female-wears">Female Wears</a></li>
            <li><a className="hover:text-indigo" href="/shop/bags">Bags</a></li>
            <li><a className="hover:text-indigo" href="/shop">Everything</a></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-medium text-indigo">Talk to us</p>
          <a
            href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hi ROSE & DENIM! I have a question.')}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 border border-wagreen/60 px-4 py-2 text-charcoal hover:bg-wagreen/10"
          >
            <span className="h-2 w-2 rounded-full bg-wagreen" aria-hidden />
            Chat with Kukua on WhatsApp
          </a>
          <p className="mt-3 text-xs text-charcoal/50">We reply fast — promise.</p>
        </div>
      </div>
      <div className="border-t border-sand/30 py-4 text-center text-xs text-charcoal/50">
        © {new Date().getFullYear()} ROSE &amp; DENIM BY KUKUA
      </div>
    </footer>
  );
}
