// Product detail purchase panel — tactile size/color selectors, restrained
// stock label, denim CTA + quiet WhatsApp sizing touchpoint (ux.md §3.3).
'use client';
import { useMemo, useState } from 'react';
import { formatGHS } from '@rose/shared';
import type { CatalogProduct } from '@/lib/api';
import { AddToBag } from './AddToBag';

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '233200000000';

export function VariantPicker({ product }: { product: CatalogProduct }) {
  const sizes = useMemo(() => [...new Set(product.variants.map((v) => v.size))].filter(Boolean) as string[], [product]);
  const colors = useMemo(() => [...new Set(product.variants.map((v) => v.color))].filter(Boolean) as string[], [product]);
  const [size, setSize] = useState<string | null>(sizes[0] ?? null);
  const [color, setColor] = useState<string | null>(colors[0] ?? null);

  const selected =
    product.variants.find((v) => (sizes.length ? v.size === size : true) && (colors.length ? v.color === color : true)) ??
    product.variants.find((v) => v.available > 0);

  const price = selected?.priceP ?? product.minPriceP;
  const available = selected?.available ?? 0;

  return (
    <div className="space-y-6">
      <p className="headline text-2xl">{formatGHS(price)}</p>

      {sizes.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-charcoal/50">Size</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const v = product.variants.find((x) => x.size === s);
              const out = (v?.available ?? 0) <= 0;
              return (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`h-10 w-12 border text-sm ${
                    size === s ? 'border-indigo bg-indigo text-cream' : 'border-charcoal/30 text-charcoal'
                  } ${out ? 'text-charcoal/30 line-through' : ''}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {colors.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-charcoal/50">Colour</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`border px-3 py-1.5 text-sm ${color === c ? 'border-indigo bg-indigo/10 text-indigo' : 'border-charcoal/30'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {available > 0 && available <= 3 && (
        <p className="inline-block bg-sand/30 px-2 py-1 text-xs text-charcoal/80">Only {available} left in this one</p>
      )}
      {available === 0 && (
        <p className="inline-block bg-charcoal/80 px-2 py-1 text-xs text-cream">Sold out — chat to pre-order</p>
      )}

      {selected && <AddToBag product={product} variantId={selected.id} />}

      <a
        href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hi! Question about sizing for ${product.name} 🙈`)}`}
        target="_blank"
        rel="noreferrer"
        className="block text-sm text-charcoal/60 underline decoration-charcoal/30 hover:text-indigo"
      >
        Questions about sizing? Chat with us
      </a>
    </div>
  );
}
