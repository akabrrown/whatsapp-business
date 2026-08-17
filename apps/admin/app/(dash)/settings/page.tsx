'use client';
// Settings (owner-only nav) — delivery-zone fees (§7, §11.4), staff
// management (§11.6), manual retention tick (§16).
import { useCallback, useEffect, useState } from 'react';
import { MapPin, RefreshCw, UserPlus } from 'lucide-react';
import { apiFetch, getUser } from '@/lib/api';
import { formatGHS } from '@rose/shared';

interface Zone {
  id: string;
  name: string;
  city: string;
  feeP: number;
}

interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [fees, setFees] = useState<Record<string, string>>({});
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [newStaff, setNewStaff] = useState({ email: '', name: '', password: '', role: 'staff' });
  const [retentionResult, setRetentionResult] = useState('');
  const [error, setError] = useState('');
  const isOwner = getUser()?.role === 'owner';

  const loadZones = useCallback(async () => {
    const r = await apiFetch<{ zones: Zone[] }>('/api/admin/zones');
    setZones(r.zones);
  }, []);

  const loadStaff = useCallback(async () => {
    if (!isOwner) return;
    const r = await apiFetch<{ staff: StaffUser[] }>('/api/admin/staff');
    setStaff(r.staff);
  }, [isOwner]);

  useEffect(() => {
    loadZones().catch((e: Error) => setError(e.message));
    loadStaff().catch((e: Error) => setError(e.message));
  }, [loadZones, loadStaff]);

  const saveFee = async (zone: Zone) => {
    const ghs = Number(fees[zone.id]);
    if (Number.isNaN(ghs) || ghs < 0) return;
    setError('');
    try {
      await apiFetch(`/api/admin/zones/${zone.id}`, { method: 'PATCH', body: JSON.stringify({ feeP: Math.round(ghs * 100) }) });
      setFees((f) => ({ ...f, [zone.id]: '' }));
      await loadZones();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const addStaff = async () => {
    if (!newStaff.email || !newStaff.password) return;
    setError('');
    try {
      await apiFetch('/api/admin/staff', { method: 'POST', body: JSON.stringify(newStaff) });
      setNewStaff({ email: '', name: '', password: '', role: 'staff' });
      await loadStaff();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const runRetention = async () => {
    setError('');
    try {
      const r = await apiFetch<{ result: unknown }>('/api/admin/retention/tick', { method: 'POST' });
      setRetentionResult(JSON.stringify(r.result));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <h1 className="mb-5 font-serif text-2xl text-indigo">Settings</h1>
      {error && <p className="mb-4 text-sm text-rose">{error}</p>}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Delivery zones */}
        <section>
          <p className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-charcoal/50">
            <MapPin size={13} aria-hidden /> Delivery zones &amp; fees
          </p>
          <p className="mb-3 text-xs text-charcoal/50">New fees apply to new orders only — existing orders keep their quoted fee (§11.4).</p>
          <ul className="divide-y divide-sand/20 rounded border border-sand/30 bg-white/50 text-sm">
            {zones.map((z) => (
              <li key={z.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <p className="font-medium text-charcoal">{z.name}</p>
                  <p className="text-xs text-charcoal/40">{z.city} · current fee {formatGHS(z.feeP)}</p>
                </div>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={fees[z.id] ?? ''}
                  onChange={(e) => setFees((f) => ({ ...f, [z.id]: e.target.value }))}
                  placeholder="new GHS"
                  className="w-24 border-b border-charcoal/30 bg-transparent px-1 py-0.5 text-sm outline-none focus:border-indigo"
                />
                <button onClick={() => saveFee(z)} className="text-xs text-indigo underline">Save</button>
              </li>
            ))}
            {zones.length === 0 && <li className="px-4 py-6 text-charcoal/50">No zones configured.</li>}
          </ul>

          {/* Retention */}
          <div className="mt-6 rounded border border-sand/30 bg-white/50 p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-charcoal/50">Retention engine (§16)</p>
            <p className="mb-3 text-xs text-charcoal/60">Runs automatically on schedule; trigger a manual tick for testing.</p>
            <button onClick={runRetention} className="flex items-center gap-1.5 rounded border border-charcoal/30 px-3 py-1.5 text-xs hover:border-indigo hover:text-indigo">
              <RefreshCw size={12} aria-hidden /> Run retention tick
            </button>
            {retentionResult && <pre className="mt-3 max-h-32 overflow-auto bg-cream p-2 text-[10px] text-charcoal/70">{retentionResult}</pre>}
          </div>
        </section>

        {/* Staff (owner only) */}
        <section>
          <p className="mb-3 text-xs uppercase tracking-wide text-charcoal/50">Staff accounts (§11.6)</p>
          {!isOwner && <p className="text-sm text-charcoal/50">Only the owner can manage staff.</p>}
          {isOwner && (
            <>
              <ul className="divide-y divide-sand/20 rounded border border-sand/30 bg-white/50 text-sm">
                {staff.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-charcoal">{s.name}</p>
                      <p className="text-xs text-charcoal/40">{s.email}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] ${s.role === 'owner' ? 'bg-indigo/10 text-indigo' : 'bg-sand/40 text-charcoal'}`}>
                      {s.role}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded border border-sand/30 bg-white/50 p-4">
                <p className="mb-3 text-xs uppercase tracking-wide text-charcoal/50">Add staff member</p>
                <div className="grid gap-2">
                  <input value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="Name" className="border-b border-charcoal/30 bg-transparent px-1 py-1 text-sm outline-none focus:border-indigo" />
                  <input value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} placeholder="Email" className="border-b border-charcoal/30 bg-transparent px-1 py-1 text-sm outline-none focus:border-indigo" />
                  <input type="password" value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} placeholder="Password" className="border-b border-charcoal/30 bg-transparent px-1 py-1 text-sm outline-none focus:border-indigo" />
                  <div className="flex gap-4 text-sm">
                    {['staff', 'owner'].map((r) => (
                      <label key={r} className="flex items-center gap-1 text-charcoal/70">
                        <input type="radio" checked={newStaff.role === r} onChange={() => setNewStaff({ ...newStaff, role: r })} />
                        {r}
                      </label>
                    ))}
                  </div>
                  <button onClick={addStaff} className="mt-2 flex w-fit items-center gap-1.5 rounded bg-indigo px-4 py-2 text-sm text-cream hover:bg-indigo-deep">
                    <UserPlus size={14} aria-hidden /> Create account
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
