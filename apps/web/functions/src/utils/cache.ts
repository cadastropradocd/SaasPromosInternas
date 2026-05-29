import { appLogger } from './logger';

interface CacheItem<T> {
  value: T;
  expiresAt: number; // timestamp in milliseconds
}

class TTLCache<T> {
  private map: Map<string, CacheItem<T>>;
  private defaultTTL: number; // in milliseconds

  constructor(defaultTTLSec: number = 60) {
    this.map = new Map();
    this.defaultTTL = defaultTTLSec * 1000; // convert to milliseconds
  }

  private isExpired(item: CacheItem<T>): boolean {
    return Date.now() > item.expiresAt;
  }

  get(key: string): T | null {
    const item = this.map.get(key);
    if (!item) {
      return null;
    }
    if (this.isExpired(item)) {
      this.map.delete(key);
      return null;
    }
    return item.value;
  }

  set(key: string, value: T, ttlSec?: number): void {
    const ttl = ttlSec ?? this.defaultTTL;
    const expiresAt = Date.now() + ttl * 1000;
    this.map.set(key, { value, expiresAt });
    appLogger.debug(`Cache set for key: ${key}`, { ttlSec: ttl });
  }

  delete(key: string): void {
    this.map.delete(key);
    appLogger.debug(`Cache deleted for key: ${key}`);
  }

  clear(): void {
    this.map.clear();
    appLogger.debug('Cache cleared');
  }

  clearPrefix(prefix: string): void {
    for (const [key] of this.map.entries()) {
      if (key.startsWith(prefix)) {
        this.map.delete(key);
      }
    }
    appLogger.debug(`Cache cleared for prefix: ${prefix}`);
  }

  size(): number {
    // Clean up expired items before counting
    this.cleanup();
    return this.map.size;
  }

  private cleanup(): void {
    for (const [key, item] of this.map.entries()) {
      if (this.isExpired(item)) {
        this.map.delete(key);
      }
    }
  }
}

export const ttlCache = new TTLCache(60); // default 60 seconds TTL