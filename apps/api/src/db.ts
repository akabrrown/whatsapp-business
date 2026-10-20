import { PrismaClient } from '@prisma/client';

function getDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Supabase pooler optimization:
  // If using pooler.supabase.com, route from session mode (5432) to transaction mode (6543)
  // and ensure pgbouncer=true to prevent prepared statement collisions and EMAXCONNSESSION.
  if (url.includes('pooler.supabase.com')) {
    if (url.includes(':5432')) {
      url = url.replace(':5432', ':6543');
    }
    if (!url.includes('pgbouncer=true')) {
      url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true';
    }
    // Set a lean connection limit suitable for serverless functions (default 1 per instance)
    if (!url.includes('connection_limit=')) {
      url += '&connection_limit=1';
    } else {
      url = url.replace(/connection_limit=\d+/, 'connection_limit=1');
    }
  }
  return url;
}

function createPrismaClient() {
  const dbUrl = getDatabaseUrl();
  const client = new PrismaClient({
    ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
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
                code === '42P05' ||
                msg.includes('Server has closed the connection') ||
                msg.includes('connection closed') ||
                msg.includes('forcibly closed by the remote host') ||
                msg.includes('Can\'t reach database server') ||
                msg.includes('Connection terminated') ||
                msg.includes('socket hang up') ||
                msg.includes('pooler') ||
                msg.includes('EMAXCONNSESSION') ||
                msg.includes('max clients reached') ||
                msg.includes('prepared statement');

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
