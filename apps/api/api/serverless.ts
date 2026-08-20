let appInstance: any = null;

async function getApp() {
  if (!appInstance) {
    const { createApp } = await import('../src/app.js');
    appInstance = createApp();
  }
  return appInstance;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error('SERVERLESS_INVOCATION_ERROR:', err);
    if (!res.headersSent) {
      res.status(500).json({
        ok: false,
        error: 'SERVERLESS_INVOCATION_ERROR',
        name: err?.name,
        message: err?.message || String(err),
        stack: err?.stack,
        diagnostics: {
          hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
          hasJwtSecret: Boolean(process.env.JWT_SECRET),
          nodeEnv: process.env.NODE_ENV,
          time: new Date().toISOString(),
        },
      });
    }
  }
}
