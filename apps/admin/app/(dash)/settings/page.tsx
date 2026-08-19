'use client';
// Settings (owner-only nav): delivery-zone fees (§7, §11.4), staff
// management (§11.6), manual retention tick (§16), WhatsApp number, categories.
import { useCallback, useEffect, useState } from 'react';
import { MapPin, MessageCircle, RefreshCw, UserPlus, Tag, Plus, Trash2 } from 'lucide-react';
import { apiFetch, getUser } from '@/lib/api';
import { formatGHS } from '@rose/shared';

interface Zone {
  id: string;
  name: string;
  city: string;
  feeP: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  flagship: boolean;
  image: string;
  parentId: string | null;
  _count: { products: number };
}

interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [newZone, setNewZone] = useState({ name: '', city: 'Accra', fee: '' });
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', flagship: false, image: '', parentId: '' });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [newStaff, setNewStaff] = useState({ email: '', name: '', password: '', role: 'staff' });
  
  const [retentionResult, setRetentionResult] = useState('');
  const [error, setError] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappInput, setWhatsappInput] = useState('');
  const [whatsappSaved, setWhatsappSaved] = useState(false);
  
  const isOwner = getUser()?.role === 'owner';

  const loadZones = useCallback(async () => {
    const r = await apiFetch<{ zones: Zone[] }>('/api/admin/zones');
    setZones(r.zones);
  }, []);

  const loadCategories = useCallback(async () => {
    if (!isOwner) return;
    const r = await apiFetch<{ categories: Category[] }>('/api/admin/categories');
    setCategories(r.categories);
  }, [isOwner]);

  const loadStaff = useCallback(async () => {
    if (!isOwner) return;
    const r = await apiFetch<{ staff: StaffUser[] }>('/api/admin/staff');
    setStaff(r.staff);
  }, [isOwner]);

  const loadSettings = useCallback(async () => {
    if (!isOwner) return;
    const r = await apiFetch<{ settings: { whatsappNumber: string } }>('/api/admin/settings');
    setWhatsappNumber(r.settings.whatsappNumber);
    setWhatsappInput(r.settings.whatsappNumber);
  }, [isOwner]);

  useEffect(() => {
    loadZones().catch((e: Error) => setError(e.message));
    loadCategories().catch((e: Error) => setError(e.message));
    loadStaff().catch((e: Error) => setError(e.message));
    loadSettings().catch((e: Error) => setError(e.message));
  }, [loadZones, loadCategories, loadStaff, loadSettings]);

  // Zone actions
  const addZone = async () => {
    const feeP = Math.round(Number(newZone.fee) * 100);
    if (!newZone.name || Number.isNaN(feeP) || feeP < 0) return setError('Invalid zone data');
    setError('');
    try {
      await apiFetch('/api/admin/zones', { method: 'POST', body: JSON.stringify({ name: newZone.name, city: newZone.city, feeP }) });
      setNewZone({ name: '', city: 'Accra', fee: '' });
      await loadZones();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const updateZoneFee = async (zone: Zone, newFee: string) => {
    const feeP = Math.round(Number(newFee) * 100);
    if (Number.isNaN(feeP) || feeP < 0) return;
    setError('');
    try {
      await apiFetch(`/api/admin/zones/${zone.id}`, { method: 'PATCH', body: JSON.stringify({ feeP }) });
      await loadZones();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const deleteZone = async (id: string) => {
    if (!confirm('Delete this delivery zone?')) return;
    try {
      await apiFetch(`/api/admin/zones/${id}`, { method: 'DELETE' });
      await loadZones();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // Category actions
  const handleImageUpload = (file: File, setter: (val: string) => void) => {
    setError('');
    if (!file.type.startsWith('image/')) return setError('Images only');
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX_SIZE = 800;
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
          setter(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          setter(String(e.target?.result));
        }
      };
      img.src = String(e.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const addCategory = async () => {
    if (!newCategory.name) return setError('Category name required');
    setError('');
    try {
      await apiFetch('/api/admin/categories', { method: 'POST', body: JSON.stringify({ ...newCategory, parentId: newCategory.parentId || null }) });
      setNewCategory({ name: '', slug: '', flagship: false, image: '', parentId: '' });
      await loadCategories();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleBulkUpload = (file: File) => {
    setError('');
    if (!file.name.endsWith('.csv')) return setError('Please upload a .csv file');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) return;
        
        // Simple CSV parser supporting quotes (basic)
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) return setError('CSV must contain a header and at least one row');
        
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const nameIdx = headers.indexOf('name');
        const slugIdx = headers.indexOf('slug');
        const parentIdx = headers.indexOf('parent');
        const flagshipIdx = headers.indexOf('flagship');
        
        if (nameIdx === -1) return setError('CSV must contain a "name" column');
        
        const categoriesData = [];
        for (let i = 1; i < lines.length; i++) {
          // Quick and dirty split that doesn't handle commas inside quotes well, but enough for basic use cases
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length <= nameIdx || !cols[nameIdx]) continue;
          
          categoriesData.push({
            name: cols[nameIdx],
            slug: slugIdx !== -1 ? cols[slugIdx] : '',
            parentName: parentIdx !== -1 ? cols[parentIdx] : '',
            flagship: flagshipIdx !== -1 ? (cols[flagshipIdx].toLowerCase() === 'true' || cols[flagshipIdx] === '1') : false
          });
        }
        
        if (categoriesData.length === 0) return setError('No valid categories found in CSV');
        
        await apiFetch('/api/admin/categories/bulk', { 
          method: 'POST', 
          body: JSON.stringify({ categories: categoriesData }) 
        });
        
        await loadCategories();
      } catch (err) {
        setError((err as Error).message);
      }
    };
    reader.readAsText(file);
  };
  const updateCategory = async () => {
    if (!editingCategory) return;
    try {
      await apiFetch(`/api/admin/categories/${editingCategory.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editingCategory.name,
          slug: editingCategory.slug,
          flagship: editingCategory.flagship,
          image: editingCategory.image,
          parentId: editingCategory.parentId !== undefined ? (editingCategory.parentId || null) : undefined,
        }),
      });
      setEditingCategory(null);
      await loadCategories();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const toggleFlagship = async (c: Category) => {
    try {
      await apiFetch(`/api/admin/categories/${c.id}`, { method: 'PATCH', body: JSON.stringify({ flagship: !c.flagship }) });
      await loadCategories();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const deleteCategory = async (c: Category) => {
    if (c._count.products > 0) return setError('Cannot delete category with products');
    if (!confirm('Delete this category?')) return;
    try {
      await apiFetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
      await loadCategories();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const addStaff = async () => {
    if (!newStaff.email || !newStaff.password) return;
    setError('');
    try {
      await apiFetch('/api/admin/staff', { method: 'POST', body: JSON.stringify(newStaff) });
      setNewStaff({ email: '', name: '', password: '', role: 'staff' });
      await loadStaff();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const runRetention = async () => {
    setError('');
    try {
      const r = await apiFetch<{ result: unknown }>('/api/admin/retention/tick', { method: 'POST' });
      setRetentionResult(JSON.stringify(r.result));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const saveWhatsApp = async () => {
    if (!whatsappInput.trim()) return;
    setError('');
    setWhatsappSaved(false);
    try {
      const r = await apiFetch<{ settings: { whatsappNumber: string } }>('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ whatsappNumber: whatsappInput.trim() }),
      });
      setWhatsappNumber(r.settings.whatsappNumber);
      setWhatsappSaved(true);
      setTimeout(() => setWhatsappSaved(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const inputStyle = 'w-full border-b border-charcoal/30 bg-transparent px-1 py-1 text-sm outline-none focus:border-indigo';

  return (
    <div>
      <h1 className="mb-5 font-serif text-2xl text-indigo">Settings</h1>
      {error && <p className="mb-4 text-sm text-rose">{error}</p>}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Delivery zones & Categories */}
        <section className="space-y-6">
          
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-charcoal/50">
              <MapPin size={13} aria-hidden /> Delivery zones
            </p>
            <p className="mb-3 text-xs text-charcoal/50">Manage zones and fees.</p>
            <ul className="divide-y divide-sand/20 rounded border border-sand/30 bg-white/50 text-sm">
              {zones.map((z) => (
                <li key={z.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1">
                    <p className="font-medium text-charcoal">{z.name}</p>
                    <p className="text-xs text-charcoal/40">{z.city}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-charcoal/40">GHS</span>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      defaultValue={(z.feeP / 100).toFixed(2)}
                      onBlur={(e) => updateZoneFee(z, e.target.value)}
                      className="w-16 border-b border-charcoal/30 bg-transparent px-1 py-0.5 text-sm outline-none focus:border-indigo"
                    />
                    <button onClick={() => deleteZone(z.id)} className="text-charcoal/40 hover:text-rose"><Trash2 size={14} /></button>
                  </div>
                </li>
              ))}
              {zones.length === 0 && <li className="px-4 py-6 text-charcoal/50">No zones configured.</li>}
            </ul>
            <div className="mt-3 rounded border border-sand/30 bg-white/50 p-4">
              <p className="mb-3 text-xs uppercase tracking-wide text-charcoal/50">Add new zone</p>
              <div className="flex items-center gap-2">
                <input value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} placeholder="Zone name" className={inputStyle} />
                <input value={newZone.city} onChange={(e) => setNewZone({ ...newZone, city: e.target.value })} placeholder="City" className="w-32 border-b border-charcoal/30 bg-transparent px-1 py-1 text-sm outline-none focus:border-indigo" />
                <input type="number" step="0.5" value={newZone.fee} onChange={(e) => setNewZone({ ...newZone, fee: e.target.value })} placeholder="Fee (GHS)" className="w-24 border-b border-charcoal/30 bg-transparent px-1 py-1 text-sm outline-none focus:border-indigo" />
                <button onClick={addZone} className="flex shrink-0 items-center gap-1 rounded bg-indigo px-3 py-1.5 text-xs text-cream hover:bg-indigo-deep"><Plus size={14} /> Add</button>
              </div>
            </div>
          </div>

          {isOwner && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-charcoal/50">
                <Tag size={13} aria-hidden /> Categories
              </p>
              <ul className="divide-y divide-sand/20 rounded border border-sand/30 bg-white/50 text-sm">
                {categories.filter(c => !c.parentId).map((mainCat) => {
                  const subCats = categories.filter(sub => sub.parentId === mainCat.id);
                  return (
                    <li key={mainCat.id} className="flex flex-col border-b border-sand/20 last:border-b-0">
                      <details className="group" open={subCats.length > 0}>
                        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-sand/10 marker:content-['']">
                          {/* Main Category Header row */}
                          <div className="flex flex-1 items-center gap-3">
                            {mainCat.image ? <img src={mainCat.image} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-sand/30" />}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-charcoal">{mainCat.name} <span className="text-xs font-normal text-charcoal/40">/{mainCat.slug}</span></p>
                                <button onClick={(e) => { e.preventDefault(); setEditingCategory(mainCat); }} className="text-[10px] text-indigo hover:underline">edit</button>
                              </div>
                              <p className="text-[10px] text-charcoal/40">{mainCat._count?.products ?? 0} products {subCats.length > 0 && `· ${subCats.length} subcategories`}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex cursor-pointer items-center gap-1 text-xs text-charcoal/60 hover:text-indigo" onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={mainCat.flagship} onChange={() => toggleFlagship(mainCat)} />
                                Flagship
                              </label>
                              <button onClick={(e) => { e.preventDefault(); deleteCategory(mainCat); }} disabled={mainCat._count?.products > 0 || subCats.length > 0} className="text-charcoal/40 hover:text-rose disabled:opacity-30"><Trash2 size={14} /></button>
                            </div>
                          </div>
                          
                          {/* Accordion indicator icon */}
                          {subCats.length > 0 && (
                            <div className="ml-4 flex h-6 w-6 items-center justify-center rounded bg-sand/30 transition-transform group-open:rotate-180">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </div>
                          )}
                        </summary>
                        
                        {/* Subcategories list */}
                        {subCats.length > 0 && (
                          <ul className="bg-sand/10 pb-2">
                            {subCats.map(sub => {
                              const subSubCats = categories.filter(ss => ss.parentId === sub.id);
                              return (
                                <li key={sub.id} className="flex flex-col border-t border-sand/20 first:border-t-0">
                                  <div className="flex items-center gap-3 px-4 py-2 pl-12 hover:bg-sand/20">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-charcoal/80">{sub.name} <span className="text-xs font-normal text-charcoal/40">/{sub.slug}</span></p>
                                        <span className="text-[10px] bg-sand/50 px-1 rounded text-charcoal/60">Sub</span>
                                        <button onClick={() => setEditingCategory(sub)} className="text-[10px] text-indigo hover:underline">edit</button>
                                      </div>
                                      <p className="text-[10px] text-charcoal/40">{sub._count?.products ?? 0} products {subSubCats.length > 0 && `· ${subSubCats.length} types`}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <label className="flex cursor-pointer items-center gap-1 text-[10px] text-charcoal/60 hover:text-indigo">
                                        <input type="checkbox" checked={sub.flagship} onChange={() => toggleFlagship(sub)} />
                                        Flagship
                                      </label>
                                      <button onClick={() => deleteCategory(sub)} disabled={sub._count?.products > 0 || subSubCats.length > 0} className="text-charcoal/40 hover:text-rose disabled:opacity-30"><Trash2 size={12} /></button>
                                    </div>
                                  </div>
                                  
                                  {/* Tier 3 Sub-subcategories */}
                                  {subSubCats.length > 0 && (
                                    <ul className="bg-sand/20 py-1">
                                      {subSubCats.map(ss => (
                                        <li key={ss.id} className="flex items-center gap-3 px-4 py-1.5 pl-24 hover:bg-sand/30">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <p className="text-xs font-medium text-charcoal/70">{ss.name} <span className="text-[10px] font-normal text-charcoal/40">/{ss.slug}</span></p>
                                              <span className="text-[9px] bg-sand/60 px-1 rounded text-charcoal/50">Type</span>
                                              <button onClick={() => setEditingCategory(ss)} className="text-[10px] text-indigo hover:underline">edit</button>
                                            </div>
                                            <p className="text-[9px] text-charcoal/40">{ss._count?.products ?? 0} products</p>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <button onClick={() => deleteCategory(ss)} disabled={ss._count?.products > 0} className="text-charcoal/40 hover:text-rose disabled:opacity-30"><Trash2 size={12} /></button>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </details>
                    </li>
                  );
                })}
                {categories.length === 0 && <li className="px-4 py-6 text-charcoal/50">No categories configured.</li>}
              </ul>

              {/* Editing category modal/inline form overlay */}
              {editingCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4">
                  <div className="w-full max-w-md rounded-lg bg-cream p-6 shadow-xl">
                    <p className="mb-4 font-serif text-lg text-indigo">Edit Category</p>
                    <div className="flex flex-col gap-4">
                      <input value={editingCategory.name} onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })} className="w-full border-b border-charcoal/30 bg-transparent px-1 py-1 outline-none focus:border-indigo" placeholder="Name" />
                      <input value={editingCategory.slug} onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })} className="w-full border-b border-charcoal/30 bg-transparent px-1 py-1 outline-none focus:border-indigo" placeholder="Slug" />
                      <div>
                        <label className="mb-1 block text-xs text-charcoal/50">Parent Category</label>
                        <select value={editingCategory.parentId || ''} onChange={(e) => setEditingCategory({ ...editingCategory, parentId: e.target.value })} className="w-full border-b border-charcoal/30 bg-transparent px-1 py-1 outline-none focus:border-indigo">
                          <option value="">No Parent (Main Category)</option>
                          {categories.filter(c => !c.parentId && c.id !== editingCategory.id).map(main => {
                            const subs = categories.filter(s => s.parentId === main.id && s.id !== editingCategory.id);
                            return (
                              <optgroup key={main.id} label={`📁 ${main.name}`}>
                                <option value={main.id}>└ Subcategory of "{main.name}"</option>
                                {subs.map(sub => (
                                  <option key={sub.id} value={sub.id}>
                                    &nbsp;&nbsp;&nbsp;&nbsp;└ Type under "{main.name} › {sub.name}"
                                  </option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                      </div>

                      {/* Only main categories have cover images */}
                      {!editingCategory.parentId && (
                        <div className="flex items-center gap-3 mt-2">
                          {editingCategory.image ? (
                            <img src={editingCategory.image} alt="cover" className="h-12 w-12 rounded object-cover" />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-charcoal/30 text-[10px] text-charcoal/50">None</div>
                          )}
                          <label className="cursor-pointer text-sm text-indigo underline hover:text-indigo-deep">
                            Upload image
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], (img) => setEditingCategory({ ...editingCategory, image: img }))} />
                          </label>
                        </div>
                      )}

                      <div className="mt-4 flex justify-end gap-3">
                        <button onClick={() => setEditingCategory(null)} className="px-4 py-2 text-sm text-charcoal/60 hover:text-charcoal">Cancel</button>
                        <button onClick={updateCategory} className="rounded bg-indigo px-4 py-2 text-sm text-cream hover:bg-indigo-deep">Save Changes</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-3 rounded border border-sand/30 bg-white/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-charcoal/50">Add category</p>
                  <label className="cursor-pointer text-xs text-indigo underline hover:text-indigo-deep">
                    Bulk upload CSV
                    <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleBulkUpload(e.target.files[0])} />
                  </label>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <input value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} placeholder="Name" className={inputStyle} />
                    <input value={newCategory.slug} onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })} placeholder="Slug (opt)" className="w-32 border-b border-charcoal/30 bg-transparent px-1 py-1 text-sm outline-none focus:border-indigo" />
                    <select value={newCategory.parentId} onChange={(e) => setNewCategory({ ...newCategory, parentId: e.target.value, image: e.target.value ? '' : newCategory.image })} className="w-64 border-b border-charcoal/30 bg-transparent px-1 py-1 text-sm outline-none focus:border-indigo">
                      <option value="">No Parent (New Main Category)</option>
                      {categories.filter(c => !c.parentId).map(main => {
                        const subs = categories.filter(s => s.parentId === main.id);
                        return (
                          <optgroup key={main.id} label={`📁 ${main.name}`}>
                            <option value={main.id}>└ Add Subcategory under "{main.name}"</option>
                            {subs.map(sub => (
                              <option key={sub.id} value={sub.id}>
                                &nbsp;&nbsp;&nbsp;&nbsp;└ Add Type under "{main.name} › {sub.name}"
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                    <label className="flex shrink-0 items-center gap-1 text-xs text-charcoal/60"><input type="checkbox" checked={newCategory.flagship} onChange={(e) => setNewCategory({ ...newCategory, flagship: e.target.checked })} /> Flagship</label>
                  </div>
                  
                  {/* Only main categories have cover images */}
                  {!newCategory.parentId ? (
                    <div className="flex items-center gap-3">
                      {newCategory.image ? (
                        <img src={newCategory.image} alt="cover preview" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded border border-dashed border-charcoal/30 flex items-center justify-center text-charcoal/40 text-[10px]">Img</div>
                      )}
                      <label className="text-xs text-indigo underline cursor-pointer">
                        Upload cover
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], (img) => setNewCategory({ ...newCategory, image: img }))} />
                      </label>
                      <div className="flex-1" />
                      <button onClick={addCategory} className="flex shrink-0 items-center gap-1 rounded bg-indigo px-3 py-1.5 text-xs text-cream hover:bg-indigo-deep"><Plus size={14} /> Add Category</button>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <button onClick={addCategory} className="flex shrink-0 items-center gap-1 rounded bg-indigo px-3 py-1.5 text-xs text-cream hover:bg-indigo-deep"><Plus size={14} /> Add Subcategory</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp number */}
          <div className="rounded border border-sand/30 bg-white/50 p-4">
            <p className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-charcoal/50">
              <MessageCircle size={13} aria-hidden /> WhatsApp number
            </p>
            <p className="mb-3 text-xs text-charcoal/60">The number customers see on the website. Use international format without + (e.g., 233238136060).</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={whatsappInput}
                onChange={(e) => setWhatsappInput(e.target.value)}
                placeholder="233238136060"
                className={inputStyle}
              />
              <button onClick={saveWhatsApp} disabled={whatsappInput === whatsappNumber} className="text-xs text-indigo underline disabled:text-charcoal/30">Save</button>
            </div>
            {whatsappSaved && <p className="mt-2 text-[10px] text-wagreen">Saved.</p>}
            <p className="mt-2 text-[10px] text-charcoal/40">Current: {whatsappNumber || 'Not set'}</p>
          </div>

        </section>

        {/* Staff & System */}
        <section className="space-y-6">
          {/* Staff (owner only) */}
          {isOwner && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-charcoal/50">
                <UserPlus size={13} aria-hidden /> Staff accounts
              </p>
              <ul className="divide-y divide-sand/20 rounded border border-sand/30 bg-white/50 text-sm">
                {staff.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-charcoal">{s.name}</p>
                      <p className="text-xs text-charcoal/40">{s.email}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] ${s.role === 'owner' ? 'bg-indigo/10 text-indigo' : 'bg-sand/40 text-charcoal'}`}>{s.role}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 rounded border border-sand/30 bg-white/50 p-4">
                <p className="mb-3 text-xs uppercase tracking-wide text-charcoal/50">Add staff</p>
                <div className="grid gap-2">
                  <input value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="Name" className={inputStyle} />
                  <input value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} placeholder="Email" className={inputStyle} />
                  <input type="password" value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} placeholder="Password" className={inputStyle} />
                  <div className="flex gap-4 text-sm">
                    {['staff', 'owner'].map((r) => (
                      <label key={r} className="flex items-center gap-1 text-charcoal/70">
                        <input type="radio" checked={newStaff.role === r} onChange={() => setNewStaff({ ...newStaff, role: r })} /> {r}
                      </label>
                    ))}
                  </div>
                  <button onClick={addStaff} className="mt-2 flex w-fit items-center gap-1.5 rounded bg-indigo px-4 py-2 text-sm text-cream hover:bg-indigo-deep">Create</button>
                </div>
              </div>
            </div>
          )}

          {/* Retention */}
          <div className="rounded border border-sand/30 bg-white/50 p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-charcoal/50">Retention engine</p>
            <button onClick={runRetention} className="flex items-center gap-1.5 rounded border border-charcoal/30 px-3 py-1.5 text-xs hover:border-indigo hover:text-indigo">
              <RefreshCw size={12} aria-hidden /> Run manual tick
            </button>
            {retentionResult && <pre className="mt-3 max-h-32 overflow-auto bg-cream p-2 text-[10px] text-charcoal/70">{retentionResult}</pre>}
          </div>
        </section>
      </div>
    </div>
  );
}
