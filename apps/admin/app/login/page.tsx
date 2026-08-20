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
  
  // 2FA state
  const [step, setStep] = useState<1 | 2>(1);
  const [tempToken, setTempToken] = useState('');
  const [code, setCode] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (step === 1) {
        const r = await apiFetch<{ token?: string; user?: any; require2fa?: boolean; tempToken?: string }>('/api/admin/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (r.require2fa && r.tempToken) {
          setTempToken(r.tempToken);
          setStep(2);
        } else if (r.token && r.user) {
          setAuth(r.token, r.user);
          router.push('/orders');
        }
      } else {
        const r = await apiFetch<{ token: string; user: any }>('/api/admin/login/verify-2fa', {
          method: 'POST',
          body: JSON.stringify({ tempToken, code }),
        });
        setAuth(r.token, r.user);
        router.push('/orders');
      }
    } catch (err) {
      setError(err instanceof Error && err.message.includes('invalid') ? 'Wrong credentials or code.' : (err as Error).message);
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
          The studio behind<br />TOBI <span className="text-rose">CLOTHINGS</span>.
        </p>
        <p className="mt-4 max-w-sm text-sm text-cream/70">
          Orders, chats, stock and numbers: everything Tobi needs to run the label, in one calm place.
        </p>
      </div>
      <div className="flex items-center justify-center px-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h1 className="font-serif text-2xl text-indigo">{step === 1 ? 'Sign in' : 'Two-Factor Authentication'}</h1>
          
          {step === 1 ? (
            <>
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
            </>
          ) : (
            <>
              <p className="mt-4 text-sm text-charcoal/70">Enter the 6-digit code from your authenticator app.</p>
              <label className="mt-5 block text-sm text-charcoal/70">
                Authenticator Code
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoFocus
                  className="mt-1 w-full border-b border-charcoal/30 bg-transparent py-2 text-xl tracking-[0.5em] outline-none focus:border-indigo"
                />
              </label>
            </>
          )}

          {error && <p className="mt-4 text-sm text-rose">{error}</p>}
          
          <button
            type="submit"
            disabled={busy}
            className="mt-8 w-full rounded bg-indigo px-6 py-3 text-sm font-medium text-cream hover:bg-indigo-deep transition-colors"
          >
            {busy ? 'Verifying…' : step === 1 ? 'Continue' : 'Verify & Sign in'}
          </button>

          {step === 2 && (
            <button
              type="button"
              onClick={() => { setStep(1); setCode(''); setError(''); }}
              className="mt-4 w-full text-center text-sm text-charcoal/50 hover:text-indigo"
            >
              Back to login
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
