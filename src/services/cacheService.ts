/**
 * Cache service for API responses and static content
 * Provides memory cache, localStorage cache, and service worker integration
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  // Memory cache operations
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    
    this.memoryCache.set(key, entry);
    
    // Also store in localStorage for persistence
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to store in localStorage:', error);
    }
  }

  get<T>(key: string): T | null {
    // Check memory cache first
    let entry = this.memoryCache.get(key);
    
    // If not in memory, check localStorage
    if (!entry) {
      try {
        const stored = localStorage.getItem(`cache_${key}`);
        if (stored) {
          entry = JSON.parse(stored);
          // Restore to memory cache
          if (entry) {
            this.memoryCache.set(key, entry);
          }
        }
      } catch (error) {
        console.warn('Failed to read from localStorage:', error);
      }
    }

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.memoryCache.delete(key);
    
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  clear(): void {
    this.memoryCache.clear();
    
    try {
      // Clear all cache entries from localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage cache:', error);
    }
  }

  // Check if a key exists and is not expired
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Get cache statistics
  getStats() {
    const memoryEntries = this.memoryCache.size;
    let localStorageEntries = 0;
    
    try {
      const keys = Object.keys(localStorage);
      localStorageEntries = keys.filter(key => key.startsWith('cache_')).length;
    } catch (error) {
      console.warn('Failed to get localStorage stats:', error);
    }

    return {
      memoryEntries,
      localStorageEntries,
      totalSize: this.estimateSize(),
    };
  }

  // Estimate cache size in bytes
  private estimateSize(): number {
    let size = 0;
    
    this.memoryCache.forEach((value, key) => {
      size += JSON.stringify(value).length * 2; // Rough estimate
      size += key.length * 2;
    });
    
    return size;
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    
    // Clean memory cache
    this.memoryCache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
      }
    });

    // Clean localStorage cache
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const entry = JSON.parse(stored);
            if (now - entry.timestamp > entry.ttl) {
              localStorage.removeItem(key);
            }
          }
        }
      });
    } catch (error) {
      console.warn('Failed to cleanup localStorage cache:', error);
    }
  }

  // Generate cache key for API requests
  generateApiKey(url: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `api_${url}_${btoa(paramString)}`;
  }

  // Cache API response
  cacheApiResponse<T>(url: string, params: Record<string, any> | undefined, data: T, ttl?: number): void {
    const key = this.generateApiKey(url, params);
    this.set(key, data, ttl);
  }

  // Get cached API response
  getCachedApiResponse<T>(url: string, params?: Record<string, any>): T | null {
    const key = this.generateApiKey(url, params);
    return this.get<T>(key);
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cacheService.cleanup();
  }, 5 * 60 * 1000);
}