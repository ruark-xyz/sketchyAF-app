import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import EnhancedRealtimeManager, { type ConnectionStatus } from '../services/EnhancedRealtimeManager';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface GameState {
  game: any | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  connectionStatus: ConnectionStatus;
}

interface UseSupabaseRealtimeGameStateOptions {
  gameId?: string;
  autoNavigate?: boolean;
}

export function useSupabaseRealtimeGameState({ 
  gameId, 
  autoNavigate = true 
}: UseSupabaseRealtimeGameStateOptions = {}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const effectiveGameId = gameId || searchParams.get('gameId');
  const { currentUser } = useAuth();

  const [state, setState] = useState<GameState>({
    game: null,
    isLoading: false,
    error: null,
    lastUpdated: 0,
    connectionStatus: {
      status: 'disconnected',
      reconnectAttempts: 0,
      isHealthy: false
    }
  });

  const realtimeManager = useRef<EnhancedRealtimeManager>(EnhancedRealtimeManager.getInstance());
  const subscriptionIdRef = useRef<string | null>(null);
  const navigationInProgressRef = useRef(false);

  // Load game data
  const loadGame = useCallback(async (id: string, retryCount = 0) => {
    if (!id) return;

    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    try {
      console.log(`Loading game ${id} (attempt ${retryCount + 1}/${maxRetries + 1})`);

      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          game_participants(
            user_id,
            is_ready,
            users(username, avatar_url)
          ),
          submissions(
            id,
            user_id,
            drawing_data,
            submitted_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116' && retryCount < maxRetries) {
          console.log(`Game ${id} not found, retrying in ${retryDelay}ms...`);
          setTimeout(() => loadGame(id, retryCount + 1), retryDelay);
          return;
        }
        throw error;
      }

      console.log(`Game ${id} loaded successfully:`, {
        id: data.id,
        status: data.status,
        phase_expires_at: data.phase_expires_at,
        current_phase_duration: data.current_phase_duration,
        fullData: data
      });

      setState(prev => ({
        ...prev,
        game: data,
        isLoading: false,
        error: null,
        lastUpdated: Date.now()
      }));

      console.log(`🎯 Setting hasGame to true for game: ${id}`);

    } catch (err) {
      console.error(`Failed to load game ${id}:`, err);
      setState(prev => ({
        ...prev,
        game: null,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load game',
        lastUpdated: Date.now()
      }));
    }
  }, []);

  // Handle game updates from realtime or manual refresh
  const handleGameUpdate = useCallback((updatedGame: any) => {
    if (!autoNavigate || navigationInProgressRef.current) return;

    console.log(`🔄 Game update received:`, {
      gameId: updatedGame.id,
      status: updatedGame.status,
      currentPath: window.location.pathname
    });

    // Update state first
    setState(prev => ({
      ...prev,
      game: updatedGame,
      lastUpdated: Date.now()
    }));

    // Navigate based on game status
    const currentPath = window.location.pathname;
    const gameStatus = updatedGame.status;

    let targetPath = '';
    
    if (gameStatus === 'briefing' && !currentPath.includes('/uiux/pre-round-briefing')) {
      targetPath = `/uiux/pre-round-briefing?gameId=${updatedGame.id}`;
    } else if (gameStatus === 'drawing' && !currentPath.includes('/uiux/draw')) {
      targetPath = `/uiux/draw?gameId=${updatedGame.id}`;
    } else if (gameStatus === 'voting' && !currentPath.includes('/uiux/voting')) {
      targetPath = `/uiux/voting?gameId=${updatedGame.id}`;
    } else if (gameStatus === 'results' && !currentPath.includes('/uiux/results')) {
      targetPath = `/uiux/results?gameId=${updatedGame.id}`;
    }

    if (targetPath) {
      console.log(`🚀 Navigating to: ${targetPath}`);
      navigationInProgressRef.current = true;
      navigate(targetPath);
      
      // Reset navigation flag after a delay
      setTimeout(() => {
        navigationInProgressRef.current = false;
      }, 1000);
    }
  }, [autoNavigate, navigate]);

  // Set up Enhanced Realtime subscription and connection monitoring
  useEffect(() => {
    if (!effectiveGameId) {
      // Clean up existing subscription
      if (subscriptionIdRef.current) {
        realtimeManager.current.unsubscribeFromGameUpdates(
          effectiveGameId || '',
          'useSupabaseRealtimeGameState',
          handleGameUpdate
        );
        subscriptionIdRef.current = null;
      }
      return;
    }

    console.log('🔗 Setting up Enhanced Realtime subscription for game:', effectiveGameId);

    // Subscribe to game updates with enhanced reliability
    const subscriptionId = realtimeManager.current.subscribeToGameUpdates(
      effectiveGameId,
      'useSupabaseRealtimeGameState',
      handleGameUpdate
    );

    subscriptionIdRef.current = subscriptionId;

    // Set up connection status monitoring
    const removeConnectionListener = realtimeManager.current.addConnectionListener((status) => {
      setState(prev => ({
        ...prev,
        connectionStatus: status
      }));
    });

    // Load initial game data
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    loadGame(effectiveGameId);

    // Cleanup function
    return () => {
      console.log('🔌 Cleaning up Enhanced Realtime subscription');

      if (subscriptionIdRef.current && effectiveGameId) {
        realtimeManager.current.unsubscribeFromGameUpdates(
          effectiveGameId,
          'useSupabaseRealtimeGameState',
          handleGameUpdate
        );
        subscriptionIdRef.current = null;
      }

      // Remove connection listener
      removeConnectionListener();
    };
  }, [effectiveGameId, loadGame, handleGameUpdate]);

  // Manual refresh
  const refresh = useCallback(() => {
    if (effectiveGameId) {
      loadGame(effectiveGameId);
    }
  }, [effectiveGameId, loadGame]);

  // Force reconnection
  const forceReconnect = useCallback(() => {
    realtimeManager.current.forceReconnect();
  }, []);

  // Get connection health metrics
  const getHealthMetrics = useCallback(() => {
    return realtimeManager.current.getHealthMetrics();
  }, []);

  return {
    game: state.game,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    connectionStatus: state.connectionStatus,
    refresh,
    forceReconnect,
    getHealthMetrics,
    hasGame: !!state.game
  };
}
