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
          const maxAttempts = 5;
          while (true) {
            try {
              return await query(args);
            } catch (err: any) {
              attempts++;
              const msg = String(err?.message ?? '');
              const code = String(err?.code ?? '');
              const isTransient =
                code === 'P1001' ||
                code === 'P1002' ||
                code === 'P1008' ||
                code === 'P1017' ||
                code === 'ETIMEDOUT' ||
                code === 'ECONNRESET' ||
                code === 'EAI_AGAIN' ||
                code === 'ENOTFOUND' ||
                msg.includes('Server has closed the connection') ||
                msg.includes('connection closed') ||
                msg.includes('forcibly closed by the remote host') ||
                msg.includes('Can\'t reach database server') ||
                msg.includes('Connection terminated') ||
                msg.includes('socket hang up') ||
                msg.includes('pooler');

              if (isTransient && attempts < maxAttempts) {
                const backoffMs = Math.min(800 * Math.pow(1.5, attempts), 4000);
                await new Promise((resolve) => setTimeout(resolve, backoffMs));
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

let _client: any = null;

function getClient(): PrismaClient {
  if (!_client) {
    _client = createPrismaClient();
  }
  return _client;
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
