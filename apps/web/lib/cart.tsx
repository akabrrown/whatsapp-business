'use client';
// Cart context: local display metadata + server session cart as source of
// truth at checkout (§4.5). Session id survives refreshes via localStorage.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatGHS } from '@rose/shared';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface CartLine {
  variantId: string;
  qty: number;
  name: string;
  slug: string;
  size: string | null;
  color: string | null;
  priceP: number;
  image?: string;
  maxQty?: number;
}

interface Meta {
  name: string;
  slug: string;
  size: string | null;
  color: string | null;
  priceP: number;
  image?: string;
  maxQty?: number;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotalP: number;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  add: (variantId: string, qty: number, meta: Meta) => Promise<{ ok: boolean; message?: string }>;
  setQty: (variantId: string, qty: number) => Promise<void>;
  clear: () => Promise<void>;
  sessionId: string;
}

const CartContext = createContext<CartContextValue | null>(null);

function newSessionId() {
  return `web-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState('');
  const [lines, setLines] = useState<CartLine[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore session + full cart items immediately from localStorage after hydration.
  useEffect(() => {
    let sid = localStorage.getItem('rd-session') ?? '';
    if (!sid) {
      sid = newSessionId();
      localStorage.setItem('rd-session', sid);
    }
    setSessionId(sid);

    try {
      const savedLines = localStorage.getItem('rd-cart-lines');
      if (savedLines) {
        const parsed = JSON.parse(savedLines) as CartLine[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLines(parsed);
        }
      }
    } catch {
      /* ignore parse errors */
    }
    setHydrated(true);

    const meta = JSON.parse(localStorage.getItem('rd-cart-meta') ?? '{}') as Record<string, Meta>;
    fetch(`${API}/api/cart/${sid}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((r: { cart?: { items?: { variantId: string; qty: number }[] } } | null) => {
        if (!r) return;
        const items = r.cart?.items ?? [];
        if (items.length > 0) {
          setLines((prev) => {
            const merged = items
              .filter((i) => meta[i.variantId] || prev.find((p) => p.variantId === i.variantId))
              .map((i) => {
                const existing = prev.find((p) => p.variantId === i.variantId);
                const info = meta[i.variantId] || existing!;
                return { variantId: i.variantId, qty: i.qty, ...info };
              });
            localStorage.setItem('rd-cart-lines', JSON.stringify(merged));
            return merged;
          });
        }
      })
      .catch(() => {
        /* keep local lines if server cart fetch fails */
      });
  }, []);

  const persistCart = useCallback((next: CartLine[]) => {
    try {
      localStorage.setItem('rd-cart-lines', JSON.stringify(next));
      const meta: Record<string, Meta> = {};
      for (const l of next) {
        meta[l.variantId] = {
          name: l.name,
          slug: l.slug,
          size: l.size,
          color: l.color,
          priceP: l.priceP,
          image: l.image,
          maxQty: l.maxQty,
        };
      }
      localStorage.setItem('rd-cart-meta', JSON.stringify(meta));
    } catch {
      /* ignore storage quota errors */
    }
  }, []);

  const applyServerCart = useCallback(
    (items: { variantId: string; qty: number }[], prev: CartLine[]) => {
      if (items.length === 0 && prev.length > 0) {
        // Keep local cart if server returns empty unexpectedly
        return;
      }
      const next = items
        .map((i) => {
          const known = prev.find((p) => p.variantId === i.variantId);
          return known ? { ...known, qty: i.qty } : null;
        })
        .filter((l): l is CartLine => l !== null);
      if (next.length > 0) {
        setLines(next);
        persistCart(next);
      }
    },
    [persistCart],
  );

  const add = useCallback<CartContextValue['add']>(
    async (variantId, qty, meta) => {
      let currentSid = sessionId;
      if (!currentSid) {
        currentSid = localStorage.getItem('rd-session') || newSessionId();
        localStorage.setItem('rd-session', currentSid);
        setSessionId(currentSid);
      }

      // Optimistic UI update + instant localStorage save
      let nextLines: CartLine[] = [];
      setLines((prev) => {
        const existingLine = prev.find((l) => l.variantId === variantId);
        nextLines = existingLine
          ? prev.map((l) => (l.variantId === variantId ? { ...l, qty: l.qty + qty } : l))
          : [...prev, { variantId, qty, ...meta }];
        persistCart(nextLines);
        return nextLines;
      });

      try {
        const res = await fetch(`${API}/api/cart/${currentSid}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantId, qty }),
        });
        const body = (await res.json()) as { ok: boolean; cart?: { items: { variantId: string; qty: number }[] }; message?: string };

        if (!res.ok || !body.ok) {
          return { ok: false, message: body.message ?? 'Sorry, this just sold out' };
        }

        if (body.cart?.items) {
          applyServerCart(body.cart.items, nextLines);
        }
        return { ok: true };
      } catch (err) {
        // Kept in local storage even if offline
        return { ok: true };
      }
    },
    [sessionId, applyServerCart, persistCart],
  );

  const setQty = useCallback<CartContextValue['setQty']>(
    async (variantId, qty) => {
      const currentSid = sessionId || localStorage.getItem('rd-session') || '';

      // Optimistic UI update
      setLines((prev) => {
        const nextLines = qty <= 0
          ? prev.filter((l) => l.variantId !== variantId)
          : prev.map((l) => (l.variantId === variantId ? { ...l, qty } : l));
        persistCart(nextLines);
        return nextLines;
      });

      if (!currentSid) return;

      try {
        const res = await fetch(`${API}/api/cart/${currentSid}/items`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantId, qty }),
        });
        const body = (await res.json()) as { cart?: { items: { variantId: string; qty: number }[] } };
        if (body.cart?.items) {
          applyServerCart(body.cart.items, lines);
        }
      } catch (e) {
        /* offline update stays in localStorage */
      }
    },
    [sessionId, lines, applyServerCart, persistCart],
  );

  const clear = useCallback<CartContextValue['clear']>(async () => {
    setLines([]);
    try {
      localStorage.removeItem('rd-cart-lines');
      localStorage.removeItem('rd-cart-meta');
    } catch {
      /* ignore */
    }
    const currentSid = sessionId || localStorage.getItem('rd-session') || '';
    if (currentSid) {
      try {
        await fetch(`${API}/api/cart/${currentSid}`, { method: 'DELETE' });
      } catch {
        /* ignore */
      }
    }
    const nextSid = newSessionId();
    setSessionId(nextSid);
    try {
      localStorage.setItem('rd-session', nextSid);
    } catch {
      /* ignore */
    }
  }, [sessionId]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotalP: lines.reduce((s, l) => s + l.priceP * l.qty, 0),
      drawerOpen,
      setDrawerOpen,
      add,
      setQty,
      clear,
      sessionId,
    }),
    [lines, drawerOpen, add, setQty, clear, sessionId],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart outside CartProvider');
  return ctx;
}

export { formatGHS };
