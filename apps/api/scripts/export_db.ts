import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportDatabase() {
  console.log('🔄 Connecting to Supabase database and exporting all tables...');

  try {
    const [
      categories,
      products,
      productVariants,
      customers,
      orders,
      orderItems,
      payments,
      orderTokens,
      tokenItems,
      deliveryZones,
      adminUsers,
      retentionStates,
      settings,
      devicePushSubscriptions,
      inventoryLogs,
      webhookEvents
    ] = await Promise.all([
      prisma.category.findMany(),
      prisma.product.findMany(),
      prisma.productVariant.findMany(),
      prisma.customer.findMany(),
      prisma.order.findMany(),
      prisma.orderItem.findMany(),
      prisma.payment.findMany(),
      prisma.orderToken.findMany(),
      prisma.tokenItem.findMany(),
      prisma.deliveryZone.findMany(),
      prisma.adminUser.findMany(),
      prisma.retentionState.findMany(),
      prisma.setting.findMany(),
      prisma.devicePushSubscription.findMany(),
      prisma.inventoryLog.findMany(),
      prisma.webhookEvent.findMany()
    ]);

    const backup = {
      metadata: {
        exportedAt: new Date().toISOString(),
        tables: {
          categories: categories.length,
          products: products.length,
          productVariants: productVariants.length,
          customers: customers.length,
          orders: orders.length,
          orderItems: orderItems.length,
          payments: payments.length,
          orderTokens: orderTokens.length,
          tokenItems: tokenItems.length,
          deliveryZones: deliveryZones.length,
          adminUsers: adminUsers.length,
          retentionStates: retentionStates.length,
          settings: settings.length,
          devicePushSubscriptions: devicePushSubscriptions.length,
          inventoryLogs: inventoryLogs.length,
          webhookEvents: webhookEvents.length
        }
      },
      data: {
        categories,
        products,
        productVariants,
        customers,
        orders,
        orderItems,
        payments,
        orderTokens,
        tokenItems,
        deliveryZones,
        adminUsers,
        retentionStates,
        settings,
        devicePushSubscriptions,
        inventoryLogs,
        webhookEvents
      }
    };

    const outputDir = path.resolve(process.cwd(), 'db_backup');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'backup_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2), 'utf-8');

    console.log('\n===========================================');
    console.log('✅ DATABASE EXPORT COMPLETED SUCCESSFULLY!');
    console.log('===========================================');
    console.log(`Saved to: ${outputPath}`);
    console.log('Table Summary:');
    console.table(backup.metadata.tables);

  } catch (error) {
    console.error('❌ Error exporting database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportDatabase();
