// Admin API client: JWT in localStorage, typed responses, WS subscribe helper.
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

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
  const res = await fetch(`${API}${path}`, {
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

  const startPolling = () => {
    if (pollInterval || closed) return;
    pollInterval = setInterval(async () => {
      if (closed || isWsConnected) return;
      try {
        const token = getToken();
        const res = await fetch(`${API}/api/events/poll?channel=admin&since=${lastTimestamp}`, {
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
    }, 5000);
  };

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };

  const connectWs = () => {
    if (closed || typeof window === 'undefined') return;
    try {
      const token = getToken();
      const qs = token ? `?channel=admin&token=${encodeURIComponent(token)}` : '?channel=admin';
      const wsUrl = `${API.replace(/^http/, 'ws')}/ws${qs}`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        isWsConnected = true;
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
          reconnectTimeout = setTimeout(connectWs, 15000); // retry WS every 15s
        }
      };

      ws.onerror = () => {
        isWsConnected = false;
        ws?.close();
      };
    } catch {
      isWsConnected = false;
      startPolling();
      reconnectTimeout = setTimeout(connectWs, 15000);
    }
  };

  // Start with WebSocket, fallback to REST
  connectWs();
  // Fallback safety in case initial connection hangs
  setTimeout(() => {
    if (!isWsConnected && !closed) startPolling();
  }, 2000);

  return () => {
    closed = true;
    isWsConnected = false;
    stopPolling();
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
  };
}

export { API };
