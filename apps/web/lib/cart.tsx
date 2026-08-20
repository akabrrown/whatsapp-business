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

  // Restore session + display metadata after hydration.
  useEffect(() => {
    let sid = localStorage.getItem('rd-session') ?? '';
    if (!sid) {
      sid = newSessionId();
      localStorage.setItem('rd-session', sid);
    }
    setSessionId(sid);
    const meta = JSON.parse(localStorage.getItem('rd-cart-meta') ?? '{}') as Record<string, Meta>;
    fetch(`${API}/api/cart/${sid}`)
      .then((r) => r.json())
      .then((r: { cart?: { items?: { variantId: string; qty: number }[] } }) => {
        const items = r.cart?.items ?? [];
        setLines(
          items
            .filter((i) => meta[i.variantId])
            .map((i) => ({ variantId: i.variantId, qty: i.qty, ...meta[i.variantId] })),
        );
      })
      .catch(() => setLines([]));
  }, []);

  const persistMeta = useCallback((next: CartLine[]) => {
    const meta: Record<string, Meta> = {};
    for (const l of next) meta[l.variantId] = { name: l.name, slug: l.slug, size: l.size, color: l.color, priceP: l.priceP, image: l.image, maxQty: l.maxQty };
    localStorage.setItem('rd-cart-meta', JSON.stringify(meta));
  }, []);

  const applyServerCart = useCallback(
    (items: { variantId: string; qty: number }[], prev: CartLine[]) => {
      const next = items
        .map((i) => {
          const known = prev.find((p) => p.variantId === i.variantId);
          return known ? { ...known, qty: i.qty } : null;
        })
        .filter((l): l is CartLine => l !== null);
      setLines(next);
      persistMeta(next);
    },
    [persistMeta],
  );

  const add = useCallback<CartContextValue['add']>(
    async (variantId, qty, meta) => {
      if (!sessionId) return { ok: false, message: 'Cart is still warming up: try again in a second.' };
      
      // Optimistic UI update
      const existingLine = lines.find((l) => l.variantId === variantId);
      const nextLines = existingLine
        ? lines.map((l) => (l.variantId === variantId ? { ...l, qty: l.qty + qty } : l))
        : [...lines, { variantId, qty, ...meta }];
        
      setLines(nextLines);
      persistMeta(nextLines);

      try {
        const res = await fetch(`${API}/api/cart/${sessionId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantId, qty }),
        });
        const body = (await res.json()) as { ok: boolean; cart?: { items: { variantId: string; qty: number }[] }; message?: string };
        
        if (!res.ok || !body.ok) {
          // Revert optimistic update
          setLines(lines);
          persistMeta(lines);
          return { ok: false, message: body.message ?? 'Sorry, this just sold out' };
        }
        
        applyServerCart(body.cart?.items ?? [], nextLines);
        return { ok: true };
      } catch (err) {
        // Revert on network error
        setLines(lines);
        persistMeta(lines);
        return { ok: false, message: 'Network error, please try again' };
      }
    },
    [sessionId, lines, applyServerCart, persistMeta],
  );

  const setQty = useCallback<CartContextValue['setQty']>(
    async (variantId, qty) => {
      // Optimistic UI update
      const prevLines = lines;
      const nextLines = qty === 0 
        ? lines.filter(l => l.variantId !== variantId)
        : lines.map(l => l.variantId === variantId ? { ...l, qty } : l);
      
      setLines(nextLines);

      try {
        const res = await fetch(`${API}/api/cart/${sessionId}/items`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantId, qty }),
        });
        const body = (await res.json()) as { cart?: { items: { variantId: string; qty: number }[] } };
        applyServerCart(body.cart?.items ?? [], nextLines);
      } catch (e) {
        // Revert on error
        setLines(prevLines);
      }
    },
    [sessionId, lines, applyServerCart],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotalP: lines.reduce((s, l) => s + l.priceP * l.qty, 0),
      drawerOpen,
      setDrawerOpen,
      add,
      setQty,
      sessionId,
    }),
    [lines, drawerOpen, add, setQty, sessionId],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart outside CartProvider');
  return ctx;
}

export { formatGHS };
