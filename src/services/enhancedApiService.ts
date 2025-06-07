/**
 * Enhanced API service with caching, retry logic, and performance tracking
 */

import { ApiService } from './api';
import { cacheService } from './cacheService';
import { LeaderboardEntry, TopDrawing, BoosterPack } from '../types';

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  cached?: boolean;
  responseTime?: number;
}

interface RequestConfig {
  cache?: boolean;
  cacheTTL?: number;
  retries?: number;
  timeout?: number;
}

class EnhancedApiService {
  private readonly DEFAULT_CONFIG: RequestConfig = {
    cache: true,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    retries: 3,
    timeout: 10000,
  };

  // Enhanced request wrapper with caching and retry logic
  private async makeRequest<T>(
    apiCall: () => Promise<ApiResponse<T>>,
    cacheKey: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = performance.now();

    // Check cache first
    if (mergedConfig.cache) {
      const cachedData = cacheService.get<T>(cacheKey);
      if (cachedData) {
        return {
          data: cachedData,
          success: true,
          cached: true,
          responseTime: performance.now() - startTime,
        };
      }
    }

    // Make API request with retry logic
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= mergedConfig.retries!; attempt++) {
      try {
        const response = await Promise.race([
          apiCall(),
          this.createTimeoutPromise<ApiResponse<T>>(mergedConfig.timeout!),
        ]);

        // Cache successful response
        if (response.success && mergedConfig.cache) {
          cacheService.set(cacheKey, response.data, mergedConfig.cacheTTL);
        }

        return {
          ...response,
          cached: false,
          responseTime: performance.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Wait before retry (exponential backoff)
        if (attempt < mergedConfig.retries!) {
          await this.delay(Math.pow(2, attempt - 1) * 1000);
        }
      }
    }

    throw lastError;
  }

  // Create timeout promise
  private createTimeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  // Delay utility
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Enhanced API methods
  async getLeaderboard(config?: RequestConfig): Promise<ApiResponse<LeaderboardEntry[]>> {
    return this.makeRequest(
      () => ApiService.getLeaderboard(),
      'leaderboard',
      config
    );
  }

  async getTopDrawings(config?: RequestConfig): Promise<ApiResponse<TopDrawing[]>> {
    return this.makeRequest(
      () => ApiService.getTopDrawings(),
      'top_drawings',
      config
    );
  }

  async getDrawingById(id: number, config?: RequestConfig): Promise<ApiResponse<TopDrawing | null>> {
    return this.makeRequest(
      () => ApiService.getDrawingById(id),
      `drawing_${id}`,
      config
    );
  }

  async getBoosterPacks(config?: RequestConfig): Promise<ApiResponse<BoosterPack[]>> {
    return this.makeRequest(
      () => ApiService.getBoosterPacks(),
      'booster_packs',
      config
    );
  }

  async getBoosterPackById(id: string, config?: RequestConfig): Promise<ApiResponse<BoosterPack | null>> {
    return this.makeRequest(
      () => ApiService.getBoosterPackById(id),
      `booster_pack_${id}`,
      config
    );
  }

  async getUserProfile(username: string, config?: RequestConfig): Promise<ApiResponse<any>> {
    return this.makeRequest(
      () => ApiService.getUserProfile(username),
      `user_profile_${username}`,
      { ...config, cacheTTL: 2 * 60 * 1000 } // Shorter cache for user data
    );
  }

  async submitEmailSignup(email: string, config?: RequestConfig): Promise<ApiResponse<{ message: string }>> {
    // Email signup should not be cached
    return this.makeRequest(
      () => ApiService.submitEmailSignup(email),
      `email_signup_${email}`,
      { ...config, cache: false }
    );
  }

  // Cache management methods
  clearCache(): void {
    cacheService.clear();
  }

  getCacheStats() {
    return cacheService.getStats();
  }

  // Prefetch commonly used data
  async prefetchCommonData(): Promise<void> {
    try {
      // Prefetch leaderboard and top drawings in the background
      Promise.all([
        this.getLeaderboard({ cache: true, cacheTTL: 10 * 60 * 1000 }),
        this.getTopDrawings({ cache: true, cacheTTL: 10 * 60 * 1000 }),
        this.getBoosterPacks({ cache: true, cacheTTL: 30 * 60 * 1000 }),
      ]);
    } catch (error) {
      // Prefetch failures should not break the app
      console.warn('Prefetch failed:', error);
    }
  }
}

// Export singleton instance
export const enhancedApiService = new EnhancedApiService();

// Prefetch common data when the service is loaded
if (typeof window !== 'undefined') {
  // Delay prefetch to not block initial page load
  setTimeout(() => {
    enhancedApiService.prefetchCommonData();
  }, 2000);
}