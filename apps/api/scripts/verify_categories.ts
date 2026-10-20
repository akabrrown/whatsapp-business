import 'dotenv/config';
import { db } from '../src/db.js';

async function main() {
  const topCategories = await db.category.findMany({
    where: { parentId: null },
    include: {
      children: {
        include: {
          children: true,
          _count: { select: { products: true } },
        },
      },
      _count: { select: { products: true } },
    },
    orderBy: { name: 'asc' },
  });

  console.log(`Found ${topCategories.length} top-level categories:`);
  for (const top of topCategories) {
    const subCount = top.children.length;
    const typeCount = top.children.reduce((acc, sub) => acc + sub.children.length, 0);
    console.log(`- ${top.name} (${top.slug}): ${subCount} subcategories, ${typeCount} types/sub-subs, ${top._count.products} products directly attached`);
  }

  const total = await db.category.count();
  console.log(`\nTotal categories in database: ${total}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
