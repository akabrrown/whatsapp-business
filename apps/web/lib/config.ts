// Centralized API configuration with automatic protocol & domain detection.
// Automatically fixes missing 'https://' prefixes to prevent invalid relative URL paths on Vercel.

export function getApiUrl(): string {
  let envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  // 1. If explicit production API url is configured, normalize and use it
  if (envUrl) {
    // Auto-fix missing protocol (e.g. 'whatsapp-business-api-ochre.vercel.app' -> 'https://...')
    if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
      envUrl = `https://${envUrl}`;
    }

    if (!envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl.replace(/\/+$/, '');
    }
  }

  // 2. In browser on production (e.g. Vercel / custom domain):
  // Use relative path '' so Next.js server-side rewrites route /api requests seamlessly.
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) {
      return '';
    }
  }

  // 3. Local machine development default
  return envUrl || 'http://localhost:4000';
}
