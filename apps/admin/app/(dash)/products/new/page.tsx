'use client';
// Add product (§11.1): visible on site + bot immediately on save.
// Uploads go through §14.6 validation; variants carry price in GHS.
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ImagePlus, Plus, Trash2, Upload } from 'lucide-react';
import { apiFetch, API } from '@/lib/api';

interface Category { id: string; name: string; slug: string }
interface VariantDraft { size: string; color: string; price: string; stock: string }

const emptyVariant = (): VariantDraft => ({ size: '', color: '', price: '', stock: '' });

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/categories`)
      .then((r) => r.json())
      .then((r: { categories: Category[] }) => {
        setCategories(r.categories);
        if (r.categories[0]) setCategoryId(r.categories[0].id);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const setNameAndSlug = (v: string) => {
    setName(v);
    if (!slugTouched) setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  const addImageFile = useCallback((file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) return setError('Images only');
    if (file.size > 5 * 1024 * 1024) return setError('Max 5MB per image');
    const reader = new FileReader();
    reader.onload = () => setImages((prev) => [...prev, String(reader.result)]);
    reader.readAsDataURL(file);
  }, []);

  const setVariant = (i: number, patch: Partial<VariantDraft>) =>
    setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  const submit = async () => {
    setError('');
    const filled = variants.filter((v) => v.price && v.stock);
    if (!name.trim()) return setError('Product name is required');
    if (!categoryId) return setError('Pick a category');
    if (filled.length === 0) return setError('Add at least one variant with price and stock');
    setSaving(true);
    try {
      await apiFetch('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slug: slug || undefined,
          description,
          categoryId,
          images,
          upload: images.length > 0 ? { contentType: 'image/upload', size: 1 } : undefined,
          variants: filled.map((v) => ({
            size: v.size || undefined,
            color: v.color || undefined,
            priceP: Math.round(Number(v.price) * 100),
            stockQuantity: Number(v.stock),
          })),
        }),
      });
      router.push('/inventory');
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const input = 'w-full border-b border-charcoal/30 bg-transparent px-1 py-1.5 text-sm outline-none focus:border-indigo';

  return (
    <div className="max-w-3xl">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm text-charcoal/50 underline">
        <ChevronLeft size={14} aria-hidden /> back to inventory
      </button>
      <h1 className="mb-6 font-serif text-2xl text-indigo">Add product</h1>
      {error && <p className="mb-4 text-sm text-rose">{error}</p>}

      <div className="space-y-6 rounded border border-sand/30 bg-white/50 p-6">
        {/* Basics */}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-charcoal/50">Name</span>
            <input value={name} onChange={(e) => setNameAndSlug(e.target.value)} className={input} placeholder="Osu Wide-Leg Denim" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-charcoal/50">Slug</span>
            <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} className={input} placeholder="auto-generated" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-charcoal/50">Category</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`${input} bg-cream`}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-charcoal/50">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded border border-charcoal/20 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-indigo" />
        </label>

        {/* Images */}
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-charcoal/50">Images</p>
          <div className="flex flex-wrap items-center gap-3">
            {images.map((src, i) => (
              <div key={i} className="relative h-20 w-16 overflow-hidden rounded border border-sand/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`upload ${i + 1}`} className="h-full w-full object-cover" />
                <button onClick={() => setImages(images.filter((_, j) => j !== i))} aria-label="Remove image" className="absolute right-0 top-0 bg-charcoal/60 p-0.5 text-cream">
                  <Trash2 size={12} aria-hidden />
                </button>
              </div>
            ))}
            <label className="flex h-20 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed border-charcoal/30 text-charcoal/50 hover:border-indigo hover:text-indigo">
              <Upload size={16} aria-hidden />
              <span className="text-[10px]">Upload</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && addImageFile(e.target.files[0])} />
            </label>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <ImagePlus size={14} className="text-charcoal/40" aria-hidden />
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="…or paste an image URL" className="flex-1 border-b border-charcoal/30 bg-transparent px-1 py-1 text-xs outline-none focus:border-indigo" />
            <button
              onClick={() => { if (imageUrl.trim()) { setImages([...images, imageUrl.trim()]); setImageUrl(''); } }}
              className="text-xs text-indigo underline"
            >
              Add
            </button>
          </div>
        </div>

        {/* Variants */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-charcoal/50">Variants</p>
            <button onClick={() => setVariants([...variants, emptyVariant()])} className="flex items-center gap-1 text-xs text-indigo underline">
              <Plus size={12} aria-hidden /> Add variant
            </button>
          </div>
          <div className="space-y-2">
            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-2 text-sm">
                <input value={v.size} onChange={(e) => setVariant(i, { size: e.target.value })} placeholder="Size (opt)" className={input} />
                <input value={v.color} onChange={(e) => setVariant(i, { color: e.target.value })} placeholder="Color (opt)" className={input} />
                <input type="number" min={0} step="0.5" value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} placeholder="Price GHS" className={input} />
                <input type="number" min={0} value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} placeholder="Stock" className={input} />
                <button
                  onClick={() => setVariants(variants.filter((_, j) => j !== i))}
                  disabled={variants.length === 1}
                  aria-label="Remove variant"
                  className="text-charcoal/40 hover:text-rose disabled:opacity-30"
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={submit}
          disabled={saving}
          className="w-full rounded bg-indigo px-4 py-2.5 text-sm text-cream hover:bg-indigo-deep disabled:opacity-50 md:w-fit md:px-8"
        >
          {saving ? 'Saving…' : 'Publish product'}
        </button>
        <p className="text-xs text-charcoal/50">Goes live on the website and the WhatsApp bot immediately (§11.1).</p>
      </div>
    </div>
  );
}
