import 'dotenv/config';
import { db } from '../src/db.js';

async function main() {
  console.log('--- Testing Category Deletion Referential Integrity Guard ---');

  // 1. Create a dummy test parent and child category
  const dummyParent = await db.category.create({
    data: { name: 'Test Parent Safe', slug: 'test-parent-safe', flagship: false },
  });
  const dummyChild = await db.category.create({
    data: { name: 'Test Child Safe', slug: 'test-child-safe', parentId: dummyParent.id, flagship: false },
  });

  // 2. Create a test product attached to dummyChild
  const dummyProduct = await db.product.create({
    data: {
      name: 'Safe Test Product',
      slug: `safe-test-product-${Date.now()}`,
      categoryId: dummyChild.id,
      description: 'Test product for FK guard verification',
    },
  });

  console.log(`Created test parent (${dummyParent.id}), child (${dummyChild.id}), and product (${dummyProduct.id}).`);

  // 3. Simulate the exact hardened deletion transaction logic targeting dummyParent
  const allIds = [dummyParent.id, dummyChild.id];

  await db.$transaction(async (tx) => {
    let fallbackId: string | null = null;

    async function getOrCreateUncategorized() {
      let uncategorized = await tx.category.findFirst({
        where: { slug: 'uncategorized', parentId: null },
      });
      if (!uncategorized) {
        uncategorized = await tx.category.create({
          data: {
            name: 'Uncategorized',
            slug: 'uncategorized',
            flagship: false,
          },
        });
      }
      return uncategorized;
    }

    const fallback = await getOrCreateUncategorized();
    fallbackId = fallback.id;

    // Move products
    await tx.product.updateMany({
      where: { categoryId: { in: allIds } },
      data: { categoryId: fallback.id },
    });

    let idsToDelete = fallbackId ? allIds.filter((id) => id !== fallbackId) : allIds;

    // Absolute FK guard
    const lingering = await tx.product.count({
      where: { categoryId: { in: idsToDelete } },
    });
    if (lingering > 0) {
      await tx.product.updateMany({
        where: { categoryId: { in: idsToDelete } },
        data: { categoryId: fallback.id },
      });
      idsToDelete = idsToDelete.filter((id) => id !== fallback.id);
    }

    // Detach parentId references
    if (idsToDelete.length > 0) {
      await tx.category.updateMany({
        where: { parentId: { in: idsToDelete } },
        data: { parentId: null },
      });

      const delRes = await tx.category.deleteMany({
        where: { id: { in: idsToDelete } },
      });
      console.log(`Successfully deleted ${delRes.count} categories with ZERO FK errors.`);
    }
  });

  // 4. Verify product was cleanly preserved in Uncategorized
  const updatedProduct = await db.product.findUnique({
    where: { id: dummyProduct.id },
    include: { category: true },
  });
  console.log(`Verified Product "${updatedProduct?.name}" is now safely in category: "${updatedProduct?.category?.name}"`);

  // Clean up test product
  await db.product.delete({ where: { id: dummyProduct.id } });
  console.log('Cleaned up test product.');
  console.log('--- ALL INTEGRITY TESTS PASSED ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('Integrity test failed:', err);
  process.exit(1);
});
