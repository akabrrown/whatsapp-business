import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { ClientOverlays } from '@/components/ClientOverlays';
import { api } from '@/lib/api';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  style: ['normal'],
  preload: true,
});
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://mystore-web.vercel.app'),
  title: 'TOBI CLOTHINGS: SHOP & WEAR BY TOBI: Tops, footwears, buttoms, bags & eyewears in ACCRA',
  description: 'Tops, footwears, buttoms, bags, eyewears and the little things, ordered over WhatsApp and delivered across Accra. Shop the collection online or chat with us directly.',
  keywords: ['tops', 'footwears', 'buttoms', 'bags', 'eyewears', 'fashion', 'Accra', 'Ghana', 'WhatsApp shopping', 'tobi clothings'],
  authors: [{ name: 'Tobi', url: 'https://myclothingsstore.com' }],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'TOBI CLOTHINGS',
    description: 'Tops, footwears, buttoms, bags, eyewears and the little things, ordered over WhatsApp and delivered across Accra.',
    type: 'website',
    locale: 'en_GH',
    siteName: 'TOBI CLOTHINGS',
    images: [{ url: '/og-image.svg', width: 1200, height: 630, alt: 'TOBI CLOTHINGS' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TOBI CLOTHINGS',
    description: 'Tops, footwears, buttoms, bags, eyewears and the little things, ordered over WhatsApp and delivered across Accra.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let categories: Awaited<ReturnType<typeof api.categories>> = [];
  try {
    categories = await api.categories();
  } catch {
    // API down, storefront still renders its shell (§13.3 browsing resilience).
  }
  const safeCategories = Array.isArray(categories) ? categories : [];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FashionStore',
    name: 'TOBI CLOTHINGS',
    url: 'https://tobiclothings.com',
    description: 'Tops, footwears, buttoms, bags, eyewears and the little things, ordered over WhatsApp and delivered across Accra.',
    telephone: '+233203813606',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Accra',
      addressCountry: 'GH',
    },
    currenciesAccepted: 'GHS',
    paymentAccepted: 'Mobile Money, Credit Card',
    priceRange: 'GH₵30 - GH₵1,500',
  };

  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e.message && (e.message.indexOf('ChunkLoadError') !== -1 || e.message.indexOf('Loading chunk') !== -1)) {
                  if (!sessionStorage.getItem('chunk_reload')) {
                    sessionStorage.setItem('chunk_reload', '1');
                    window.location.reload();
                  }
                }
              });
              window.addEventListener('load', function() {
                sessionStorage.removeItem('chunk_reload');
              });
            `,
          }}
        />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-indigo focus:px-4 focus:py-2 focus:text-cream">
          Skip to content
        </a>
        <CartProvider>
          <Navbar categories={safeCategories} />
          <main id="main-content" className="mx-auto max-w-6xl px-4 md:px-6 pt-20 md:pt-32 pb-24 md:pb-12 min-h-[75vh]">
            {children}
          </main>
          <Footer />
          <MobileBottomNav />
          <ClientOverlays />
        </CartProvider>
      </body>
    </html>
  );
}
