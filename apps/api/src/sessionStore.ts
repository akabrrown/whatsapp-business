// Session/cache layer behind a single interface.
// Default: in-memory store with real TTL semantics (cart sessions §4.3,
// order tokens §4.7, rate-limit windows §14.1).
// Production: point REDIS_URL at Redis and implement the same interface.
import { now } from './clock.js';

export interface KVStore {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlMs: number): void;
  del(key: string): void;
  keys(prefix?: string): string[];
  /** Extend TTL of an existing key (cart refresh on activity, §4.4). */
  touch(key: string, ttlMs: number): boolean;
  /** Drop all keys (test isolation / §13.5 cache-layer loss simulation). */
  clear(): void;
}

interface Entry {
  value: unknown;
  expiresAt: number;
}

export class MemoryKVStore implements KVStore {
  private map = new Map<string, Entry>();

  private alive(e: Entry): boolean {
    return e.expiresAt > now().getTime();
  }

  get<T>(key: string): T | null {
    const e = this.map.get(key);
    if (!e) return null;
    if (!this.alive(e)) {
      this.map.delete(key);
      return null;
    }
    return e.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.map.set(key, { value, expiresAt: now().getTime() + ttlMs });
  }

  del(key: string): void {
    this.map.delete(key);
  }

  keys(prefix = ''): string[] {
    const out: string[] = [];
    for (const [k, e] of this.map) {
      if (!this.alive(e)) {
        this.map.delete(k);
        continue;
      }
      if (k.startsWith(prefix)) out.push(k);
    }
    return out;
  }

  touch(key: string, ttlMs: number): boolean {
    const e = this.map.get(key);
    if (!e || !this.alive(e)) return false;
    e.expiresAt = now().getTime() + ttlMs;
    return true;
  }

  clear(): void {
    this.map.clear();
  }
}

export const kv: KVStore = new MemoryKVStore();
