// One-shot catalog reset — wipes orders + products so the store starts clean.
// Keeps: categories, delivery zones, admin users, conversations.
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const counts = {
    orderItems: await db.orderItem.deleteMany(),
    tokenItems: await db.tokenItem.deleteMany(),
    orderTokens: await db.orderToken.deleteMany(),
    payments: await db.payment.deleteMany(),
    inventoryLogs: await db.inventoryLog.deleteMany(),
    orders: await db.order.deleteMany(),
    retentionStates: await db.retentionState.deleteMany(),
    variants: await db.productVariant.deleteMany(),
    products: await db.product.deleteMany(),
  };
  console.log('Catalog reset:', JSON.stringify(counts, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
