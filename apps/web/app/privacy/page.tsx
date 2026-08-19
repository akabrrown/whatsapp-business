export const metadata = { title: 'Privacy Policy | TOBI CLOTHINGS' };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl py-16 text-sm text-charcoal/80">
      <h1 className="headline text-3xl">Privacy Policy</h1>
      <p className="mt-4">
        At TOBI CLOTHINGS, we respect your privacy. This policy outlines how we collect, use,
        and protect your personal information when you shop with us via WhatsApp or our website, in compliance with Ghana&apos;s Data Protection Act, 2012 (Act 843).
      </p>
      
      <h2 className="mt-8 text-lg font-semibold text-indigo">What We Collect</h2>
      <ul className="mt-2 list-disc pl-5 space-y-1">
        <li>Your name and WhatsApp number for order confirmation and delivery.</li>
        <li>Delivery address for order fulfillment.</li>
        <li>Order history for customer service and returns.</li>
        <li>Technical session data (e.g., cart IDs) stored locally on your device.</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold text-indigo">How We Use It (Legal Basis)</h2>
      <p className="mt-2">
        We process your data primarily on the basis of <strong>contractual necessity</strong> (to fulfill your orders). We also use your order history for <strong>legitimate interests</strong>, such as sending follow-up care instructions or offering discounts on related items. You can opt out of marketing messages at any time by replying "STOP" on WhatsApp.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-indigo">Third-Party Sharing & Data Transfer</h2>
      <p className="mt-2">
        We never sell your data. To provide our services, we share necessary information with trusted partners:
      </p>
      <ul className="mt-2 list-disc pl-5 space-y-1">
        <li><strong>Paystack</strong>: Receives your phone number and order amount to process secure payments. We do not store your card details.</li>
        <li><strong>Meta (WhatsApp)</strong>: Transmits all chat messages between you and our automated system/staff.</li>
      </ul>
      <p className="mt-2">
        Our database is hosted securely on cloud infrastructure (Supabase), which may involve transferring data to servers outside of Ghana (e.g., EU Central).
      </p>

      <h2 className="mt-8 text-lg font-semibold text-indigo">Data Retention</h2>
      <p className="mt-2">
        We keep your order history and conversation logs for as long as necessary to provide customer support and meet legal accounting requirements. If you do not interact with us for an extended period, we may archive or delete your data according to our internal retention policies.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-indigo">Cookies & Local Storage</h2>
      <p className="mt-2">
        Our website uses local storage to remember what is in your cart so you can continue shopping. We do not use intrusive tracking cookies.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-indigo">Your Rights</h2>
      <p className="mt-2">
        Under Act 843, you have the right to request access to, correction of, or deletion of your personal data. To exercise these rights, simply message us on WhatsApp.
      </p>

      <p className="mt-8 text-xs text-charcoal/50">
        This policy is reviewed periodically and updated as needed. Last updated: August 2026.
      </p>
    </div>
  );
}
