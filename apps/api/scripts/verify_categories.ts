import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const originalUrl = process.env.DATABASE_URL || '';
// In transaction mode (port 6543), Prisma MUST have pgbouncer=true to disable prepared statements!
let poolerUrl = originalUrl.replace(':5432', ':6543');
if (!poolerUrl.includes('pgbouncer=true')) {
  poolerUrl += (poolerUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
}

console.log('Testing connection to:', poolerUrl.replace(/:[^:@]+@/, ':***@'));

const db = new PrismaClient({ datasources: { db: { url: poolerUrl } } });

async function main() {
  const allCategories = await db.category.findMany({
    select: { id: true, name: true, slug: true, parentId: true, _count: { select: { products: true, children: true } } },
    orderBy: { name: 'asc' },
  });

  console.log(`Total categories: ${allCategories.length}`);
  const topLevel = allCategories.filter((c) => !c.parentId);
  console.log(`Top-level categories (${topLevel.length}):`);
  for (const top of topLevel) {
    console.log(`- "${top.name}" (slug: ${top.slug}, id: ${top.id}, children: ${top._count.children}, products: ${top._count.products})`);
  }

  const allProducts = await db.product.findMany({
    select: { id: true, name: true, slug: true, category: { select: { id: true, name: true, slug: true } } },
  });
  console.log(`Total products in database: ${allProducts.length}`);
  for (const p of allProducts) {
    console.log(`• Product: "${p.name}" (slug: ${p.slug}) in Category "${p.category.name}" (slug: ${p.category.slug})`);
  }

  await db.$disconnect();
  console.log('SUCCESS! Connection works flawlessly with pgbouncer=true on port 6543.');
  process.exit(0);
}

main().catch(async (e) => {
  console.error('Error:', e);
  await db.$disconnect();
  process.exit(1);
});
