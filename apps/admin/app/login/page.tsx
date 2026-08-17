'use client';
// Split-screen login (ux.md §3.7): brand panel + minimal form.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, setAuth } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await apiFetch<{ token: string; user: { email: string; name: string; role: string } }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuth(r.token, r.user);
      router.push('/orders');
    } catch (err) {
      setError(err instanceof Error && err.message.includes('invalid') ? 'Wrong email or password.' : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-end bg-indigo p-12 md:flex">
        <div className="absolute right-10 top-10 h-32 w-32 rounded-bl-[4rem] bg-rose/40" aria-hidden />
        <div className="absolute left-16 top-32 h-20 w-20 bg-sand/40" aria-hidden />
        <p className="font-serif text-4xl leading-snug text-cream">
          The studio behind<br />ROSE <span className="text-rose">&amp;</span> DENIM.
        </p>
        <p className="mt-4 max-w-sm text-sm text-cream/70">
          Orders, chats, stock and numbers: everything Kukua needs to run the label, in one calm place.
        </p>
      </div>
      <div className="flex items-center justify-center px-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h1 className="font-serif text-2xl text-indigo">Sign in</h1>
          <label className="mt-8 block text-sm text-charcoal/70">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full border-b border-charcoal/30 bg-transparent py-2 outline-none focus:border-indigo"
            />
          </label>
          <label className="mt-5 block text-sm text-charcoal/70">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full border-b border-charcoal/30 bg-transparent py-2 outline-none focus:border-indigo"
            />
          </label>
          {error && <p className="mt-4 text-sm text-rose">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-8 w-full rounded bg-indigo px-6 py-3 text-sm font-medium text-cream hover:bg-indigo-deep"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
