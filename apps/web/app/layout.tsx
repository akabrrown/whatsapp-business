import type { Metadata, Viewport } from 'next';
import { Syncopate, Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import { RunwayNavbar } from '@/components/RunwayNavbar';
import { RunwayFooter } from '@/components/RunwayFooter';
import { ClientOverlays } from '@/components/ClientOverlays';
import { api } from '@/lib/api';

const syncopate = Syncopate({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-syncopate',
  display: 'swap',
  preload: true,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
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
  title: 'ATELIER KWAME — Spring Summer 2027 Runway Haute Couture (Accra)',
  description: 'Atelier Kwame Spring Summer 2027 Runway Collection. Bespoke Kaftans, Senators, Ceremonial Robes, and Tailored Menswear in Accra, Ghana. Shop the looks online or order via WhatsApp Concierge.',
  keywords: ['runway', 'haute couture', 'menswear', 'kaftans', 'senators', 'smocks', 'Accra fashion', 'Ghana couture', 'bespoke tailoring', 'atelier kwame'],
  authors: [{ name: 'Atelier Kwame', url: 'https://atelierkwame.com' }],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'ATELIER KWAME — Spring Summer 2027 Runway',
    description: 'Bespoke Kaftans, Senators, Ceremonial Robes, and Tailored Menswear in Accra, Ghana.',
    type: 'website',
    locale: 'en_GH',
    siteName: 'ATELIER KWAME',
    images: [{ url: '/runway/hero-look-8-green-tuxedo.jpg', width: 1200, height: 630, alt: 'ATELIER KWAME Runway Look 8' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ATELIER KWAME — Runway Haute Couture',
    description: 'Bespoke Kaftans, Senators, Ceremonial Robes, and Tailored Menswear in Accra, Ghana.',
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
    name: 'ATELIER KWAME',
    url: 'https://atelierkwame.com',
    description: 'Bespoke Kaftans, Senators, Ceremonial Robes, and Tailored Menswear in Accra, Ghana.',
    telephone: '+233203813606',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Accra',
      addressCountry: 'GH',
    },
    currenciesAccepted: 'GHS',
    paymentAccepted: 'Mobile Money, Credit Card',
    priceRange: 'GH₵1,850 - GH₵3,500',
  };

  return (
    <html lang="en" className={`${syncopate.variable} ${spaceGrotesk.variable} ${inter.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-white text-runway-black selection:bg-gold/20 selection:text-black">
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
          <RunwayNavbar />
          <main id="main-content" className="min-h-[75vh] w-full">
            {children}
          </main>
          <RunwayFooter />
          <ClientOverlays />
        </CartProvider>
      </body>
    </html>
  );
}
