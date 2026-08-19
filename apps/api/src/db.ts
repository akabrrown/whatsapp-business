import { PrismaClient } from '@prisma/client';

function createPrismaClient() {
  const client = new PrismaClient({
    log: ['error'],
  });

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          let attempts = 0;
          const maxAttempts = 3;
          while (true) {
            try {
              return await query(args);
            } catch (err: any) {
              attempts++;
              const isTransient =
                err?.code === 'P1001' ||
                err?.code === 'P1017' ||
                err?.message?.includes('Server has closed the connection') ||
                err?.message?.includes('connection closed') ||
                err?.message?.includes('Can\'t reach database server');

              if (isTransient && attempts < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 600 * attempts));
                continue;
              }
              throw err;
            }
          }
        },
      },
    },
  });
}

export const db = createPrismaClient() as unknown as PrismaClient;
