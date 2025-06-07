/**
 * Custom hooks for API operations with loading states and error handling
 */

import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';

// Generic hook for API calls
export function useApiCall<T>(
  apiCall: () => Promise<{ data: T; success: boolean; message?: string }>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiCall();
        
        if (isMounted) {
          if (response.success) {
            setData(response.data);
          } else {
            setError(response.message || 'An error occurred');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, dependencies);

  return { data, loading, error, refetch: () => useEffect(() => {}, dependencies) };
}

// Specific hooks for common operations
export function useLeaderboard() {
  return useApiCall(() => ApiService.getLeaderboard());
}

export function useTopDrawings() {
  return useApiCall(() => ApiService.getTopDrawings());
}

export function useBoosterPacks() {
  return useApiCall(() => ApiService.getBoosterPacks());
}

export function useDrawing(id: number) {
  return useApiCall(() => ApiService.getDrawingById(id), [id]);
}

export function useBoosterPack(id: string) {
  return useApiCall(() => ApiService.getBoosterPackById(id), [id]);
}

export function useUserProfile(username: string) {
  return useApiCall(() => ApiService.getUserProfile(username), [username]);
}