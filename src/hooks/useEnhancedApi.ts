/**
 * Enhanced API hooks with caching, performance tracking, and optimizations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { enhancedApiService } from '../services/enhancedApiService';
import { usePerformance } from '../context/PerformanceContext';

interface UseApiOptions {
  cache?: boolean;
  cacheTTL?: number;
  retries?: number;
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
}

// Enhanced hook for API calls with caching and performance tracking
export function useEnhancedApiCall<T>(
  apiCall: () => Promise<{ data: T; success: boolean; message?: string; cached?: boolean; responseTime?: number }>,
  dependencies: any[] = [],
  options: UseApiOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  
  const { recordMetric } = usePerformance();
  const abortControllerRef = useRef<AbortController | null>(null);
  const refetchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    enabled = true,
    refetchOnWindowFocus = false,
    refetchInterval,
  } = options;

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiCall();
      
      if (abortControllerRef.current.signal.aborted) {
        return; // Request was cancelled
      }

      if (response.success) {
        setData(response.data);
        setIsCached(response.cached || false);
        setResponseTime(response.responseTime || null);
        
        // Record performance metric
        if (response.responseTime) {
          recordMetric('api_response_time', response.responseTime);
        }
      } else {
        setError(response.message || 'An error occurred');
      }
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        return; // Request was cancelled
      }
      
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      recordMetric('api_error', 1);
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [apiCall, enabled, recordMetric]);

  // Initial fetch
  useEffect(() => {
    fetchData();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refetchIntervalRef.current) {
        clearInterval(refetchIntervalRef.current);
      }
    };
  }, [fetchData, ...dependencies]);

  // Refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      refetchIntervalRef.current = setInterval(fetchData, refetchInterval);
      
      return () => {
        if (refetchIntervalRef.current) {
          clearInterval(refetchIntervalRef.current);
        }
      };
    }
  }, [refetchInterval, enabled, fetchData]);

  // Refetch on window focus
  useEffect(() => {
    if (refetchOnWindowFocus) {
      const handleFocus = () => {
        if (!document.hidden) {
          fetchData();
        }
      };

      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleFocus);

      return () => {
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleFocus);
      };
    }
  }, [refetchOnWindowFocus, fetchData]);

  return { 
    data, 
    loading, 
    error, 
    isCached,
    responseTime,
    refetch: fetchData 
  };
}

// Specific hooks for common operations
export function useLeaderboard(options?: UseApiOptions) {
  return useEnhancedApiCall(
    () => enhancedApiService.getLeaderboard(options),
    [],
    options
  );
}

export function useTopDrawings(options?: UseApiOptions) {
  return useEnhancedApiCall(
    () => enhancedApiService.getTopDrawings(options),
    [],
    options
  );
}

export function useBoosterPacks(options?: UseApiOptions) {
  return useEnhancedApiCall(
    () => enhancedApiService.getBoosterPacks(options),
    [],
    options
  );
}

export function useDrawing(id: number, options?: UseApiOptions) {
  return useEnhancedApiCall(
    () => enhancedApiService.getDrawingById(id, options),
    [id],
    options
  );
}

export function useBoosterPack(id: string, options?: UseApiOptions) {
  return useEnhancedApiCall(
    () => enhancedApiService.getBoosterPackById(id, options),
    [id],
    options
  );
}

export function useUserProfile(username: string, options?: UseApiOptions) {
  return useEnhancedApiCall(
    () => enhancedApiService.getUserProfile(username, options),
    [username],
    options
  );
}

// Hook for cache management
export function useApiCache() {
  const clearCache = useCallback(() => {
    enhancedApiService.clearCache();
  }, []);

  const getCacheStats = useCallback(() => {
    return enhancedApiService.getCacheStats();
  }, []);

  const prefetchCommonData = useCallback(() => {
    return enhancedApiService.prefetchCommonData();
  }, []);

  return {
    clearCache,
    getCacheStats,
    prefetchCommonData,
  };
}