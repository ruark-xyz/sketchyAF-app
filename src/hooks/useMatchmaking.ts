import { useState, useEffect, useCallback, useRef } from 'react';
import { MatchmakingService } from '../services/MatchmakingService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

export interface MatchmakingPreferences {
  maxPlayers?: number;
  roundDuration?: number;
  categories?: string[];
}

export interface QueueStatus {
  inQueue: boolean;
  position?: number;
  joinedAt?: string;
  estimatedWaitTime?: number;
}

export interface UseMatchmakingReturn {
  // Queue state
  isInQueue: boolean;
  queuePosition: number | null;
  estimatedWaitTime: number | null;
  matchFound: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  joinQueue: (preferences?: MatchmakingPreferences) => Promise<void>;
  leaveQueue: () => Promise<void>;
  acceptMatch: () => Promise<void>;
  declineMatch: () => Promise<void>;
  
  // Polling control
  startPolling: () => void;
  stopPolling: () => void;
}

export function useMatchmaking(): UseMatchmakingReturn {
  const { currentUser, isLoggedIn } = useAuth();
  const { actions } = useGame();
  const navigate = useNavigate();

  // State
  const [isInQueue, setIsInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<number | null>(null);
  const [matchFound, setMatchFound] = useState(false);
  const [matchGameId, setMatchGameId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // PubNub real-time notifications
  const pubNubServiceRef = useRef<any>(null);
  const processedNotificationsRef = useRef<Set<string>>(new Set());
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Check queue status
  const checkQueueStatus = useCallback(async () => {
    if (!isLoggedIn) return;

    try {
      const result = await MatchmakingService.checkQueueStatus();

      if (result.success && result.data) {
        setIsInQueue(result.data.in_queue);

        if (result.data.in_queue) {
          setQueuePosition(result.data.position || null);
          setEstimatedWaitTime(result.data.estimated_wait_time || null);

          // Debug: Log queue state
          try {
            const queueState = await (MatchmakingService as any).getQueueState();
            console.log('useMatchmaking: Queue state check:', {
              userPosition: result.data.position,
              totalInQueue: queueState.count,
              playersInQueue: queueState.players
            });
          } catch (err) {
            console.warn('Failed to get queue state for debugging:', err);
          }
        } else {
          setQueuePosition(null);
          setEstimatedWaitTime(null);
        }
      } else {
        console.warn('Failed to check queue status:', result.error);
      }
    } catch (err) {
      console.error('Error checking queue status:', err);
    }
  }, [isLoggedIn]);

  // Start polling for queue updates
  const startPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    const interval = setInterval(async () => {
      await checkQueueStatus();

      // Check for real match notifications
      if (!matchFound) {
        const matchResult = await MatchmakingService.checkMatchStatus();
        console.log('Polling: checking match status result:', matchResult);

        if (matchResult.success && matchResult.data?.match_found) {
          setMatchFound(true);
          setMatchGameId(matchResult.data.game_id || null);
          console.log('Match found! Game ID:', matchResult.data.game_id);

          // Stop polling immediately when match is found
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }

          // Smart redirect based on current game status
          const gameId = matchResult.data.game_id;
          if (gameId) {
            console.log(`useMatchmaking: Setting up polling redirect for game ${gameId} in 1 second...`);
            setTimeout(async () => {
              console.log(`useMatchmaking: Executing polling redirect for game ${gameId}...`);
              try {
                const { GameService } = await import('../services/GameService');
                const gameResult = await GameService.getGame(gameId);

                let redirectPath = `/uiux/pre-round?gameId=${gameId}`; // default

                if (gameResult.success && gameResult.data) {
                  const gameStatus = gameResult.data.status;
                  console.log(`useMatchmaking: Polling - game status: ${gameStatus}`);

                  switch (gameStatus) {
                    case 'briefing':
                      redirectPath = `/uiux/pre-round?gameId=${gameId}`;
                      break;
                    case 'drawing':
                      redirectPath = `/uiux/draw?gameId=${gameId}`;
                      break;
                    case 'voting':
                      redirectPath = `/uiux/voting?gameId=${gameId}`;
                      break;
                    case 'results':
                      redirectPath = `/uiux/results?gameId=${gameId}`;
                      break;
                    default:
                      redirectPath = `/uiux/pre-round?gameId=${gameId}`;
                  }
                } else {
                  console.warn('useMatchmaking: Failed to get game data for polling redirect:', gameResult.error);
                }

                console.log(`useMatchmaking: Redirecting via polling to: ${redirectPath}`);
                navigate(redirectPath);
              } catch (error) {
                console.error('Error getting game status for polling redirect:', error);
                navigate(`/uiux/pre-round?gameId=${gameId}`); // fallback
              }
            }, 1000); // 1 second delay to show match found message
          } else {
            // Fallback if no game ID
            setTimeout(() => {
              console.log('No game ID, redirecting to pre-round anyway...');
              navigate('/uiux/pre-round');
            }, 2000);
          }
        }
      }
    }, 2000);

    setPollingInterval(interval);
  }, [pollingInterval, checkQueueStatus, matchFound, navigate]);

  // Join queue
  const joinQueue = useCallback(async (preferences?: MatchmakingPreferences) => {
    if (!isLoggedIn) {
      setError('You must be logged in to join the queue');
      return;
    }

    // Check if player already has an active match before joining queue
    console.log('useMatchmaking: Checking for existing match before joining queue...');
    const matchCheck = await MatchmakingService.checkMatchStatus();
    if (matchCheck.success && matchCheck.data?.match_found) {
      console.log('useMatchmaking: Player already has an active match, not joining queue');
      setMatchFound(true);
      setMatchGameId(matchCheck.data.game_id || null);

      // Smart redirect based on current game status
      const gameId = matchCheck.data.game_id;
      if (gameId) {
        // Get current game status to determine correct redirect
        const { GameService } = await import('../services/GameService');
        const gameResult = await GameService.getGame(gameId);

        let redirectPath = `/uiux/pre-round?gameId=${gameId}`; // default to briefing

        if (gameResult.success && gameResult.data) {
          const gameStatus = gameResult.data.status;
          console.log('useMatchmaking: Current game status:', gameStatus);

          // Redirect to appropriate screen based on game status
          switch (gameStatus) {
            case 'briefing':
              redirectPath = `/uiux/pre-round?gameId=${gameId}`;
              break;
            case 'drawing':
              redirectPath = `/uiux/draw?gameId=${gameId}`;
              break;
            case 'voting':
              redirectPath = `/uiux/voting?gameId=${gameId}`;
              break;
            case 'results':
              redirectPath = `/uiux/results?gameId=${gameId}`;
              break;
            case 'completed':
              redirectPath = `/uiux/post-game?gameId=${gameId}`;
              break;
            default:
              console.warn(`Unknown game status: ${gameStatus}, defaulting to briefing`);
              redirectPath = `/uiux/pre-round?gameId=${gameId}`;
          }
        }

        setTimeout(() => {
          console.log(`useMatchmaking: Redirecting to ${redirectPath} for game ${gameId}`);
          navigate(redirectPath);
        }, 1000); // 1 second delay to show match found message
      }
      return;
    }

    console.log('useMatchmaking: Joining queue...');
    setIsLoading(true);
    clearError();

    try {
      const result = await MatchmakingService.joinQueue(preferences);
      console.log('useMatchmaking: Join queue result:', result);

      if (result.success) {
        setIsInQueue(true);
        startPolling();
        console.log('useMatchmaking: Successfully joined queue, starting polling');
      } else {
        setError(result.error || 'Failed to join queue');
        console.error('useMatchmaking: Failed to join queue:', result.error);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMsg);
      console.error('useMatchmaking: Exception joining queue:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, clearError, startPolling, navigate]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  // Leave queue
  const leaveQueue = useCallback(async () => {
    setIsLoading(true);
    clearError();
    
    try {
      const result = await MatchmakingService.leaveQueue();
      
      if (result.success) {
        setIsInQueue(false);
        setQueuePosition(null);
        setEstimatedWaitTime(null);
        stopPolling();
      } else {
        setError(result.error || 'Failed to leave queue');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [clearError, stopPolling]);

  // Accept match
  const acceptMatch = useCallback(async () => {
    if (!matchGameId) {
      setError('No match to accept');
      return;
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      // Join the game using GameContext
      await actions.joinGame(matchGameId);

      // Leave the matchmaking queue
      await MatchmakingService.leaveQueue();

      // Clear match notification
      await MatchmakingService.clearMatchNotification();

      // Reset matchmaking state
      setIsInQueue(false);
      setMatchFound(false);
      setMatchGameId(null);
      stopPolling();

      // Navigate to pre-round briefing
      navigate('/uiux/pre-round');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setIsLoading(false);
    }
  }, [matchGameId, actions, navigate, clearError, stopPolling]);
  
  // Decline match
  const declineMatch = useCallback(async () => {
    setIsLoading(true);
    clearError();
    
    try {
      // Just reset match state and stay in queue
      setMatchFound(false);
      setMatchGameId(null);
      
      // Optionally leave queue if desired
      // await leaveQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  // Initialize PubNub for real-time match notifications
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      const initializePubNub = async () => {
        try {
          const { PubNubGameService } = await import('../services/PubNubService');
          const service = new PubNubGameService();
          await service.initialize(currentUser.id);
          pubNubServiceRef.current = service;

          // Subscribe to user-specific match notifications
          const userChannel = `user-${currentUser.id}`;
          console.log(`useMatchmaking: Subscribing to match notifications on ${userChannel}`);

          // Set up match notification listener
          const handleMatchNotification = (event: { message?: { type?: string; data?: { gameId?: string } }; timetoken?: string }) => {
            console.log('useMatchmaking: Received match notification:', event);

            if (event.message?.type === 'MATCH_FOUND' && event.message?.data?.gameId) {
              const gameId = event.message.data.gameId;
              const notificationId = `${gameId}-${event.timetoken || Date.now()}`;

              // Check if we've already processed this notification
              if (processedNotificationsRef.current.has(notificationId)) {
                console.log(`useMatchmaking: Duplicate notification ignored for game ${gameId}`);
                return;
              }

              // Mark as processed
              processedNotificationsRef.current.add(notificationId);
              console.log(`useMatchmaking: Match found via PubNub! Game ID: ${gameId}`);

              // Update state
              setMatchFound(true);
              setMatchGameId(gameId);

              // Stop polling since we found a match
              if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
              }

              // Smart redirect based on current game status
              console.log(`useMatchmaking: Setting up PubNub redirect for game ${gameId} in 1 second...`);
              setTimeout(async () => {
                console.log(`useMatchmaking: Executing PubNub redirect for game ${gameId}...`);
                try {
                  const { GameService } = await import('../services/GameService');
                  const gameResult = await GameService.getGame(gameId);

                  let redirectPath = `/uiux/pre-round?gameId=${gameId}`; // default

                  if (gameResult.success && gameResult.data) {
                    const gameStatus = gameResult.data.status;
                    console.log(`useMatchmaking: PubNub notification - game status: ${gameStatus}`);

                    switch (gameStatus) {
                      case 'briefing':
                        redirectPath = `/uiux/pre-round?gameId=${gameId}`;
                        break;
                      case 'drawing':
                        redirectPath = `/uiux/draw?gameId=${gameId}`;
                        break;
                      case 'voting':
                        redirectPath = `/uiux/voting?gameId=${gameId}`;
                        break;
                      case 'results':
                        redirectPath = `/uiux/results?gameId=${gameId}`;
                        break;
                      default:
                        redirectPath = `/uiux/pre-round?gameId=${gameId}`;
                    }
                  } else {
                    console.warn('useMatchmaking: Failed to get game data for PubNub redirect:', gameResult.error);
                  }

                  console.log(`useMatchmaking: Redirecting via PubNub to: ${redirectPath}`);
                  navigate(redirectPath);
                } catch (error) {
                  console.error('Error getting game status for PubNub redirect:', error);
                  navigate(`/uiux/pre-round?gameId=${gameId}`); // fallback
                }
              }, 1000);
            }
          };

          // Subscribe to the user channel
          await service.subscribeToUserChannel(currentUser.id, handleMatchNotification);

        } catch (error) {
          console.warn('Failed to initialize PubNub for match notifications:', error);
          // Don't fail the entire hook - polling will still work
        }
      };

      initializePubNub();
    }

    return () => {
      if (pubNubServiceRef.current && currentUser) {
        // Unsubscribe from user channel
        pubNubServiceRef.current.unsubscribeFromUserChannel?.(currentUser.id);
        // Disconnect the service
        pubNubServiceRef.current.disconnect?.();
      }
      // Clear processed notifications
      const processedNotifications = processedNotificationsRef.current;
      processedNotifications.clear();
    };
  }, [isLoggedIn, currentUser, navigate, pollingInterval]);

  // Check initial queue status on mount
  useEffect(() => {
    if (isLoggedIn) {
      checkQueueStatus();
    }

    return () => {
      stopPolling();
    };
  }, [isLoggedIn, checkQueueStatus, stopPolling]);
  
  return {
    isInQueue,
    queuePosition,
    estimatedWaitTime,
    matchFound,
    isLoading,
    error,
    joinQueue,
    leaveQueue,
    acceptMatch,
    declineMatch,
    startPolling,
    stopPolling
  };
}