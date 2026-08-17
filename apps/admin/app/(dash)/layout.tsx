'use client';
// Authenticated shell — sidebar nav, owner-only sections, live alert toasts.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { clearAuth, getToken, getUser, subscribeAdminEvents } from '@/lib/api';

const NAV = [
  { href: '/orders', label: 'Orders' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/inbox', label: 'Inbox' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/customers', label: 'Customers' },
  { href: '/settings', label: 'Settings', ownerOnly: true },
];

export default function DashLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setUser(getUser());
    const off = subscribeAdminEvents((e) => {
      const p = e.payload as Record<string, unknown> | undefined;
      if (e.type === 'inbox.alert') setToast(`💬 ${p?.phone ?? 'Customer'} needs Kukua (${p?.reason ?? 'question'})`);
      else if (e.type === 'alert.low_stock') setToast(`📦 Low stock — ${p?.sku ?? 'variant'}`);
      else if (e.type === 'alert.vip') setToast('✨ VIP order in progress (GHS 1,000+)');
      else if (e.type === 'alert.security') setToast('🛡 Suspicious webhook rejected');
    });
    return off;
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-52 shrink-0 border-r border-sand/40 bg-white/40 px-4 py-6 md:block">
        <Link href="/orders" className="font-serif text-lg text-indigo">R&amp;D Studio</Link>
        <nav className="mt-8 space-y-1 text-sm">
          {NAV.filter((n) => !n.ownerOnly || user.role === 'owner').map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`block rounded px-3 py-2 ${
                pathname.startsWith(n.href) ? 'bg-indigo/10 font-medium text-indigo' : 'text-charcoal/70 hover:bg-sand/20'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-6 left-4 w-44 text-xs text-charcoal/50">
          <p>{user.name} · {user.role}</p>
          <button
            onClick={() => {
              clearAuth();
              router.replace('/login');
            }}
            className="mt-1 underline"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="relative flex-1 px-5 py-6 md:px-8">
        {/* mobile nav strip */}
        <nav className="mb-4 flex gap-4 overflow-x-auto text-sm md:hidden">
          {NAV.filter((n) => !n.ownerOnly || user.role === 'owner').map((n) => (
            <Link key={n.href} href={n.href} className={pathname.startsWith(n.href) ? 'text-indigo underline' : 'text-charcoal/60'}>
              {n.label}
            </Link>
          ))}
        </nav>
        {children}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded border-l-4 border-sand bg-white px-4 py-3 text-sm shadow-lg">
            {toast}
          </div>
        )}
      </main>
    </div>
  );
}
