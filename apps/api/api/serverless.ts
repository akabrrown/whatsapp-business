import { createApp } from '../src/app.js';

let appInstance: any = null;

function getApp() {
  if (!appInstance) {
    appInstance = createApp();
  }
  return appInstance;
}

export default async function handler(req: any, res: any) {
  try {
    const app = getApp();
    return app(req, res);
  } catch (err: any) {
    console.error('SERVERLESS_INVOCATION_ERROR:', err);
    if (!res.headersSent) {
      res.status(500).json({
        ok: false,
        error: 'SERVERLESS_INVOCATION_ERROR',
        message: err?.message,
        stack: process.env.NODE_ENV === 'production' ? err?.stack : undefined,
        diagnostics: {
          hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
          hasJwtSecret: Boolean(process.env.JWT_SECRET),
          nodeEnv: process.env.NODE_ENV,
        },
      });
    }
  }
}
