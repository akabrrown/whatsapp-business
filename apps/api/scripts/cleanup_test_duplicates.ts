import 'dotenv/config';
import { db } from '../src/db.js';

async function main() {
  console.log('--- Cleaning up orphan test duplicate categories ---');

  // Find all top-level categories named Jeans or Bags with 0 children
  const orphans = await db.category.findMany({
    where: {
      parentId: null,
      name: { in: ['Jeans', 'Bags'] },
      children: { none: {} },
    },
    include: {
      _count: { select: { products: true } },
    },
  });

  console.log(`Found ${orphans.length} orphan Jeans/Bags test categories.`);

  // Find or ensure Uncategorized exists for any products attached to orphans
  let uncategorized = await db.category.findFirst({
    where: { slug: 'uncategorized', parentId: null },
  });
  if (!uncategorized) {
    uncategorized = await db.category.create({
      data: { name: 'Uncategorized', slug: 'uncategorized', flagship: false },
    });
  }

  const orphanIds = orphans.map((o) => o.id);

  // Move any products on these orphans to Uncategorized
  const moved = await db.product.updateMany({
    where: { categoryId: { in: orphanIds } },
    data: { categoryId: uncategorized.id },
  });
  console.log(`Moved ${moved.count} products to Uncategorized.`);

  // Delete the orphan categories
  const deleted = await db.category.deleteMany({
    where: { id: { in: orphanIds } },
  });
  console.log(`Deleted ${deleted.count} orphan test categories.`);

  const remaining = await db.category.findMany({
    where: { parentId: null },
    include: {
      children: { include: { children: true } },
      _count: { select: { products: true } },
    },
  });

  console.log('\n--- Final Top-Level Categories ---');
  for (const c of remaining) {
    const subCount = c.children.length;
    const typeCount = c.children.reduce((acc, sub) => acc + sub.children.length, 0);
    console.log(`• ${c.name} (${c.slug}): ${subCount} subcategories, ${typeCount} types, ${c._count.products} products directly attached`);
  }

  const total = await db.category.count();
  console.log(`\nTotal clean categories in database: ${total}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
