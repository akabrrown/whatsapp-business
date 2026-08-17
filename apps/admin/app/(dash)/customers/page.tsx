'use client';
// Customers CRM (§3.13, §9.3): lifetime-value ordering, sand tag chips,
// opt-out respected at a glance (§16.5).
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { formatGHS } from '@rose/shared';

interface CustomerRow {
  id: string;
  phone: string;
  name: string | null;
  tags: string; // JSON string[]
  totalOrders: number;
  totalSpentP: number;
  marketingOptOut: boolean;
  lastOrderAt: string | null;
}

function parseTags(raw: string): string[] {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const r = await apiFetch<{ customers: CustomerRow[] }>('/api/admin/customers');
    setCustomers(r.customers);
  }, []);

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, [load]);

  return (
    <div>
      <h1 className="mb-5 font-serif text-2xl text-indigo">Customers</h1>
      {error && <p className="mb-4 text-sm text-rose">{error}</p>}

      <div className="overflow-x-auto rounded border border-sand/30 bg-white/50">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-sand/30 text-left text-xs uppercase tracking-wide text-charcoal/50">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Lifetime value</th>
              <th className="px-4 py-3">Last order</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-sand/20 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/customers/${c.id}`} className="font-medium text-indigo hover:underline">
                    {c.name ?? c.phone}
                  </Link>
                  <p className="text-xs text-charcoal/40">{c.phone}</p>
                  {c.marketingOptOut && <p className="text-[10px] text-charcoal/50">marketing opted out (§16.5)</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {parseTags(c.tags).map((t) => (
                      <span key={t} className="bg-sand/40 px-2 py-0.5 text-[10px] text-charcoal">{t.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">{c.totalOrders}</td>
                <td className="px-4 py-3">{formatGHS(c.totalSpentP)}</td>
                <td className="px-4 py-3 text-charcoal/60">{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-charcoal/50">No customers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
