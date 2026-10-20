import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const originalUrl = process.env.DATABASE_URL || '';
// Use transaction pooler (port 6543) or direct connection with connection_limit=1 to avoid EMAXCONNSESSION
const poolerUrl = originalUrl.includes(':5432')
  ? originalUrl.replace(':5432', ':6543')
  : originalUrl;

const db = new PrismaClient({
  datasources: { db: { url: poolerUrl } },
});

async function main() {
  console.log('--- Deleting Uncategorized category and its test products ---');

  const uncategorized = await db.category.findFirst({
    where: { slug: 'uncategorized', parentId: null },
    include: { products: { include: { variants: true } } },
  });

  if (!uncategorized) {
    console.log('Uncategorized category does not exist.');
    await db.$disconnect();
    process.exit(0);
  }

  console.log(`Found Uncategorized category (${uncategorized.id}) with ${uncategorized.products.length} product(s).`);

  await db.$transaction(async (tx) => {
    // Delete variants and products
    for (const p of uncategorized.products) {
      const vIds = p.variants.map((v) => v.id);
      if (vIds.length > 0) {
        await tx.tokenItem.deleteMany({ where: { variantId: { in: vIds } } });
        await tx.inventoryLog.deleteMany({ where: { variantId: { in: vIds } } });
        await tx.productVariant.deleteMany({ where: { id: { in: vIds } } });
      }
      await tx.product.delete({ where: { id: p.id } });
      console.log(`Deleted product: ${p.name}`);
    }

    // Delete Uncategorized category
    await tx.category.delete({
      where: { id: uncategorized.id },
    });
    console.log('Deleted Uncategorized category.');
  });

  const remaining = await db.category.findMany({
    where: { parentId: null },
    include: {
      children: { include: { children: true } },
      _count: { select: { products: true } },
    },
  });

  console.log('\n--- Active Top-Level Categories ---');
  for (const c of remaining) {
    const subCount = c.children.length;
    const typeCount = c.children.reduce((acc, sub) => acc + sub.children.length, 0);
    console.log(`• ${c.name} (${c.slug}): ${subCount} subcategories, ${typeCount} types, ${c._count.products} products directly attached`);
  }

  const total = await db.category.count();
  console.log(`\nTotal categories in database: ${total}`);
  await db.$disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Failed to delete Uncategorized:', err);
  await db.$disconnect();
  process.exit(1);
});
