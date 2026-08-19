import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MiniCart } from '@/components/MiniCart';
import { api } from '@/lib/api';
import { RealtimeSync } from '@/components/RealtimeSync';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
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
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-indigo focus:px-4 focus:py-2 focus:text-cream">
          Skip to content
        </a>
        <CartProvider>
          <Navbar categories={categories} />
          <main id="main-content" className="mx-auto max-w-6xl px-4 md:px-6">{children}</main>
          <Footer />
          <MiniCart />
        </CartProvider>
        <RealtimeSync />
      </body>
    </html>
  );
}
