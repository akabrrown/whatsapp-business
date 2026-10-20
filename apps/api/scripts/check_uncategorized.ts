import 'dotenv/config';
import { db } from '../src/db.js';

async function main() {
  const products = await db.product.findMany({
    where: { category: { slug: 'uncategorized' } },
    include: {
      variants: {
        include: {
          orderItems: true,
          tokenItems: true,
          inventoryLogs: true,
        },
      },
      orderItems: true,
    },
  });

  console.log(`Found ${products.length} products in Uncategorized:`);
  for (const p of products) {
    console.log(`- ${p.name} (id: ${p.id}, slug: ${p.slug})`);
    console.log(`  Variants: ${p.variants.length}`);
    console.log(`  OrderItems: ${p.orderItems.length}`);
    const tokenCount = p.variants.reduce((a, v) => a + v.tokenItems.length, 0);
    console.log(`  TokenItems: ${tokenCount}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
