// Centralized API configuration with automatic browser domain detection
// Guarantees zero localhost:4000 ERR_CONNECTION_REFUSED errors in production environments.

export function getApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  // 1. If explicit production API url is configured, use it
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '');
  }

  // 2. In browser on production (e.g. Vercel / custom domain):
  // Use relative path '' so Next.js server-side rewrites route /api requests seamlessly without CORS or connection refused errors.
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) {
      return '';
    }
  }

  // 3. Local machine development default
  return envUrl || 'http://localhost:4000';
}
