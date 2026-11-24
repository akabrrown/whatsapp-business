import type { CatalogProduct, Category } from './api';

export interface RunwayLook {
  id: string;
  lookNumber: number;
  lookLabel: string; // e.g. "LOOK 1"
  name: string;
  slug: string;
  priceGHS: number;
  priceP: number;
  category: string;
  collection: string;
  heroImage: string;
  cardImage: string;
  description: string;
  inStock: boolean;
  featured: boolean;
  accentColor: string;
  sizes: string[];
}

export const BRAND_NAME = "ATELIER KWAME";
export const BRAND_TAGLINE = "SPRING SUMMER 2027";
export const CURRENCY_SYMBOL = "GH₵";

export const RUNWAY_LOOKS: RunwayLook[] = [
  {
    id: "look-1-the-accra-embroidered-robe",
    lookNumber: 1,
    lookLabel: "LOOK 1",
    name: "THE ACCRA EMBROIDERED ROBE",
    slug: "the-accra-embroidered-robe",
    priceGHS: 2900,
    priceP: 290000,
    category: "CLOTHING",
    collection: "SPRING SUMMER 2027",
    heroImage: "/runway/hero-look-1.jpg",
    cardImage: "/runway/the-accra-robe-card.jpg",
    description: "Hand-embroidered ivory silk ceremonial robe with traditional Ashanti gold filigree detailing, cascading drape and mandarin stand collar.",
    inStock: true,
    featured: true,
    accentColor: "#D4AF37",
    sizes: ["S", "M", "L", "XL", "BESPOKE"],
  },
  {
    id: "look-2-the-kumasi-khaki-set",
    lookNumber: 2,
    lookLabel: "LOOK 2",
    name: "THE KUMASI KHAKI SET",
    slug: "the-kumasi-khaki-set",
    priceGHS: 1850,
    priceP: 185000,
    category: "CLOTHING",
    collection: "SPRING SUMMER 2027",
    heroImage: "/runway/hero-look-2-kumasi-khaki.jpg",
    cardImage: "/runway/the-kumasi-khaki-card.jpg",
    description: "Tailored short-sleeve safari tunic in architectural desert khaki with golden branded hardware and pressed slim-fit trousers.",
    inStock: true,
    featured: true,
    accentColor: "#C3B091",
    sizes: ["S", "M", "L", "XL", "BESPOKE"],
  },
  {
    id: "look-3-the-volta-senator",
    lookNumber: 3,
    lookLabel: "LOOK 3",
    name: "THE VOLTA SENATOR",
    slug: "the-volta-senator",
    priceGHS: 2200,
    priceP: 220000,
    category: "CLOTHING",
    collection: "SPRING SUMMER 2027",
    heroImage: "/runway/hero-look-3-volta-senator.jpg",
    cardImage: "/runway/the-volta-senator-card.jpg",
    description: "Minimalist pure Egyptian cotton senator tunic in crisp porcelain white, punctuated by an asymmetric electric turquoise vertical racing stripe.",
    inStock: true,
    featured: true,
    accentColor: "#0EA5E9",
    sizes: ["S", "M", "L", "XL", "BESPOKE"],
  },
  {
    id: "look-4-the-navy-gold-senator",
    lookNumber: 4,
    lookLabel: "LOOK 4",
    name: "THE NAVY & GOLD SENATOR",
    slug: "the-navy-gold-senator",
    priceGHS: 2450,
    priceP: 245000,
    category: "CLOTHING",
    collection: "SPRING SUMMER 2027",
    heroImage: "/runway/hero-look-4.jpg",
    cardImage: "/runway/the-navy-gold-card.jpg",
    description: "Deep oceanic navy senator two-piece tailored with 24k gold bullion pocket embroidery and hand-finished vented cuffs.",
    inStock: true,
    featured: true,
    accentColor: "#1E3A8A",
    sizes: ["S", "M", "L", "XL", "BESPOKE"],
  },
  {
    id: "look-5-the-grand-kaftan",
    lookNumber: 5,
    lookLabel: "LOOK 5",
    name: "THE GRAND KAFTAN",
    slug: "the-grand-kaftan",
    priceGHS: 3200,
    priceP: 320000,
    category: "CLOTHING",
    collection: "SPRING SUMMER 2027",
    heroImage: "/runway/hero-look-5-grand-kaftan.jpg",
    cardImage: "/runway/the-grand-kaftan-card.jpg",
    description: "Monumental black velvet Agbada outer robe lavishly adorned with metallic gold baroque damask motifs over an inner tailored tunic.",
    inStock: true,
    featured: true,
    accentColor: "#D4AF37",
    sizes: ["M", "L", "XL", "BESPOKE"],
  },
  {
    id: "look-6-the-sky-blue-smock",
    lookNumber: 6,
    lookLabel: "LOOK 6",
    name: "THE SKY BLUE SMOCK",
    slug: "the-sky-blue-smock",
    priceGHS: 1980,
    priceP: 198000,
    category: "CLOTHING",
    collection: "SPRING SUMMER 2027",
    heroImage: "/runway/hero-look-6.jpg",
    cardImage: "/runway/the-sky-blue-smock-card.jpg",
    description: "Handwoven Northern Ghanaian Fugu smock rendered in soft sky blue with geometric diamond chest embroidery and sculptural flared silhouette.",
    inStock: true,
    featured: true,
    accentColor: "#38BDF8",
    sizes: ["S", "M", "L", "XL", "BESPOKE"],
  },
  {
    id: "look-7-the-ivory-kaftan",
    lookNumber: 7,
    lookLabel: "LOOK 7",
    name: "THE IVORY KAFTAN",
    slug: "the-ivory-kaftan",
    priceGHS: 2600,
    priceP: 260000,
    category: "CLOTHING",
    collection: "SPRING SUMMER 2027",
    heroImage: "/runway/hero-look-7.jpg",
    cardImage: "/runway/the-ivory-gold-card.jpg",
    description: "Monochrome cream crepe kaftan featuring concealed magnetic placket, structural shoulder pads, and tailored ankle-crop pants.",
    inStock: true,
    featured: false,
    accentColor: "#F5F5F0",
    sizes: ["S", "M", "L", "XL", "BESPOKE"],
  },
  {
    id: "look-8-the-green-tuxedo-set",
    lookNumber: 8,
    lookLabel: "LOOK 8",
    name: "THE GREEN TUXEDO SET",
    slug: "the-green-tuxedo-set",
    priceGHS: 3500,
    priceP: 350000,
    category: "CLOTHING",
    collection: "SPRING SUMMER 2027",
    heroImage: "/runway/hero-look-8-green-tuxedo.jpg",
    cardImage: "/runway/the-green-tuxedo-card.jpg",
    description: "Avant-garde emerald green asymmetrical gala tuxedo with tonal crystalline lapel beading, mandarin high-collar, and formal cane pairing.",
    inStock: true,
    featured: true,
    accentColor: "#064E3B",
    sizes: ["S", "M", "L", "XL", "BESPOKE"],
  },
  {
    id: "look-9-the-ivory-gold-set",
    lookNumber: 9,
    lookLabel: "LOOK 9",
    name: "THE IVORY & GOLD SET",
    slug: "the-ivory-gold-set",
    priceGHS: 2100,
    priceP: 210000,
    category: "CLOTHING",
    collection: "SPRING SUMMER 2027",
    heroImage: "/runway/hero-look-9-ivory-gold.jpg",
    cardImage: "/runway/the-ivory-gold-card.jpg",
    description: "Off-white short-sleeve safari jacket adorned with polished gold domed buttons, dual chest flap pockets, and pleated formal trousers.",
    inStock: true,
    featured: true,
    accentColor: "#D4AF37",
    sizes: ["S", "M", "L", "XL", "BESPOKE"],
  },
];

export const HAUTE_CATEGORIES: Category[] = [
  { id: "cat-runway", name: "RUNWAY", slug: "runway", flagship: true },
  { id: "cat-clothing", name: "CLOTHING", slug: "clothing", flagship: true },
  { id: "cat-the-looks", name: "THE LOOKS", slug: "the-looks", flagship: true },
  { id: "cat-senators", name: "SENATORS", slug: "senators", flagship: false },
  { id: "cat-kaftans", name: "KAFTANS & ROBES", slug: "kaftans", flagship: false },
  { id: "cat-tuxedos", name: "TUXEDOS", slug: "tuxedos", flagship: false },
  { id: "cat-smocks", name: "SMOCKS", slug: "smocks", flagship: false },
];

/**
 * Converts a RunwayLook to the standard CatalogProduct schema
 * for seamless integration with existing cart, checkout and API systems.
 */
export function lookToCatalogProduct(look: RunwayLook): CatalogProduct {
  return {
    id: look.id,
    slug: look.slug,
    name: look.name,
    description: look.description,
    category: { slug: "clothing", name: "Clothing" },
    images: [look.cardImage, look.heroImage],
    minPriceP: look.priceP,
    badge: look.lookLabel,
    featured: look.featured,
    soldOut: !look.inStock,
    totalAvailable: 25,
    lowStock: false,
    variants: look.sizes.map((size, idx) => ({
      id: `${look.id}-var-${size.toLowerCase()}`,
      sku: `AKW-${look.lookNumber}-${size}`,
      size,
      color: "Runway Original",
      priceP: look.priceP,
      stockQuantity: 10,
      available: 10,
    })),
  };
}

export const CATALOG_PRODUCTS: CatalogProduct[] = RUNWAY_LOOKS.map(lookToCatalogProduct);
