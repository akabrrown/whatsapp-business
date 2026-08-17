export const metadata = { title: 'Privacy Policy — ROSE & DENIM BY KUKUA' };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl py-16 text-sm text-charcoal/80">
      <h1 className="headline text-3xl">Privacy Policy</h1>
      <p className="mt-4">
        At ROSE &amp; DENIM BY KUKUA, we respect your privacy. This policy outlines how we collect, use,
        and protect your personal information when you shop with us via WhatsApp or our website.
      </p>
      <h2 className="mt-8 text-lg font-semibold text-indigo">What we collect</h2>
      <ul className="mt-2 list-disc pl-5 space-y-1">
        <li>Your name and WhatsApp number for order confirmation and delivery</li>
        <li>Delivery address for fulfillment</li>
        <li>Order history for customer service</li>
      </ul>
      <h2 className="mt-8 text-lg font-semibold text-indigo">How we use it</h2>
      <p className="mt-2">
        We use your information solely to process orders, arrange delivery, and provide customer
        support. We never sell your data to third parties.
      </p>
      <h2 className="mt-8 text-lg font-semibold text-indigo">Your rights</h2>
      <p className="mt-2">
        You may request access to, correction of, or deletion of your personal data at any time
        by messaging us on WhatsApp.
      </p>
      <p className="mt-8 text-xs text-charcoal/50">
        This is a placeholder page. A full privacy policy compliant with Ghana&apos;s Data Protection
        Act, 2012 (Act 843) will be published here.
      </p>
    </div>
  );
}
