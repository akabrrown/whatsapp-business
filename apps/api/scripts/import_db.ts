import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importDatabase() {
  const backupPath = path.resolve(process.cwd(), 'db_backup', 'backup_data.json');
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup file not found at: ${backupPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(backupPath, 'utf-8');
  const backup = JSON.parse(rawData);
  const data = backup.data;

  console.log(`🚀 Starting database import from backup (${backup.metadata?.exportedAt})...`);

  try {
    // 1. Admin Users
    if (data.adminUsers?.length) {
      console.log(`Importing ${data.adminUsers.length} admin users...`);
      for (const item of data.adminUsers) {
        await prisma.adminUser.upsert({
          where: { email: item.email },
          update: item,
          create: item,
        });
      }
    }

    // 2. Settings
    if (data.settings?.length) {
      console.log(`Importing ${data.settings.length} settings...`);
      for (const item of data.settings) {
        await prisma.setting.upsert({
          where: { key: item.key },
          update: item,
          create: item,
        });
      }
    }

    // 3. Delivery Zones
    if (data.deliveryZones?.length) {
      console.log(`Importing ${data.deliveryZones.length} delivery zones...`);
      for (const item of data.deliveryZones) {
        await prisma.deliveryZone.upsert({
          where: { name: item.name },
          update: item,
          create: item,
        });
      }
    }

    // 4. Categories (Parent first, then children)
    if (data.categories?.length) {
      console.log(`Importing ${data.categories.length} categories...`);
      const parents = data.categories.filter((c: any) => !c.parentId);
      const children = data.categories.filter((c: any) => c.parentId);

      for (const item of parents) {
        await prisma.category.upsert({
          where: { id: item.id },
          update: item,
          create: item,
        });
      }
      for (const item of children) {
        await prisma.category.upsert({
          where: { id: item.id },
          update: item,
          create: item,
        });
      }
    }

    // 5. Products & Variants
    if (data.products?.length) {
      console.log(`Importing ${data.products.length} products...`);
      for (const item of data.products) {
        await prisma.product.upsert({
          where: { id: item.id },
          update: item,
          create: item,
        });
      }
    }

    if (data.productVariants?.length) {
      console.log(`Importing ${data.productVariants.length} product variants...`);
      for (const item of data.productVariants) {
        await prisma.productVariant.upsert({
          where: { id: item.id },
          update: item,
          create: item,
        });
      }
    }

    // 6. Customers
    if (data.customers?.length) {
      console.log(`Importing ${data.customers.length} customers...`);
      for (const item of data.customers) {
        await prisma.customer.upsert({
          where: { id: item.id },
          update: item,
          create: item,
        });
      }
    }

    // 7. Orders & OrderItems
    if (data.orders?.length) {
      console.log(`Importing ${data.orders.length} orders...`);
      for (const item of data.orders) {
        await prisma.order.upsert({
          where: { id: item.id },
          update: item,
          create: item,
        });
      }
    }

    if (data.orderItems?.length) {
      console.log(`Importing ${data.orderItems.length} order items...`);
      for (const item of data.orderItems) {
        await prisma.orderItem.upsert({
          where: { id: item.id },
          update: item,
          create: item,
        });
      }
    }

    // 8. Payments
    if (data.payments?.length) {
      console.log(`Importing ${data.payments.length} payments...`);
      for (const item of data.payments) {
        await prisma.payment.upsert({
          where: { id: item.id },
          update: item,
          create: item,
        });
      }
    }

    // 9. Order Tokens & Token Items
    if (data.orderTokens?.length) {
      console.log(`Importing ${data.orderTokens.length} order tokens...`);
      for (const item of data.orderTokens) {
        await prisma.orderToken.upsert({
          where: { id: item.id },
          update: item,
          create: item,
        });
      }
    }

    if (data.tokenItems?.length) {
      console.log(`Importing ${data.tokenItems.length} token items...`);
      for (const item of data.tokenItems) {
        await prisma.tokenItem.upsert({
          where: { id: item.id },
          update: item,
          create: item,
        });
      }
    }

    // 10. Device Push Subscriptions
    if (data.devicePushSubscriptions?.length) {
      console.log(`Importing ${data.devicePushSubscriptions.length} push subscriptions...`);
      for (const item of data.devicePushSubscriptions) {
        await prisma.devicePushSubscription.upsert({
          where: { endpoint: item.endpoint },
          update: item,
          create: item,
        });
      }
    }

    console.log('\n===========================================');
    console.log('🎉 ALL DATA SUCCESSFULLY RESTORED/IMPORTED!');
    console.log('===========================================');
  } catch (error) {
    console.error('❌ Error during database import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importDatabase();
