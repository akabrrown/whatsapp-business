// Seed Tier 3 "Type" categories under existing subcategories.
// Also fixes naming: Earwear → Eyewear, Buttoms → Bottoms
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// Map: subcategory DB name → types to create
const menTypes: Record<string, string[]> = {
  'Headwears': ['Caps', 'Beanies', 'Hats'],
  'Eyewear': ['Sunglasses', 'Optical Frames'],      // was "Earwear" — renamed below
  'Neckwear': ['Ties', 'Scarves', 'Bow Ties'],
  'Tops': ['Shirts', 'Polo Shirts', 'T-Shirts', 'Sweaters'],
  'Outerwears': ['Jackets', 'Coats', 'Vests'],
  'Bottoms': ['Chinos', 'Jeans', 'Trousers', 'Shorts'],  // was "Buttoms" — renamed below
  'Footwears': ['Oxfords', 'Boots', 'Sneakers', 'Loafers'],
  'Socks & Underwear': [],  // no sub-types
  'Accessories': ['Belts', 'Watches', 'Bracelets'],
  'Bags & Small Goods': ['Backpacks', 'Briefcases', 'Wallets'],
};

const womenTypes: Record<string, string[]> = {
  'Headwears': ['Caps', 'Beanies', 'Sun Hats', 'Headbands'],
  'Eyewears': ['Sunglasses', 'Optical Frames'],
  'Jewelry & Neckwears': ['Necklaces', 'Earrings', 'Scarves', 'Bandanas'],
  'Tops & Blouses': ['T-Shirts', 'Blouses', 'Crop Tops', 'Shirts', 'Sweaters'],
  'Dresses & Jumpsuits': ['Maxi', 'Midi', 'Mini', 'Rompers', 'Gowns'],
  'Outerwears': ['Jackets', 'Trench Coats', 'Blazers', 'Cardigans'],
  'Bottoms': ['Skirts', 'Jeans', 'Trousers', 'Shorts', 'Leggings'], // was "Buttoms"
  'Footwears': ['Heels', 'Flats', 'Sneakers', 'Boots', 'Sandals'],
  'Lingerie & Socks': ['Bras', 'Panties', 'Shapewear', 'Socks', 'Tights'],
  'Accessories': ['Belts', 'Watches', 'Bracelets', 'Hair Accessories'],
  'Bags & Wallets': [],  // no sub-types specified
};

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  // Step 1: Find main categories
  const menMain = await db.category.findFirst({ where: { name: "Men's Fashion", parentId: null } });
  const womenMain = await db.category.findFirst({ where: { name: "Women's Fashion", parentId: null } });

  if (!menMain || !womenMain) {
    console.error('Main categories not found!');
    process.exit(1);
  }

  // Fix "Earwear" → "Eyewear"
  const earwear = await db.category.findFirst({ where: { name: 'Earwear', parentId: menMain.id } });
  if (earwear) {
    await db.category.update({ where: { id: earwear.id }, data: { name: 'Eyewear', slug: 'eyewear' } });
    console.log('Renamed: Earwear -> Eyewear (Men\'s Fashion)');
  }

  // Fix "Buttoms" → "Bottoms" under Men's
  const menButtoms = await db.category.findFirst({ where: { name: 'Buttoms', parentId: menMain.id } });
  if (menButtoms) {
    await db.category.update({ where: { id: menButtoms.id }, data: { name: 'Bottoms', slug: 'bottoms' } });
    console.log('Renamed: Buttoms -> Bottoms (Men\'s Fashion)');
  }

  // Fix "Buttoms" → "Bottoms" under Women's
  const womenButtoms = await db.category.findFirst({ where: { name: 'Buttoms', parentId: womenMain.id } });
  if (womenButtoms) {
    await db.category.update({ where: { id: womenButtoms.id }, data: { name: 'Bottoms', slug: 'bottoms' } });
    console.log('Renamed: Buttoms -> Bottoms (Women\'s Fashion)');
  }

  // Rename "Bags & Wallets" → "Bags & Small Goods" under Men's
  const menBags = await db.category.findFirst({ where: { name: 'Bags & Wallets', parentId: menMain.id } });
  if (menBags) {
    await db.category.update({ where: { id: menBags.id }, data: { name: 'Bags & Small Goods', slug: 'bags-small-goods' } });
    console.log('Renamed: Bags & Wallets -> Bags & Small Goods (Men\'s Fashion)');
  }

  // Step 2: Seed Tier 3 types
  let created = 0;
  let skipped = 0;

  async function seedTypes(mainId: string, mainName: string, typeMap: Record<string, string[]>) {
    const subs = await db.category.findMany({ where: { parentId: mainId } });

    for (const [subName, types] of Object.entries(typeMap)) {
      if (types.length === 0) continue;

      const sub = subs.find(s => s.name === subName);
      if (!sub) {
        console.warn('  WARNING: Subcategory "' + subName + '" not found under ' + mainName + ' - skipping');
        continue;
      }

      for (const typeName of types) {
        const slug = toSlug(typeName);
        const exists = await db.category.findFirst({
          where: { name: typeName, parentId: sub.id }
        });

        if (exists) {
          skipped++;
          continue;
        }

        await db.category.create({
          data: { name: typeName, slug, parentId: sub.id }
        });
        created++;
        console.log('  + ' + mainName + ' > ' + subName + ' > ' + typeName);
      }
    }
  }

  console.log('\n--- Men\'s Fashion Types ---');
  await seedTypes(menMain.id, "Men's Fashion", menTypes);

  console.log('\n--- Women\'s Fashion Types ---');
  await seedTypes(womenMain.id, "Women's Fashion", womenTypes);

  console.log('\nDone! Created: ' + created + ', Skipped (already exist): ' + skipped);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
