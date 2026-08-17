// Seed: categories, products w/ variants, Accra delivery zones, owner account.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { pesewas } from '@rose/shared';

const db = new PrismaClient();

const img = (seed: string) => `/api/img/${seed}`;

async function main() {
  const owner = await db.adminUser.upsert({
    where: { email: process.env.OWNER_EMAIL ?? 'kukua@roseanddenim.com' },
    update: {},
    create: {
      email: process.env.OWNER_EMAIL ?? 'kukua@roseanddenim.com',
      name: 'Kukua',
      role: 'owner',
      password: await bcrypt.hash(process.env.OWNER_PASSWORD ?? 'denim-rose-2026', 10),
    },
  });

  const cats = [
    { name: 'Jeans', slug: 'jeans', flagship: true },
    { name: 'Female Wears', slug: 'female-wears', flagship: false },
    { name: 'Slippers', slug: 'slippers', flagship: false },
    { name: 'Bags', slug: 'bags', flagship: false },
    { name: 'Accessories', slug: 'accessories', flagship: false },
  ];
  const catIds: Record<string, string> = {};
  for (const c of cats) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      update: { flagship: c.flagship },
      create: c,
    });
    catIds[c.slug] = row.id;
  }

  type P = {
    slug: string; name: string; cat: string; desc: string;
    variants: { size?: string; color?: string; price: number; stock: number; low?: number }[];
  };
  const products: P[] = [
    { slug: 'accra-straight-jeans', name: 'Accra Straight-Leg Jeans', cat: 'jeans', desc: 'Mid-rise straight-leg denim in deep indigo. Structured but soft — the pair you reach for every week.', variants: [{ size: '28', color: 'Indigo', price: 320, stock: 8 }, { size: '30', color: 'Indigo', price: 320, stock: 6 }, { size: '32', color: 'Indigo', price: 320, stock: 2, low: 3 }] },
    { slug: 'osuedenim-wide-leg', name: 'Osu Wide-Leg Denim', cat: 'jeans', desc: 'Flowing wide-leg cut with raw hem. Pairs with everything from slippers to heels.', variants: [{ size: '28', color: 'Washed Blue', price: 380, stock: 5 }, { size: '30', color: 'Washed Blue', price: 380, stock: 4 }] },
    { slug: 'labone-denim-skirt', name: 'Labone Denim Skirt', cat: 'jeans', desc: 'A-line midi denim skirt with front slit.', variants: [{ size: 'S', color: 'Indigo', price: 260, stock: 7 }, { size: 'M', color: 'Indigo', price: 260, stock: 0 }] },
    { slug: 'kente-trim-dress', name: 'Kente-Trim Wrap Dress', cat: 'female-wears', desc: 'Breathable wrap dress with hand-stitched kente trim at the waist.', variants: [{ size: 'S', color: 'Terracotta', price: 420, stock: 6 }, { size: 'M', color: 'Terracotta', price: 420, stock: 5 }, { size: 'L', color: 'Terracotta', price: 420, stock: 3, low: 3 }] },
    { slug: 'rose-blouse', name: 'Dusty Rose Blouse', cat: 'female-wears', desc: 'Soft-touch blouse in our signature dusty rose.', variants: [{ size: 'S', color: 'Rose', price: 210, stock: 9 }, { size: 'M', color: 'Rose', price: 210, stock: 8 }] },
    { slug: 'ankara-coord', name: 'Ankara Two-Piece Set', cat: 'female-wears', desc: 'Matching cropped top and wide trousers in bold ankara print.', variants: [{ size: 'M', color: 'Gold Print', price: 520, stock: 4 }] },
    { slug: 'coast-slide-slippers', name: 'Coast Slide Slippers', cat: 'slippers', desc: 'Cushioned leather slides — made for Accra heat.', variants: [{ size: '38', color: 'Tan', price: 140, stock: 10 }, { size: '40', color: 'Tan', price: 140, stock: 9 }, { size: '42', color: 'Tan', price: 140, stock: 1, low: 2 }] },
    { slug: 'weave-sandals', name: 'Hand-Woven Strap Sandals', cat: 'slippers', desc: 'Strap sandals with hand-woven uppers.', variants: [{ size: '39', color: 'Natural', price: 175, stock: 6 }] },
    { slug: 'makola-tote', name: 'Makola Market Tote', cat: 'bags', desc: 'Roomy woven tote that fits a laptop and a market run.', variants: [{ color: 'Natural/Indigo', price: 290, stock: 7 }] },
    { slug: 'rose-crossbody', name: 'Rose Crossbody Bag', cat: 'bags', desc: 'Compact crossbody in dusty rose leather.', variants: [{ color: 'Rose', price: 340, stock: 5 }, { color: 'Indigo', price: 340, stock: 4 }] },
    { slug: 'denim-bucket-bag', name: 'Upcycled Denim Bucket Bag', cat: 'bags', desc: 'One-of-a-kind bucket bag from upcycled denim offcuts.', variants: [{ color: 'Patchwork', price: 310, stock: 3, low: 3 }] },
    { slug: 'beaded-hoop-earrings', name: 'Hand-Beaded Hoop Earrings', cat: 'accessories', desc: 'Lightweight hoops wrapped in glass beads.', variants: [{ color: 'Gold/Rose', price: 95, stock: 12 }] },
  ];

  for (const p of products) {
    const existing = await db.product.findUnique({ where: { slug: p.slug } });
    if (existing) continue;
    const prod = await db.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        description: p.desc,
        categoryId: catIds[p.cat],
        images: JSON.stringify([img(p.slug), img(`${p.slug}-detail`)]),
      },
    });
    for (const [i, v] of p.variants.entries()) {
      await db.productVariant.create({
        data: {
          productId: prod.id,
          sku: `${p.slug.toUpperCase().slice(0, 12)}-${i + 1}`,
          size: v.size ?? null,
          color: v.color ?? null,
          priceP: pesewas(v.price),
          stockQuantity: v.stock,
          lowStockThreshold: v.low ?? 3,
        },
      });
    }
  }

  // Accra delivery zones (name + aliases + coordinates for pin matching)
  const zones = [
    { name: 'East Legon', feeP: pesewas(25), aliases: '["east legon","eastlegon","legon"]', lat: 5.636, lng: -0.184 },
    { name: 'Osu', feeP: pesewas(20), aliases: '["oxford street","oxford st"]', lat: 5.556, lng: -0.181 },
    { name: 'Airport Residential', feeP: pesewas(25), aliases: '["airport","airport city"]', lat: 5.605, lng: -0.171 },
    { name: 'Cantonments', feeP: pesewas(20), aliases: '[]', lat: 5.577, lng: -0.173 },
    { name: 'Spintex', feeP: pesewas(30), aliases: '["spintex road"]', lat: 5.631, lng: -0.129 },
    { name: 'Dansoman', feeP: pesewas(30), aliases: '[]', lat: 5.558, lng: -0.254 },
    { name: 'Madina', feeP: pesewas(30), aliases: '["madina market"]', lat: 5.683, lng: -0.166 },
    { name: 'Tema', feeP: pesewas(40), aliases: '["tema community","comm"]', lat: 5.669, lng: -0.017 },
  ];
  for (const z of zones) {
    await db.deliveryZone.upsert({
      where: { name: z.name },
      update: { feeP: z.feeP },
      create: z,
    });
  }

  console.log(`Seeded: owner ${owner.email}, ${cats.length} categories, ${products.length} products, ${zones.length} zones.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
