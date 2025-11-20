import { LRUCache } from 'lru-cache';
import { CacheEntry, User } from '../types';

const CACHE_TTL = 60 * 1000; // 60 seconds

export class CacheManager {
  private cache: LRUCache<string, CacheEntry>;
  private stats = {
    hits: 0,
    misses: 0,
    responseTimes: [] as number[],
  };

  constructor() {
    this.cache = new LRUCache<string, CacheEntry>({
      max: 1000,
      ttl: CACHE_TTL,
      updateAgeOnGet: true,
    });
  }

  get(key: string): User | null {
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.hits++;
      return entry.data;
    }
    this.stats.misses++;
    return null;
  }

  set(key: string, data: User): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
    };
    this.cache.set(key, entry);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.responseTimes = [];
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const avgResponseTime =
      this.stats.responseTimes.length > 0
        ? this.stats.responseTimes.reduce((a, b) => a + b, 0) /
          this.stats.responseTimes.length
        : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      averageResponseTime: Math.round(avgResponseTime * 100) / 100,
    };
  }

  recordResponseTime(time: number): void {
    this.stats.responseTimes.push(time);
    // Keep only last 1000 response times
    if (this.stats.responseTimes.length > 1000) {
      this.stats.responseTimes.shift();
    }
  }

  // Clean stale entries (called by background task)
  cleanStaleEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}

