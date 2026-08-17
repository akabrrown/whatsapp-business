'use client';
// Customer 360 (§3.13): profile + tags, order history, conversation threads.
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { StatusPill } from '@/components/StatusPill';
import { ChatBubbles, type ChatMessage } from '@/components/ChatBubbles';
import { formatGHS } from '@rose/shared';

interface CustomerDetail {
  id: string;
  phone: string;
  name: string | null;
  tags: string;
  totalOrders: number;
  totalSpentP: number;
  marketingOptOut: boolean;
  lastOrderAt: string | null;
  createdAt: string;
  orders: { id: string; number: string; status: string; totalP: number; createdAt: string; items: { qty: number }[] }[];
  conversations: { id: string; status: string; createdAt: string; messages: ChatMessage[] }[];
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ customer: CustomerDetail }>(`/api/admin/customers/${id}`)
      .then((r) => setCustomer(r.customer))
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (!customer) return <p className="text-charcoal/50">{error || 'Loading customer…'}</p>;

  let tags: string[] = [];
  try {
    tags = JSON.parse(customer.tags) as string[];
  } catch {
    /* ignore */
  }

  return (
    <div>
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm text-charcoal/50 underline">
        <ChevronLeft size={14} aria-hidden /> back
      </button>
      {error && <p className="mb-4 text-sm text-rose">{error}</p>}

      <div className="mb-6 flex flex-wrap items-baseline gap-3">
        <h1 className="font-serif text-2xl text-indigo">{customer.name ?? customer.phone}</h1>
        <span className="text-sm text-charcoal/50">{customer.phone}</span>
        {tags.map((t) => (
          <span key={t} className="bg-sand/40 px-2 py-0.5 text-xs">{t.replace(/_/g, ' ')}</span>
        ))}
        {customer.marketingOptOut && <span className="bg-rose/20 px-2 py-0.5 text-xs">marketing opted out</span>}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Summary */}
          <section className="grid grid-cols-3 gap-3 text-center">
            {[
              ['Orders', String(customer.totalOrders)],
              ['Lifetime value', formatGHS(customer.totalSpentP)],
              ['Last order', customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString() : '—'],
            ].map(([label, value]) => (
              <div key={label} className="rounded border border-sand/30 bg-white/50 px-3 py-4">
                <p className="text-[10px] uppercase tracking-wide text-charcoal/50">{label}</p>
                <p className="mt-1 text-sm font-medium text-charcoal">{value}</p>
              </div>
            ))}
          </section>

          {/* Order history */}
          <section>
            <p className="mb-2 text-xs uppercase tracking-wide text-charcoal/50">Order history</p>
            <ul className="divide-y divide-sand/20 rounded border border-sand/30 bg-white/50 text-sm">
              {customer.orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <Link href={`/orders/${o.id}`} className="font-medium text-indigo hover:underline">{o.number}</Link>
                    <p className="text-xs text-charcoal/40">
                      {new Date(o.createdAt).toLocaleDateString()} · {o.items.reduce((s, i) => s + i.qty, 0)} item(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{formatGHS(o.totalP)}</span>
                    <StatusPill status={o.status} />
                  </div>
                </li>
              ))}
              {customer.orders.length === 0 && <li className="px-4 py-6 text-charcoal/50">No orders yet.</li>}
            </ul>
          </section>
        </div>

        {/* Conversations */}
        <section>
          <p className="mb-2 text-xs uppercase tracking-wide text-charcoal/50">Conversations</p>
          {customer.conversations.length === 0 && (
            <p className="rounded border border-sand/30 bg-white/50 px-4 py-6 text-sm text-charcoal/50">No WhatsApp conversations yet.</p>
          )}
          <div className="space-y-4">
            {customer.conversations.map((c) => (
              <div key={c.id} className="rounded border border-sand/30 bg-white/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs text-charcoal/50">Started {new Date(c.createdAt).toLocaleString()}</span>
                  <StatusPill status={c.status} />
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <ChatBubbles messages={c.messages} />
                </div>
                <Link href="/inbox" className="mt-3 inline-flex items-center gap-1 text-xs text-indigo underline">
                  Open in inbox <ArrowRight size={12} aria-hidden />
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
