type CacheOption = {
  ttl?: number; // Time to live in milliseconds
};

/**
 * CacheManager: A unified interface for caching data.
 * Can be switched between LocalStorage (current) and Redis (production).
 */
export class CacheManager {
  private static instance: CacheManager;
  private prefix = "wistaar_cache_";

  private constructor() {}

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Sets a value in the cache.
   */
  public async set<T>(key: string, value: T, options: CacheOption = {}): Promise<void> {
    const expires = options.ttl ? Date.now() + options.ttl : null;
    const cacheEntry = {
      data: value,
      expires,
    };

    // Current implementation: LocalStorage
    // Production implementation: Call Redis endpoint via Backend
    localStorage.setItem(this.prefix + key, JSON.stringify(cacheEntry));
  }

  /**
   * Gets a value from the cache.
   */
  public async get<T>(key: string): Promise<T | null> {
    const raw = localStorage.getItem(this.prefix + key);
    if (!raw) return null;

    try {
      const entry = JSON.parse(raw);
      if (entry.expires && Date.now() > entry.expires) {
        this.delete(key);
        return null;
      }
      return entry.data as T;
    } catch (e) {
      return null;
    }
  }

  public async delete(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key);
  }

  /**
   * Utility to wrap a fetch function with caching.
   */
  public async wrap<T>(key: string, fetcher: () => Promise<T>, ttl: number = 3600000): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const FreshData = await fetcher();
    await this.set(key, FreshData, { ttl });
    return FreshData;
  }
}

export const cache = CacheManager.getInstance();
