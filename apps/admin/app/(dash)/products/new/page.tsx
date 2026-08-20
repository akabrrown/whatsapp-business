'use client';
// Add product (§11.1): visible on site + bot immediately on save.
// Uploads go through §14.6 validation; variants carry price in GHS.
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ImagePlus, Plus, Trash2, Upload } from 'lucide-react';
import { apiFetch, API } from '@/lib/api';
import React from 'react';

interface Category { id: string; name: string; slug: string; parentId?: string | null }
interface VariantDraft { size: string; color: string; price: string; stock: string }

const emptyVariant = (): VariantDraft => ({ size: '', color: '', price: '', stock: '' });

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [images, setImages] = useState<{ src: string; color?: string }[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const availableColors = useMemo(
    () => [...new Set(variants.map((v) => v.color.trim()).filter(Boolean))],
    [variants],
  );

  const loadCategories = () => {
    setLoadingCategories(true);
    apiFetch<{ categories?: Category[], error?: string }>(`/api/admin/categories`)
      .then(r => {
        if (r.categories) {
          const flat = r.categories;
          setCategories(flat);
          setCategoryId(prev => {
            if (prev) return prev;
            const firstMain = flat.find((c) => !c.parentId);
            return firstMain ? firstMain.id : '';
          });
        } else {
          setError(r.error || 'Failed to load categories');
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingCategories(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const setNameAndSlug = (v: string) => {
    setName(v);
    if (!slugTouched) setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  const addImageFile = useCallback((file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) return setError('Images only');
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX_SIZE = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setImages((prev) => [...prev, { src: canvas.toDataURL('image/jpeg', 0.95), color: '' }]);
        } else {
          setImages((prev) => [...prev, { src: String(e.target?.result), color: '' }]);
        }
      };
      img.src = String(e.target?.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const setImageColor = (index: number, color: string) => {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, color } : img)));
  };

  const setVariant = (i: number, patch: Partial<VariantDraft>) =>
    setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  const handleVariantBlur = (i: number, field: 'size' | 'color', val: string) => {
    if (!val.includes(',')) return;
    
    const parts = val.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length <= 1) return;
    
    setVariants((vs) => {
      const current = vs[i];
      const newVariants = [...vs];
      newVariants[i] = { ...current, [field]: parts[0] };
      const rowsToAdd = parts.slice(1).map(part => ({
        size: field === 'size' ? part : current.size,
        color: field === 'color' ? part : current.color,
        price: current.price,
        stock: ''
      }));
      newVariants.splice(i + 1, 0, ...rowsToAdd);
      return newVariants;
    });
  };

  const submit = async () => {
    setError('');
    const filled = variants.filter((v) => v.price && v.stock);
    if (!name.trim()) return setError('Product name is required');
    if (!categoryId) return setError('Pick a category');
    const expandedVariants = filled.map((v) => ({
      size: v.size?.trim() || undefined,
      color: v.color?.trim() || undefined,
      priceP: Math.round(Number(v.price) * 100),
      stockQuantity: Number(v.stock),
    }));

    if (expandedVariants.length === 0) return setError('Add at least one variant with price and stock');
    setSaving(true);
    try {
      await apiFetch('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slug: slug || undefined,
          description,
          categoryId,
          images: images.map(i => ({ url: i.src, color: i.color })),
          upload: images.length > 0 ? { contentType: 'image/upload', size: 1 } : undefined,
          variants: expandedVariants,
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
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-indigo">Add Product</h1>
        <Link href="/inventory" className="text-sm text-charcoal/60 hover:text-indigo">← Back to inventory</Link>
      </div>

      {error && <p className="mb-4 rounded bg-rose/10 px-3 py-2 text-sm text-rose">{error}</p>}

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-charcoal/50">Product Name</span>
            <input value={name} onChange={(e) => setNameAndSlug(e.target.value)} className={input} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-charcoal/50">Slug (URL path)</span>
            <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="auto-generated-from-name" className={input} />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {(() => {
            const mainCategories = categories.filter((c) => !c.parentId);
            const selectedCategory = categories.find((c) => c.id === categoryId);
            let currentMainId = ''; let currentSubId = ''; let currentTypeId = '';

            if (selectedCategory) {
              const parent = categories.find(c => c.id === selectedCategory.parentId);
              if (parent) {
                const grandParent = categories.find(c => c.id === parent.parentId);
                if (grandParent) { currentMainId = grandParent.id; currentSubId = parent.id; currentTypeId = selectedCategory.id; }
                else { currentMainId = parent.id; currentSubId = selectedCategory.id; }
              } else { currentMainId = selectedCategory.id; }
            }
            const availableSubs = currentMainId ? categories.filter((c) => c.parentId === currentMainId) : [];
            const availableTypes = currentSubId ? categories.filter((c) => c.parentId === currentSubId) : [];

            return (
              <>
                <label className="block text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-charcoal/50">Main</span>
                  </div>
                  <select value={currentMainId} onChange={(e) => setCategoryId(e.target.value)} disabled={loadingCategories} className={`${input} bg-cream`}>
                    <option value="" disabled>Select...</option>
                    {mainCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                {availableSubs.length > 0 && (
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs uppercase tracking-wide text-charcoal/50">Subcategory</span>
                    <select value={currentSubId} onChange={(e) => setCategoryId(e.target.value || currentMainId)} className={`${input} bg-cream`}>
                      <option value="">-- General --</option>
                      {availableSubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                )}
                {availableTypes.length > 0 && (
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs uppercase tracking-wide text-charcoal/50">Type</span>
                    <select value={currentTypeId} onChange={(e) => setCategoryId(e.target.value || currentSubId)} className={`${input} bg-cream`}>
                      <option value="">-- General --</option>
                      {availableTypes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                )}
              </>
            );
          })()}
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-charcoal/50">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded border border-charcoal/20 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-indigo" />
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-charcoal/50">Images & Color Assignment</p>
            {availableColors.length > 0 && (
              <span className="text-[11px] text-indigo">{availableColors.length} color variant{availableColors.length > 1 ? 's' : ''} detected</span>
            )}
          </div>

          <div className="flex flex-wrap items-start gap-3">
            {images.map((img, i) => (
              <div key={i} className="flex flex-col w-28 rounded-lg border border-sand/60 bg-cream p-1.5 shadow-sm space-y-1.5">
                <div className="relative h-28 w-full overflow-hidden rounded bg-sand/20">
                  <img src={img.src} alt={`upload ${i + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))} aria-label="Remove image" className="absolute right-1 top-1 rounded-full bg-charcoal/70 p-1 text-cream hover:bg-rose transition">
                    <Trash2 size={12} aria-hidden />
                  </button>
                </div>
                <label className="block">
                  <span className="text-[10px] text-charcoal/50 uppercase tracking-wider block mb-0.5 font-medium">Color:</span>
                  <select value={img.color || ''} onChange={(e) => setImageColor(i, e.target.value)} className="w-full text-xs rounded border border-sand/80 bg-white px-1 py-1 text-charcoal outline-none focus:border-indigo">
                    <option value="">All / General</option>
                    {availableColors.map((c: string) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </div>
            ))}

            <label className="flex h-36 w-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-charcoal/30 text-charcoal/50 hover:border-indigo hover:text-indigo transition">
              <Upload size={18} aria-hidden />
              <span className="text-xs font-medium">Upload</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && addImageFile(e.target.files[0])} />
            </label>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <ImagePlus size={14} className="text-charcoal/40" aria-hidden />
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="…or paste an image URL" className="flex-1 border-b border-charcoal/30 bg-transparent px-1 py-1 text-xs outline-none focus:border-indigo" />
            <button type="button" onClick={() => { if (imageUrl.trim()) { setImages([...images, { src: imageUrl.trim(), color: '' }]); setImageUrl(''); } }} className="text-xs text-indigo underline">Add</button>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-charcoal/50">Variants</p>
            <button
              type="button"
              onClick={() => setVariants([...variants, emptyVariant()])}
              className="flex items-center gap-1 text-xs text-indigo underline"
            >
              <Plus size={12} aria-hidden /> Add variant
            </button>
          </div>
          <div className="space-y-2">
            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-2 text-sm">
                <input value={v.size} onChange={(e) => setVariant(i, { size: e.target.value })} onBlur={(e) => handleVariantBlur(i, 'size', e.target.value)} placeholder="Size (opt)" className={input} />
                <input value={v.color} onChange={(e) => setVariant(i, { color: e.target.value })} onBlur={(e) => handleVariantBlur(i, 'color', e.target.value)} placeholder="Color (opt)" className={input} />
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
