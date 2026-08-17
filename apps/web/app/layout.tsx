import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MiniCart } from '@/components/MiniCart';
import { api } from '@/lib/api';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'ROSE & DENIM BY KUKUA',
  description: 'Denim, dresses, bags and the little things — ordered over WhatsApp, delivered across Accra.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let categories: Awaited<ReturnType<typeof api.categories>> = [];
  try {
    categories = await api.categories();
  } catch {
    // API down — the storefront still renders its shell (§13.3 browsing resilience).
  }
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <CartProvider>
          <Navbar categories={categories} />
          <main className="mx-auto max-w-6xl px-4 md:px-6">{children}</main>
          <Footer />
          <MiniCart />
        </CartProvider>
      </body>
    </html>
  );
}
