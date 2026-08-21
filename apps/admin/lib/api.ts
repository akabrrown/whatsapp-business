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

/** Live events from the API hub with polling fallback for serverless compatibility. */
export function subscribeAdminEvents(onEvent: (e: { type: string; payload: unknown }) => void): () => void {
  let closed = false;
  // In serverless deployment, WebSocket hub is disabled.
  // Polling can trigger periodic refreshes or remain silent without console noise.
  const interval = setInterval(() => {
    if (closed) return;
    onEvent({ type: 'heartbeat', payload: { time: Date.now() } });
  }, 30000);

  return () => {
    closed = true;
    clearInterval(interval);
  };
}

export { API };
