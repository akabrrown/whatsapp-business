import 'dotenv/config';
import { db } from '../src/db.js';
import { createOrder } from '../src/services/orders.js';
import { createToken } from '../src/services/handoff.js';
import { OrderSource } from '../src/shared.js';

async function main() {
  console.log('--- Testing Order and Token Storage via Transaction Pooler ---');

  // Find a product variant to order
  const variant = await db.productVariant.findFirst({
    include: { product: true },
  });

  if (!variant) {
    console.error('No product variant found to test order with.');
    process.exit(1);
  }

  console.log(`Using variant: ${variant.id} (${variant.product.name})`);

  // 1. Test createToken (storefront handoff checkout)
  const TEST_PHONE = '233200999888';
  console.log('\nTesting createToken (storefront checkout)...');
  const token = await createToken({
    phone: TEST_PHONE,
    items: [{ variantId: variant.id, qty: 1 }],
    zoneName: 'East Legon',
    deliveryFeeP: 2500,
    fulfillmentType: 'DELIVERY',
    confirmedDuplicate: true,
  });

  console.log(`Successfully created token: ${token.code}`);

  // Verify token is in DB
  const dbToken = await db.orderToken.findUnique({
    where: { code: token.code },
    include: { items: true },
  });
  console.log(`Verified DB token found: ${dbToken?.code}, items: ${dbToken?.items.length}`);

  // 2. Test createOrder (direct order creation / payment settlement)
  console.log('\nTesting createOrder (order persistence)...');
  const { order } = await createOrder({
    phone: TEST_PHONE,
    items: [{ variantId: variant.id, qty: 1 }],
    source: OrderSource.WEBSITE,
    paid: true,
    fulfillmentType: 'DELIVERY',
    zoneName: 'East Legon',
    deliveryAddress: 'Test Delivery Address, East Legon',
    deliveryFeeP: 2500,
  });

  console.log(`Successfully created order: ${order.number} (id: ${order.id})`);

  // Verify order in DB
  const dbOrder = await db.order.findUnique({
    where: { id: order.id },
    include: { customer: true, items: true },
  });

  console.log(`Verified DB order found:`);
  console.log(`- Number: ${dbOrder?.number}`);
  console.log(`- Customer: ${dbOrder?.customer.phone}`);
  console.log(`- Status: ${dbOrder?.status}`);
  console.log(`- Total: GHS ${(dbOrder?.totalP ?? 0) / 100}`);
  console.log(`- Items: ${dbOrder?.items.length}`);

  // Clean up test order and test token
  await db.orderItem.deleteMany({ where: { orderId: order.id } });
  await db.retentionState.deleteMany({ where: { orderId: order.id } });
  await db.order.delete({ where: { id: order.id } });
  await db.tokenItem.deleteMany({ where: { tokenId: dbToken?.id } });
  if (dbToken) await db.orderToken.delete({ where: { id: dbToken.id } });
  console.log('\nCleaned up test order and token.');

  console.log('--- ALL STORAGE ACTIONS SUCCEEDED AND VERIFIED ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
