// Session/cache layer behind a single async interface.
// Default: in-memory store with real TTL semantics (cart sessions §4.3,
// order tokens §4.7, rate-limit windows §14.1).
// Production: Upstash Redis is used if UPSTASH_REDIS_REST_URL is present.
import { now } from './clock.js';
import { Redis } from '@upstash/redis';
import { config } from './config.js';

export interface KVStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  del(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
  /** Extend TTL of an existing key (cart refresh on activity, §4.4). */
  touch(key: string, ttlMs: number): Promise<boolean>;
  /** Drop all keys (test isolation / §13.5 cache-layer loss simulation). */
  clear(): Promise<void>;
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

  async get<T>(key: string): Promise<T | null> {
    const e = this.map.get(key);
    if (!e) return null;
    if (!this.alive(e)) {
      this.map.delete(key);
      return null;
    }
    return e.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.map.set(key, { value, expiresAt: now().getTime() + ttlMs });
  }

  async del(key: string): Promise<void> {
    this.map.delete(key);
  }

  async keys(prefix = ''): Promise<string[]> {
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

  async touch(key: string, ttlMs: number): Promise<boolean> {
    const e = this.map.get(key);
    if (!e || !this.alive(e)) return false;
    e.expiresAt = now().getTime() + ttlMs;
    return true;
  }

  async clear(): Promise<void> {
    this.map.clear();
  }
}

export class UpstashRedisStore implements KVStore {
  private redis: Redis;

  constructor(url: string, token: string) {
    this.redis = new Redis({ url, token });
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get<T>(key);
    return data ?? null;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    await this.redis.set(key, value, { px: ttlMs });
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async keys(prefix = '*'): Promise<string[]> {
    // Upstash Redis provides SCAN or Keys. For simplicity in this interface we use keys.
    // In a massive production system you'd want to use SCAN.
    return await this.redis.keys(prefix === '' ? '*' : `${prefix}*`);
  }

  async touch(key: string, ttlMs: number): Promise<boolean> {
    const res = await this.redis.pexpire(key, ttlMs);
    return res === 1;
  }

  async clear(): Promise<void> {
    await this.redis.flushdb();
  }
}

// Auto-detect which store to use
export const kv: KVStore = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new UpstashRedisStore(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN)
  : new MemoryKVStore();
