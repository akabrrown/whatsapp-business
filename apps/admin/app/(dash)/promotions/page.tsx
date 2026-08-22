'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Tag,
  Megaphone,
  Percent,
  Plus,
  Trash2,
  Check,
  Search,
  BadgePercent,
  AlertCircle,
  TrendingDown,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { apiFetch, getUser } from '@/lib/api';
import { formatGHS } from '@rose/shared';

interface PromoBanner {
  enabled: boolean;
  text: string;
  link?: string;
  badge?: string;
}

interface FreeDeliveryConfig {
  enabled: boolean;
  thresholdP: number;
  bannerText?: string;
}

interface CouponItem {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'FREE_DELIVERY';
  value: number;
  minOrderP: number;
  active: boolean;
  usageLimit?: number;
  usedCount: number;
  expiresAt?: string;
}

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  minPriceP: number;
  images: string[];
}

interface ProductPromotion {
  compareAtPriceP?: number;
  badge?: string;
  featured?: boolean;
}

export default function PromotionsPage() {
  const [banner, setBanner] = useState<PromoBanner>({ enabled: false, text: '', link: '', badge: '' });
  const [bannerSaved, setBannerSaved] = useState(false);
  const [freeDelivery, setFreeDelivery] = useState<FreeDeliveryConfig>({ enabled: true, thresholdP: 40000 });
  const [freeDeliveryThresholdGHS, setFreeDeliveryThresholdGHS] = useState('400');
  const [freeDeliverySaved, setFreeDeliverySaved] = useState(false);
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [productPromotions, setProductPromotions] = useState<Record<string, ProductPromotion>>({});
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  
  // New Coupon State
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED' | 'FREE_DELIVERY',
    value: 10,
    minOrderGHS: '',
    usageLimit: '',
  });

  // Product Promo Edit Modal / State
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [productPromoForm, setProductPromoForm] = useState({
    compareAtPriceGHS: '',
    badge: '',
    featured: false,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isOwner = getUser()?.role === 'owner';

  const loadData = useCallback(async () => {
    try {
      const [promoRes, prodRes] = await Promise.all([
        apiFetch<{ banner: PromoBanner; coupons: CouponItem[]; productPromotions: Record<string, ProductPromotion>; freeDelivery?: FreeDeliveryConfig }>('/api/admin/promotions'),
        apiFetch<{ products: ProductItem[] }>('/api/admin/products'),
      ]);
      if (promoRes.banner) setBanner(promoRes.banner);
      if (promoRes.coupons) setCoupons(promoRes.coupons);
      if (promoRes.productPromotions) setProductPromotions(promoRes.productPromotions);
      if (promoRes.freeDelivery) {
        setFreeDelivery(promoRes.freeDelivery);
        setFreeDeliveryThresholdGHS((promoRes.freeDelivery.thresholdP / 100).toString());
      }
      if (prodRes.products) setProducts(prodRes.products);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save Free Delivery Configuration
  const handleSaveFreeDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const thresholdP = Math.round(Number(freeDeliveryThresholdGHS || 0) * 100);
      const res = await apiFetch<{ freeDelivery: FreeDeliveryConfig }>('/api/admin/promotions/free-delivery', {
        method: 'POST',
        body: JSON.stringify({
          enabled: freeDelivery.enabled,
          thresholdP,
          bannerText: freeDelivery.bannerText,
        }),
      });
      setFreeDelivery(res.freeDelivery);
      setFreeDeliverySaved(true);
      setSuccess('Free delivery threshold updated successfully!');
      setTimeout(() => {
        setFreeDeliverySaved(false);
        setSuccess('');
      }, 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Save Announcement Banner
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch<{ banner: PromoBanner }>('/api/admin/promotions/banner', {
        method: 'POST',
        body: JSON.stringify(banner),
      });
      setBanner(res.banner);
      setBannerSaved(true);
      setTimeout(() => setBannerSaved(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Add Coupon
  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code.trim()) return;
    setBusy(true);
    setError('');
    try {
      const minOrderP = newCoupon.minOrderGHS ? Math.round(Number(newCoupon.minOrderGHS) * 100) : 0;
      const value = newCoupon.discountType === 'FIXED' ? Math.round(Number(newCoupon.value) * 100) : Number(newCoupon.value);
      
      const res = await apiFetch<{ coupons: CouponItem[] }>('/api/admin/promotions/coupons', {
        method: 'POST',
        body: JSON.stringify({
          coupon: {
            code: newCoupon.code,
            discountType: newCoupon.discountType,
            value,
            minOrderP,
            usageLimit: newCoupon.usageLimit ? Number(newCoupon.usageLimit) : undefined,
            active: true,
          },
        }),
      });
      setCoupons(res.coupons);
      setNewCoupon({ code: '', discountType: 'PERCENTAGE', value: 10, minOrderGHS: '', usageLimit: '' });
      setSuccess('Coupon created successfully!');
      setTimeout(() => setSuccess(''), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Toggle Coupon Active
  const handleToggleCoupon = async (c: CouponItem) => {
    try {
      const res = await apiFetch<{ coupons: CouponItem[] }>('/api/admin/promotions/coupons', {
        method: 'POST',
        body: JSON.stringify({ coupon: { ...c, active: !c.active } }),
      });
      setCoupons(res.coupons);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const res = await apiFetch<{ coupons: CouponItem[] }>(`/api/admin/promotions/coupons/${id}`, {
        method: 'DELETE',
      });
      setCoupons(res.coupons);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // Edit Product Promo
  const handleOpenProductPromo = (p: ProductItem) => {
    setSelectedProduct(p);
    const existing = productPromotions[p.id] || {};
    setProductPromoForm({
      compareAtPriceGHS: existing.compareAtPriceP ? (existing.compareAtPriceP / 100).toFixed(2) : '',
      badge: existing.badge || '',
      featured: !!existing.featured,
    });
  };

  // Save Product Promo
  const handleSaveProductPromo = async () => {
    if (!selectedProduct) return;
    setBusy(true);
    setError('');
    try {
      const compareAtPriceP = productPromoForm.compareAtPriceGHS ? Math.round(Number(productPromoForm.compareAtPriceGHS) * 100) : undefined;
      const res = await apiFetch<{ productPromotions: Record<string, ProductPromotion> }>(`/api/admin/promotions/products/${selectedProduct.id}`, {
        method: 'POST',
        body: JSON.stringify({
          compareAtPriceP,
          badge: productPromoForm.badge || undefined,
          featured: productPromoForm.featured,
        }),
      });
      setProductPromotions(res.productPromotions);
      setSelectedProduct(null);
      setSuccess(`Discounts & promotions updated for ${selectedProduct.name}!`);
      setTimeout(() => setSuccess(''), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl text-indigo flex items-center gap-2">
          <Tag className="text-indigo" size={24} />
          Promotions, Discounts & Banners
        </h1>
        <p className="text-xs text-charcoal/60 mt-1">
          Set store-wide announcement promo banners, configure coupon codes, and set product-level sale prices & discount badges.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose/30 bg-rose/10 p-3.5 text-xs text-rose flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-600/30 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-center gap-2">
          <Check size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Section 1: Store Announcement Banner */}
      <div className="rounded-2xl border border-sand/60 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-sand/40 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Megaphone className="text-indigo" size={20} />
            <div>
              <h2 className="font-semibold text-charcoal text-sm">Storewide Announcement & Promo Bar</h2>
              <p className="text-xs text-charcoal/50">Displays a high-converting announcement bar at the top of the storefront.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={banner.enabled}
              onChange={(e) => setBanner({ ...banner, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-sand/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-sand after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo"></div>
            <span className="ml-2.5 text-xs font-semibold text-charcoal">
              {banner.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>

        {/* Live Banner Preview */}
        {banner.enabled && banner.text && (
          <div className="mb-5 rounded-xl bg-indigo text-white px-4 py-2.5 text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 truncate">
              {banner.badge && (
                <span className="rounded bg-amber-400 text-indigo font-bold px-1.5 py-0.5 text-[10px] uppercase tracking-wider shrink-0">
                  {banner.badge}
                </span>
              )}
              <span className="font-medium truncate">{banner.text}</span>
            </div>
            {banner.link && (
              <span className="underline font-semibold shrink-0 ml-2">Shop Now →</span>
            )}
          </div>
        )}

        <form onSubmit={handleSaveBanner} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-charcoal/70 mb-1">Banner Announcement Text</label>
              <input
                type="text"
                value={banner.text}
                onChange={(e) => setBanner({ ...banner, text: e.target.value })}
                placeholder="e.g. 🎉 SPECIAL OFFER: Get 15% OFF with coupon code TOBI15!"
                className="w-full rounded-xl border border-sand/70 bg-sand/10 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-indigo"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-charcoal/70 mb-1">Badge Tag (Optional)</label>
              <input
                type="text"
                value={banner.badge || ''}
                onChange={(e) => setBanner({ ...banner, badge: e.target.value })}
                placeholder="e.g. PROMO, FLASH SALE"
                className="w-full rounded-xl border border-sand/70 bg-sand/10 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-indigo"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal/70 mb-1">Clickable Link Destination (Optional)</label>
            <input
              type="text"
              value={banner.link || ''}
              onChange={(e) => setBanner({ ...banner, link: e.target.value })}
              placeholder="e.g. /shop or /shop/men"
              className="w-full rounded-xl border border-sand/70 bg-sand/10 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-indigo"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-indigo px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo/90 flex items-center gap-1.5"
            >
              {bannerSaved ? <Check size={14} /> : null}
              <span>{bannerSaved ? 'Saved!' : 'Save Announcement Banner'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Free Delivery Threshold & Cart Promotion */}
      <div className="rounded-2xl border border-sand/60 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-sand/40 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Truck className="text-indigo" size={20} />
            <div>
              <h2 className="font-semibold text-charcoal text-sm">Free Delivery Threshold (Cart Progress)</h2>
              <p className="text-xs text-charcoal/50">Motivate customers to add more items to their cart to unlock free delivery across Accra.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={freeDelivery.enabled}
              onChange={(e) => setFreeDelivery({ ...freeDelivery, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-sand/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-sand after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo"></div>
            <span className="ml-2.5 text-xs font-semibold text-charcoal">
              {freeDelivery.enabled ? 'Active' : 'Disabled'}
            </span>
          </label>
        </div>

        {/* Live Cart Preview */}
        {freeDelivery.enabled && (
          <div className="mb-5 rounded-xl border border-indigo/20 bg-indigo/[0.03] p-4 text-xs space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo">Customer Cart Live Preview</p>
            <div className="flex items-center justify-between font-medium text-charcoal">
              <span className="flex items-center gap-1.5">
                <Truck size={14} className="text-indigo" />
                <span>
                  Add <strong className="text-indigo">GH₵{Number(freeDeliveryThresholdGHS || 400) > 150 ? (Number(freeDeliveryThresholdGHS || 400) - 150).toFixed(2) : '50.00'}</strong> more to unlock <strong>FREE Delivery across Accra!</strong>
                </span>
              </span>
              <span className="text-[11px] text-charcoal/50 font-mono">60%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand/40">
              <div className="h-full bg-indigo rounded-full" style={{ width: '60%' }} />
            </div>
          </div>
        )}

        <form onSubmit={handleSaveFreeDelivery} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-charcoal/70 mb-1">
              Minimum Order Spend for Free Delivery (GH₵)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-charcoal/50">GH₵</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={freeDeliveryThresholdGHS}
                  onChange={(e) => setFreeDeliveryThresholdGHS(e.target.value)}
                  placeholder="400.00"
                  className="w-full rounded-xl border border-sand/70 bg-sand/10 pl-12 pr-3.5 py-2.5 text-xs font-bold text-indigo outline-none focus:border-indigo"
                  required
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] text-charcoal/40 font-medium mr-1">Presets:</span>
                {[250, 350, 400, 500, 600].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setFreeDeliveryThresholdGHS(amount.toString())}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                      freeDeliveryThresholdGHS === amount.toString()
                        ? 'border-indigo bg-indigo text-white shadow-2xs'
                        : 'border-sand/70 bg-sand/10 text-charcoal hover:border-indigo/50'
                    }`}
                  >
                    GH₵{amount}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-charcoal/50">
              When a customer&apos;s cart reaches GH₵{Number(freeDeliveryThresholdGHS || 400).toFixed(2)}, standard delivery fees across Accra automatically drop to GH₵0.00.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-indigo px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo/90 flex items-center gap-1.5"
            >
              {freeDeliverySaved ? <Check size={14} /> : null}
              <span>{freeDeliverySaved ? 'Saved!' : 'Save Free Delivery Threshold'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Section 3: Discount Coupons & Promo Vouchers */}
      <div className="rounded-2xl border border-sand/60 bg-white p-6 shadow-sm">
        <div className="border-b border-sand/40 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <Percent className="text-indigo" size={20} />
            <div>
              <h2 className="font-semibold text-charcoal text-sm">Discount Coupon Codes</h2>
              <p className="text-xs text-charcoal/50">Customers enter these codes at checkout or in their cart for instant discounts.</p>
            </div>
          </div>
        </div>

        {/* Create Coupon Form */}
        <form onSubmit={handleAddCoupon} className="mb-6 rounded-xl border border-sand/50 bg-sand/10 p-4 space-y-3">
          <p className="text-xs font-bold text-indigo uppercase tracking-wider">Create New Promo Coupon</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-charcoal/70 mb-1">Coupon Code</label>
              <input
                type="text"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                placeholder="e.g. TOBI15"
                className="w-full font-mono uppercase rounded-lg border border-sand/70 bg-white px-3 py-2 text-xs text-charcoal outline-none focus:border-indigo"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-charcoal/70 mb-1">Discount Type</label>
              <select
                value={newCoupon.discountType}
                onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value as any })}
                className="w-full rounded-lg border border-sand/70 bg-white px-3 py-2 text-xs text-charcoal outline-none focus:border-indigo"
              >
                <option value="PERCENTAGE">Percentage (% Off)</option>
                <option value="FIXED">Fixed Amount (GH₵ Off)</option>
                <option value="FREE_DELIVERY">Free Delivery</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-charcoal/70 mb-1">
                {newCoupon.discountType === 'PERCENTAGE' ? 'Discount %' : newCoupon.discountType === 'FIXED' ? 'Discount Amount (GH₵)' : 'Discount Value'}
              </label>
              <input
                type="number"
                min="1"
                disabled={newCoupon.discountType === 'FREE_DELIVERY'}
                value={newCoupon.discountType === 'FREE_DELIVERY' ? 0 : newCoupon.value}
                onChange={(e) => setNewCoupon({ ...newCoupon, value: Number(e.target.value) })}
                className="w-full rounded-lg border border-sand/70 bg-white px-3 py-2 text-xs text-charcoal outline-none focus:border-indigo disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-charcoal/70 mb-1">Min. Order (GH₵, Optional)</label>
              <input
                type="number"
                min="0"
                value={newCoupon.minOrderGHS}
                onChange={(e) => setNewCoupon({ ...newCoupon, minOrderGHS: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-lg border border-sand/70 bg-white px-3 py-2 text-xs text-charcoal outline-none focus:border-indigo"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={busy || !newCoupon.code.trim()}
                className="w-full rounded-lg bg-indigo px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo/90 flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Plus size={14} />
                <span>Add Coupon</span>
              </button>
            </div>
          </div>
        </form>

        {/* Existing Coupons Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-sand/40 bg-sand/15 text-[11px] uppercase tracking-wider text-charcoal/60">
              <tr>
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Discount</th>
                <th className="py-2.5 px-3">Min Order</th>
                <th className="py-2.5 px-3">Usage</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/30">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-charcoal/40">
                    No promo coupons created yet. Create your first coupon above!
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-sand/5">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-indigo bg-indigo/10 px-2 py-0.5 rounded">
                        {c.code}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-charcoal">
                      {c.discountType === 'PERCENTAGE'
                        ? `${c.value}% OFF`
                        : c.discountType === 'FIXED'
                        ? `GH₵${(c.value / 100).toFixed(2)} OFF`
                        : 'Free Delivery'}
                    </td>
                    <td className="py-3 px-3 text-charcoal/70">
                      {c.minOrderP > 0 ? formatGHS(c.minOrderP) : 'No minimum'}
                    </td>
                    <td className="py-3 px-3 text-charcoal/70">
                      {c.usedCount} used
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleToggleCoupon(c)}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                          c.active ? 'bg-emerald-100 text-emerald-800' : 'bg-sand/60 text-charcoal/50'
                        }`}
                      >
                        {c.active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeleteCoupon(c.id)}
                        className="text-rose hover:text-rose-700 p-1 rounded hover:bg-rose/10 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Product-Level Discounts & Promo Badges */}
      <div className="rounded-2xl border border-sand/60 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand/40 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <BadgePercent className="text-indigo" size={20} />
            <div>
              <h2 className="font-semibold text-charcoal text-sm">Product Discounts, Promo Badges & Featured</h2>
              <p className="text-xs text-charcoal/50">Apply slashed original prices (e.g. ~GH₵250~ ➔ GH₵180), discount tags, and homepage promo flags.</p>
            </div>
          </div>
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-charcoal/40" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-xl border border-sand/70 bg-sand/10 pl-8 pr-3 py-1.5 text-xs text-charcoal outline-none focus:border-indigo"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.slice(0, 18).map((p) => {
            const promo = productPromotions[p.id];
            const hasPromo = promo && (promo.compareAtPriceP || promo.badge || promo.featured);

            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition ${
                  hasPromo ? 'border-indigo/40 bg-indigo/[0.02]' : 'border-sand/60 bg-white'
                }`}
              >
                <div className="flex-1 truncate mr-2">
                  <p className="font-semibold text-xs text-charcoal truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-indigo">{formatGHS(p.minPriceP)}</span>
                    {promo?.compareAtPriceP && (
                      <span className="text-[11px] text-charcoal/40 line-through">
                        {formatGHS(promo.compareAtPriceP)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {promo?.badge && (
                      <span className="rounded bg-rose/10 text-rose font-bold px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
                        {promo.badge}
                      </span>
                    )}
                    {promo?.featured && (
                      <span className="rounded bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
                        ★ Featured
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleOpenProductPromo(p)}
                  className="rounded-lg border border-indigo/40 bg-indigo/5 px-2.5 py-1.5 text-[11px] font-semibold text-indigo hover:bg-indigo hover:text-white transition shrink-0"
                >
                  Edit Promo
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Product Promo Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-sand/60">
            <h3 className="font-serif text-lg text-indigo mb-1">Set Discounts & Promos</h3>
            <p className="text-xs text-charcoal/60 mb-4 truncate font-medium">{selectedProduct.name}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-charcoal/70 mb-1">
                  Active Selling Price
                </label>
                <input
                  type="text"
                  disabled
                  value={formatGHS(selectedProduct.minPriceP)}
                  className="w-full rounded-xl border border-sand/40 bg-sand/20 px-3.5 py-2 text-xs font-bold text-charcoal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal/70 mb-1">
                  Original Compare-at Price (GH₵, Slashed Display)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={productPromoForm.compareAtPriceGHS}
                  onChange={(e) => setProductPromoForm({ ...productPromoForm, compareAtPriceGHS: e.target.value })}
                  placeholder="e.g. 250.00 (shows as ~GH₵250.00~)"
                  className="w-full rounded-xl border border-sand/70 bg-sand/10 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-indigo"
                />
                <p className="text-[10px] text-charcoal/40 mt-1">Leave empty if no original price was marked.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal/70 mb-1">
                  Promo Badge Text (e.g. "20% OFF", "HOT SALE", "LIMITED DROP")
                </label>
                <input
                  type="text"
                  value={productPromoForm.badge}
                  onChange={(e) => setProductPromoForm({ ...productPromoForm, badge: e.target.value })}
                  placeholder="e.g. 20% OFF or SALE"
                  className="w-full rounded-xl border border-sand/70 bg-sand/10 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-indigo"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productPromoForm.featured}
                    onChange={(e) => setProductPromoForm({ ...productPromoForm, featured: e.target.checked })}
                    className="rounded border-sand text-indigo focus:ring-indigo h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-charcoal">
                    Feature & Promote on Homepage ("Featured Promos" Section)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-sand/40">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="rounded-xl border border-sand/80 px-4 py-2 text-xs font-medium text-charcoal/70 hover:bg-sand/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleSaveProductPromo}
                className="rounded-xl bg-indigo px-5 py-2 text-xs font-semibold text-white transition hover:bg-indigo/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
