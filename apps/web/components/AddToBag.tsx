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
  image,
}: {
  product: CatalogProduct;
  variantId?: string;
  compact?: boolean;
  image?: string;
}) {
  const { add } = useCart();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const target = variantId
    ? product.variants.find((v) => v.id === variantId)
    : product.variants.find((v) => v.available > 0);

  if (!target || target.available <= 0) return null;

  // Resolve matching image for this variant
  const variantColor = target.color?.trim().toLowerCase();
  const colorMatchImage = variantColor
    ? product.imageDetails?.find((img) => img.color?.trim().toLowerCase() === variantColor)?.url
    : undefined;

  const resolvedImage =
    image ||
    colorMatchImage ||
    (target.color
      ? product.images[
          [...new Set(product.variants.map((v) => v.color))].indexOf(target.color)
        ]
      : undefined) ||
    product.images[0] ||
    '';

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
            image: resolvedImage,
            maxQty: target.available,
          });
          setBusy(false);
          if (!res.ok) setError(res.message ?? 'Sorry, this just sold out');
        }}
        className={
          compact
            ? 'flex items-center justify-center gap-1 rounded-full border border-indigo/40 px-3 py-1.5 text-xs font-semibold text-indigo hover:bg-indigo hover:text-cream transition-colors min-h-[36px]'
            : 'flex w-full items-center justify-center gap-2 rounded-xl bg-indigo px-6 py-3.5 text-sm font-semibold text-cream hover:bg-indigo-deep transition-colors shadow-xs min-h-[44px]'
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
