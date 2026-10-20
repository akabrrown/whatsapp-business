import 'dotenv/config';
import { db } from '../src/db.js';

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

async function restore() {
  console.log('--- Checking current database state ---');
  const allCats = await db.category.findMany({
    select: { id: true, name: true, slug: true, parentId: true, _count: { select: { products: true } } },
  });
  console.log(`Current total categories: ${allCats.length}`);
  const mens = allCats.filter((c) => c.slug === 'mens-fashion' || c.name === "Men's Fashion");
  console.log(`Men's fashion found: ${mens.length}`);

  console.log("--- Restoring Men's Fashion & Women's Fashion structure ---");
  const mainCategories = [
    {
      name: "Men's Fashion",
      slug: 'mens-fashion',
      flagship: true,
      image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800&q=80',
    },
    {
      name: "Women's Fashion",
      slug: 'womens-fashion',
      flagship: true,
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80',
    },
  ];

  let createdCount = 0;
  let updatedCount = 0;

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
      updatedCount++;
    } else {
      parent = await db.category.create({
        data: { name: mainCat.name, slug: mainCat.slug, flagship: true, image: mainCat.image },
      });
      createdCount++;
    }

    const subMap =
      mainCat.slug.includes('men') && !mainCat.slug.includes('women')
        ? menSubcategories
        : womenSubcategories;

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
        createdCount++;
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
          createdCount++;
        }
      }
    }
  }

  const finalCats = await db.category.findMany({ select: { id: true, name: true, parentId: true } });
  console.log(`Restore complete. Created: ${createdCount}, Updated: ${updatedCount}. Total categories in DB: ${finalCats.length}`);
  process.exit(0);
}

restore().catch((err) => {
  console.error('Restore failed:', err);
  process.exit(1);
});
