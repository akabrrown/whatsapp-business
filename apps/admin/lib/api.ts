// Admin API client: JWT in localStorage, typed responses, WS subscribe helper.
export function getAdminBaseUrl(): string {
  const envUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '').trim();
  if (!envUrl) {
    if (typeof window !== 'undefined') {
      return '';
    }
    return 'http://localhost:4000';
  }
  let normalized = envUrl;
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }
  return normalized.replace(/\/+$/, '');
}

export function buildAdminApiUrl(path: string): string {
  const base = getAdminBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) return cleanPath;
  if (base.endsWith('/api') && cleanPath.startsWith('/api/')) {
    return `${base}${cleanPath.slice(4)}`;
  }
  return `${base}${cleanPath}`;
}

const API = getAdminBaseUrl();

export function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('rd-admin-token') ?? '';
}

export function getUser(): { email: string; name: string; role: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('rd-admin-user') ?? 'null');
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: { email: string; name: string; role: string }) {
  localStorage.setItem('rd-admin-token', token);
  localStorage.setItem('rd-admin-user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('rd-admin-token');
  localStorage.removeItem('rd-admin-user');
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildAdminApiUrl(path);
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401 && typeof window !== 'undefined' && !path.includes('/login')) {
    clearAuth();
    window.location.href = '/login';
    throw new ApiError(401, 'unauthorized');
  }
  const text = await res.text();
  const body = (text ? JSON.parse(text) : {}) as T & { error?: string; message?: string };
  if (!res.ok) throw new ApiError(res.status, body.message ?? body.error ?? `request failed (${res.status})`);
  return body;
}

/** Live events from the API hub with hybrid WebSocket + REST fallback. */
export function subscribeAdminEvents(onEvent: (e: { type: string; payload: unknown }) => void): () => void {
  let ws: WebSocket | null = null;
  let closed = false;
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let lastTimestamp = Date.now();
  let isWsConnected = false;
  let wsAttempts = 0;
  const MAX_WS_ATTEMPTS = 2;

  const base = getAdminBaseUrl();
  const isServerless =
    base.includes('vercel.app') ||
    base.includes('workers.dev') ||
    base.includes('pages.dev') ||
    base.includes('netlify.app') ||
    (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'));

  const doPoll = async () => {
    if (closed || isWsConnected) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const token = getToken();
      const pollUrl = buildAdminApiUrl(`/api/events/poll?channel=admin&since=${lastTimestamp}`);
      const res = await fetch(pollUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = (await res.json()) as { ok: boolean; events?: { type: string; payload: unknown; timestamp: number }[]; timestamp?: number };
      if (data.events && Array.isArray(data.events)) {
        for (const ev of data.events) {
          onEvent({ type: ev.type, payload: ev.payload });
          if (ev.timestamp > lastTimestamp) lastTimestamp = ev.timestamp;
        }
      }
      if (data.timestamp && data.timestamp > lastTimestamp) lastTimestamp = data.timestamp;
    } catch {
      /* silent catch during poll */
    }
  };

  const startPolling = () => {
    if (pollInterval || closed) return;
    doPoll();
    pollInterval = setInterval(doPoll, 12000);
  };

  const handleActive = () => {
    if (typeof document !== 'undefined' && !document.hidden && !isWsConnected && !closed) {
      doPoll();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleActive);
    window.addEventListener('visibilitychange', handleActive);
  }

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };

  const connectWs = () => {
    if (closed || typeof window === 'undefined') return;

    // Serverless platforms (Vercel, Cloudflare Workers, etc.) do not support persistent WebSockets; use polling
    if (isServerless) {
      startPolling();
      return;
    }

    if (wsAttempts >= MAX_WS_ATTEMPTS) {
      startPolling();
      return;
    }

    wsAttempts++;

    try {
      const token = getToken();
      const qs = token ? `?channel=admin&token=${encodeURIComponent(token)}` : '?channel=admin';
      let wsUrl: string;
      if (!base) {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${proto}//${window.location.host}/ws${qs}`;
      } else {
        const wsBase = base.replace(/^http/, 'ws').replace(/\/api$/, '');
        wsUrl = `${wsBase}/ws${qs}`;
      }
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        isWsConnected = true;
        wsAttempts = 0;
        stopPolling();
      };

      ws.onmessage = (m) => {
        try {
          const parsed = JSON.parse(m.data) as { type: string; payload: unknown; timestamp?: number };
          if (parsed.timestamp) lastTimestamp = parsed.timestamp;
          onEvent(parsed);
        } catch {
          /* ignore malformed frame */
        }
      };

      ws.onclose = () => {
        isWsConnected = false;
        ws = null;
        if (!closed) {
          startPolling();
          if (wsAttempts < MAX_WS_ATTEMPTS) {
            reconnectTimeout = setTimeout(connectWs, 15000);
          }
        }
      };

      ws.onerror = () => {
        isWsConnected = false;
        ws?.close();
      };
    } catch {
      isWsConnected = false;
      startPolling();
    }
  };

  // Immediate start: polling for serverless, WS for long-running nodes
  if (isServerless) {
    startPolling();
  } else {
    connectWs();
    setTimeout(() => {
      if (!isWsConnected && !closed) startPolling();
    }, 2000);
  }

  return () => {
    closed = true;
    isWsConnected = false;
    stopPolling();
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleActive);
      window.removeEventListener('visibilitychange', handleActive);
    }
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    try {
      if (ws) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        } else if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => {
            try {
              ws?.close();
            } catch {
              /* ignore */
            }
          };
        }
      }
    } catch {
      /* ignore */
    }
  };
}

export { API };
