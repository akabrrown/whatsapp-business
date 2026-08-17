export const metadata = { title: 'Terms of Service | ROSE & DENIM BY KUKUA' };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl py-16 text-sm text-charcoal/80">
      <h1 className="headline text-3xl">Terms of Service</h1>
      <p className="mt-4">
        By placing an order with ROSE &amp; DENIM BY KUKUA, you agree to the following terms.
      </p>
      <h2 className="mt-8 text-lg font-semibold text-indigo">Orders</h2>
      <p className="mt-2">
        Orders are confirmed via WhatsApp after payment is received. Prices are in Ghana Cedis (GHS)
        and include applicable delivery fees for your zone.
      </p>
      <h2 className="mt-8 text-lg font-semibold text-indigo">Delivery</h2>
      <p className="mt-2">
        We deliver across Accra. Delivery times and fees depend on your zone. You&apos;ll receive
        tracking updates via WhatsApp.
      </p>
      <h2 className="mt-8 text-lg font-semibold text-indigo">Returns</h2>
      <p className="mt-2">
        If your item arrives damaged or incorrect, message us on WhatsApp within 48 hours and
        we&apos;ll make it right.
      </p>
      <p className="mt-8 text-xs text-charcoal/50">
        These terms are reviewed periodically. For specific questions about orders
        or delivery, message us on WhatsApp.
      </p>
    </div>
  );
}
