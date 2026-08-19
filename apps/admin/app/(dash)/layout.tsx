'use client';
// Authenticated shell: sidebar nav, owner-only sections, live alert toasts.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  BarChart3,
  Boxes,
  ClipboardList,
  LogOut,
  MessageCircle,
  Package,
  Settings,
  Shield,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { clearAuth, getToken, getUser, subscribeAdminEvents } from '@/lib/api';

const NAV: { href: string; label: string; icon: LucideIcon; ownerOnly?: boolean }[] = [
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/inbox', label: 'Inbox', icon: MessageCircle },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings, ownerOnly: true },
];

export default function DashLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [toast, setToast] = useState<{ icon: ReactNode; text: string } | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setUser(getUser());
    const off = subscribeAdminEvents((e) => {
      const p = e.payload as Record<string, unknown> | undefined;
      if (e.type === 'inbox.alert')
        setToast({ icon: <MessageCircle size={15} aria-hidden />, text: `${p?.phone ?? 'Customer'} needs Tobi (${p?.reason ?? 'question'})` });
      else if (e.type === 'alert.low_stock')
        setToast({ icon: <Package size={15} aria-hidden />, text: `Low stock: ${p?.sku ?? 'variant'}` });
      else if (e.type === 'alert.vip')
        setToast({ icon: <Sparkles size={15} aria-hidden />, text: 'VIP order in progress (GHS 1,000+)' });
      else if (e.type === 'alert.security')
        setToast({ icon: <Shield size={15} aria-hidden />, text: 'Suspicious webhook rejected' });
    });
    return off;
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-52 shrink-0 border-r border-sand/40 bg-white/40 px-4 py-6 md:block">
        <Link href="/orders" className="font-serif text-lg text-indigo">TOBI Studio</Link>
        <nav className="mt-8 space-y-1 text-sm">
          {NAV.filter((n) => !n.ownerOnly || user.role === 'owner').map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2 rounded px-3 py-2 ${
                pathname.startsWith(n.href) ? 'bg-indigo/10 font-medium text-indigo' : 'text-charcoal/70 hover:bg-sand/20'
              }`}
            >
              <n.icon size={15} aria-hidden />
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
            className="mt-1 flex items-center gap-1 underline"
          >
            <LogOut size={12} aria-hidden /> Sign out
          </button>
        </div>
      </aside>
      <main className="relative flex-1 px-5 py-6 md:px-8">
        {/* mobile nav strip */}
        <nav className="mb-4 flex gap-4 overflow-x-auto text-sm md:hidden">
          {NAV.filter((n) => !n.ownerOnly || user.role === 'owner').map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex shrink-0 items-center gap-1 ${pathname.startsWith(n.href) ? 'text-indigo underline' : 'text-charcoal/60'}`}
            >
              <n.icon size={13} aria-hidden />
              {n.label}
            </Link>
          ))}
        </nav>
        {children}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-2 rounded border-l-4 border-sand bg-white px-4 py-3 text-sm shadow-lg">
            <span className="shrink-0 text-indigo">{toast.icon}</span>
            {toast.text}
          </div>
        )}
      </main>
    </div>
  );
}
