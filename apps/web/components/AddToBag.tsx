'use client';
// Add-to-bag button: picks the first in-stock variant (compact) or a chosen
// variant (PDP). Reports sold-out races with the server's friendly message (§4.2).
import { useState } from 'react';
import { Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart';
import type { CatalogProduct } from '@/lib/api';

export function AddToBag({
  product,
  variantId,
  compact = false,
}: {
  product: CatalogProduct;
  variantId?: string;
  compact?: boolean;
}) {
  const { add } = useCart();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const target = variantId
    ? product.variants.find((v) => v.id === variantId)
    : product.variants.find((v) => v.available > 0);

  if (!target || target.available <= 0) return null;

  return (
    <div className={compact ? '' : 'w-full'}>
      <button
        disabled={busy}
        onClick={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          const res = await add(target.id, 1, {
            name: product.name,
            slug: product.slug,
            size: target.size,
            color: target.color,
            priceP: target.priceP,
            image: product.images[0],
          });
          setBusy(false);
          if (!res.ok) setError(res.message ?? 'Sorry, this just sold out');
        }}
        className={
          compact
            ? 'flex items-center gap-1 border border-indigo/40 px-2.5 py-1 text-xs text-indigo hover:bg-indigo hover:text-cream'
            : 'flex w-full items-center justify-center gap-2 rounded bg-indigo px-6 py-3 text-sm font-medium text-cream hover:bg-indigo-deep'
        }
      >
        {busy ? (
          'Adding…'
        ) : compact ? (
          (<><Plus size={12} aria-hidden /> Add</>)
        ) : (
          (<><ShoppingBag size={16} aria-hidden /> Add to Selection</>)
        )}
      </button>
      {error && <p className="mt-2 text-xs text-rose">{error}</p>}
    </div>
  );
}
