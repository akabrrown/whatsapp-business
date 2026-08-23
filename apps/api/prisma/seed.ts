// Seed: Men's Fashion & Women's Fashion with full 3-tier subcategories & types,
// Accra delivery zones, and owner account.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { pesewas } from '@rose/shared';

const db = new PrismaClient();

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const menSubcategories: Record<string, string[]> = {
  'Tops': ['T-Shirts', 'Shirts', 'Polo Shirts', 'Sweaters', 'Hoodies'],
  'Bottoms': ['Jeans', 'Trousers', 'Chinos', 'Shorts', 'Cargo Pants'],
  'Footwears': ['Sneakers', 'Loafers', 'Oxfords', 'Boots', 'Slides & Slippers'],
  'Outerwears': ['Jackets', 'Coats', 'Blazers', 'Vests'],
  'Headwears': ['Caps', 'Beanies', 'Hats', 'Durags'],
  'Eyewear': ['Sunglasses', 'Optical Frames'],
  'Neckwear': ['Ties', 'Scarves', 'Bow Ties', 'Chains'],
  'Accessories': ['Belts', 'Watches', 'Bracelets', 'Rings'],
  'Bags & Small Goods': ['Backpacks', 'Crossbody Bags', 'Briefcases', 'Wallets'],
  'Socks & Underwear': ['Boxers', 'Briefs', 'Socks'],
};

const womenSubcategories: Record<string, string[]> = {
  'Tops & Blouses': ['T-Shirts', 'Blouses', 'Crop Tops', 'Shirts', 'Sweaters', 'Corsets'],
  'Dresses & Jumpsuits': ['Maxi Dresses', 'Midi Dresses', 'Mini Dresses', 'Rompers', 'Gowns'],
  'Bottoms': ['Jeans', 'Skirts', 'Trousers', 'Shorts', 'Leggings', 'Palazzos'],
  'Footwears': ['Heels', 'Flats', 'Sneakers', 'Sandals', 'Boots', 'Slippers'],
  'Outerwears': ['Jackets', 'Trench Coats', 'Blazers', 'Cardigans', 'Kimonos'],
  'Headwears': ['Caps', 'Beanies', 'Sun Hats', 'Headbands', 'Berets'],
  'Eyewears': ['Sunglasses', 'Cat Eye Frames', 'Optical Frames'],
  'Jewelry & Neckwears': ['Necklaces', 'Earrings', 'Bracelets', 'Scarves', 'Anklets'],
  'Bags & Wallets': ['Tote Bags', 'Handbags', 'Clutches', 'Crossbody Bags', 'Wallets'],
  'Lingerie & Socks': ['Bras', 'Panties', 'Shapewear', 'Nightwear', 'Socks', 'Tights'],
  'Accessories': ['Belts', 'Watches', 'Hair Accessories', 'Sunglasses Cases'],
};

async function main() {
  console.log('Seeding TOBI CLOTHINGS database...');

  // 1. Owner account
  const owner = await db.adminUser.upsert({
    where: { email: process.env.OWNER_EMAIL ?? 'akayetb@gmail.com' },
    update: {},
    create: {
      email: process.env.OWNER_EMAIL ?? 'akayetb@gmail.com',
      name: 'Tobi',
      role: 'owner',
      password: await bcrypt.hash(process.env.OWNER_PASSWORD ?? 'Option#5', 10),
    },
  });

  // 2. Main Categories: Men's Fashion & Women's Fashion
  const mainCategories = [
    { name: "Men's Fashion", slug: 'mens-fashion', flagship: true, image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800&q=80' },
    { name: "Women's Fashion", slug: 'womens-fashion', flagship: true, image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80' },
  ];

  for (const mainCat of mainCategories) {
    let parent = await db.category.findFirst({
      where: {
        OR: [
          { name: mainCat.name, parentId: null },
          { slug: mainCat.slug, parentId: null },
        ],
      },
    });

    if (parent) {
      parent = await db.category.update({
        where: { id: parent.id },
        data: { name: mainCat.name, slug: mainCat.slug, flagship: true, image: mainCat.image },
      });
    } else {
      parent = await db.category.create({
        data: { name: mainCat.name, slug: mainCat.slug, flagship: true, image: mainCat.image },
      });
    }

    const subMap = mainCat.slug.includes('men') && !mainCat.slug.includes('women') ? menSubcategories : womenSubcategories;

    // Seed Tier 2 Subcategories
    for (const [subName, types] of Object.entries(subMap)) {
      const subSlug = toSlug(subName);
      let sub = await db.category.findFirst({
        where: {
          name: subName,
          parentId: parent.id,
        },
      });

      if (!sub) {
        sub = await db.category.create({
          data: {
            name: subName,
            slug: `${parent.slug}-${subSlug}`,
            parentId: parent.id,
          },
        });
      }

      // Seed Tier 3 Types
      for (const typeName of types) {
        const typeSlug = toSlug(typeName);
        const existingType = await db.category.findFirst({
          where: {
            name: typeName,
            parentId: sub.id,
          },
        });

        if (!existingType) {
          await db.category.create({
            data: {
              name: typeName,
              slug: `${sub.slug}-${typeSlug}`,
              parentId: sub.id,
            },
          });
        }
      }
    }
  }

  // 3. Accra Delivery Zones
  const zones = [
    { name: 'East Legon', feeP: pesewas(25), aliases: '["east legon","eastlegon","legon","american house"]', lat: 5.636, lng: -0.184 },
    { name: 'Osu', feeP: pesewas(20), aliases: '["oxford street","oxford st","ring road"]', lat: 5.556, lng: -0.181 },
    { name: 'Airport Residential', feeP: pesewas(25), aliases: '["airport","airport city","dzorwulu"]', lat: 5.605, lng: -0.171 },
    { name: 'Cantonments', feeP: pesewas(20), aliases: '["labone","switchback"]', lat: 5.577, lng: -0.173 },
    { name: 'Spintex', feeP: pesewas(30), aliases: '["spintex road","sakumono","batsonaa"]', lat: 5.631, lng: -0.129 },
    { name: 'Dansoman', feeP: pesewas(30), aliases: '["dansoman estate","korle bu"]', lat: 5.558, lng: -0.254 },
    { name: 'Madina', feeP: pesewas(30), aliases: '["madina market","adenta"]', lat: 5.683, lng: -0.166 },
    { name: 'Tema', feeP: pesewas(40), aliases: '["tema community","comm 1","comm 25"]', lat: 5.669, lng: -0.017 },
  ];

  for (const z of zones) {
    await db.deliveryZone.upsert({
      where: { name: z.name },
      update: { feeP: z.feeP, aliases: z.aliases, lat: z.lat, lng: z.lng },
      create: z,
    });
  }

  console.log(`Seeding complete: Men's Fashion & Women's Fashion structure with all subcategories and delivery zones active.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
