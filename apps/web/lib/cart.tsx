'use client';
// Cart context: local display metadata + server session cart as source of
// truth at checkout (§4.5). Session id survives refreshes via localStorage.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatGHS } from '@rose/shared';
import { getApiUrl } from './config';

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
  restoreBackup: () => void;
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
  const API = getApiUrl();

  // Helper to sync state to localStorage
  const persistCart = useCallback((next: CartLine[]) => {
    try {
      if (next.length === 0) {
        localStorage.removeItem('rd-cart-lines');
        localStorage.removeItem('rd-cart-meta');
        localStorage.removeItem('rd-cart-backup');
        return;
      }

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

  // Restore session + full cart items immediately from localStorage after hydration.
  useEffect(() => {
    let sid = localStorage.getItem('rd-session') ?? '';
    if (!sid) {
      sid = newSessionId();
      localStorage.setItem('rd-session', sid);
    }
    setSessionId(sid);

    let initialLines: CartLine[] = [];
    try {
      const savedLines = localStorage.getItem('rd-cart-lines');
      if (savedLines) {
        const parsed = JSON.parse(savedLines) as CartLine[];
        if (Array.isArray(parsed)) {
          initialLines = parsed.filter((l) => l && l.variantId && l.qty > 0);
          setLines(initialLines);
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
        if (!r?.cart) return;
        const serverItems = r.cart.items ?? [];
        
        // If server returns empty and local is empty, ensure clean state
        if (serverItems.length === 0) {
          if (initialLines.length === 0) {
            setLines([]);
            persistCart([]);
          }
          return;
        }

        // Server has items: merge with metadata
        setLines((prev) => {
          const merged: CartLine[] = [];
          for (const item of serverItems) {
            const existing = prev.find((p) => p.variantId === item.variantId);
            const m = meta[item.variantId] || existing;
            if (m && item.qty > 0) {
              merged.push({
                variantId: item.variantId,
                qty: item.qty,
                name: m.name,
                slug: m.slug,
                size: m.size,
                color: m.color,
                priceP: m.priceP,
                image: m.image,
                maxQty: m.maxQty,
              });
            }
          }
          persistCart(merged);
          return merged;
        });
      })
      .catch(() => {
        /* keep local lines if server cart fetch fails */
      });
  }, [persistCart]);

  const add = useCallback<CartContextValue['add']>(
    async (variantId, qty, meta) => {
      let currentSid = sessionId;
      if (!currentSid) {
        currentSid = localStorage.getItem('rd-session') || newSessionId();
        localStorage.setItem('rd-session', currentSid);
        setSessionId(currentSid);
      }

      // Optimistic local state update
      setLines((prev) => {
        const existing = prev.find((l) => l.variantId === variantId);
        let next: CartLine[];
        if (existing) {
          next = prev.map((l) =>
            l.variantId === variantId
              ? { ...l, qty: l.maxQty !== undefined ? Math.min(l.qty + qty, l.maxQty) : l.qty + qty }
              : l,
          );
        } else {
          next = [...prev, { variantId, qty, ...meta }];
        }
        persistCart(next);
        return next;
      });

      // Synchronize with backend
      try {
        const res = await fetch(`${API}/api/cart/${currentSid}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantId, qty }),
        });
        const body = (await res.json()) as { ok?: boolean; error?: string; message?: string; cart?: { items: { variantId: string; qty: number }[] } };
        if (!res.ok) {
          return { ok: false, message: body.message || body.error || 'Could not add item' };
        }
        return { ok: true };
      } catch (err) {
        // Kept in local storage even if offline
        return { ok: true };
      }
    },
    [sessionId, persistCart],
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
        await fetch(`${API}/api/cart/${currentSid}/items`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantId, qty: Math.max(0, qty) }),
        });
      } catch (e) {
        /* offline update stays in localStorage */
      }
    },
    [sessionId, persistCart],
  );

  const clear = useCallback<CartContextValue['clear']>(async () => {
    setLines([]);
    try {
      localStorage.removeItem('rd-cart-lines');
      localStorage.removeItem('rd-cart-meta');
      localStorage.removeItem('rd-cart-backup');
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

  const restoreBackup = useCallback(() => {
    try {
      const raw = localStorage.getItem('rd-cart-backup') || sessionStorage.getItem('rd-cart-backup');
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLines(parsed);
          persistCart(parsed);
          setDrawerOpen(true);
        }
      }
    } catch {
      /* ignore */
    }
  }, [persistCart]);

  const count = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);
  const subtotalP = useMemo(() => lines.reduce((s, l) => s + l.priceP * l.qty, 0), [lines]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count,
      subtotalP,
      drawerOpen,
      setDrawerOpen,
      add,
      setQty,
      clear,
      restoreBackup,
      sessionId,
    }),
    [lines, count, subtotalP, drawerOpen, add, setQty, clear, restoreBackup, sessionId],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
