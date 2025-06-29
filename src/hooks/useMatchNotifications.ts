// Match Notifications Hook
// Listens for PubNub match notifications and handles navigation

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PubNubGameService } from '../services/PubNubService';
import { supabase } from '../utils/supabase';

export function useMatchNotifications() {
  const { currentUser, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const pubNubServiceRef = useRef<PubNubGameService | null>(null);
  const isSubscribedRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) {
      return;
    }

    // Don't re-initialize if already subscribed for this user
    if (isSubscribedRef.current) {
      console.log('useMatchNotifications: Already subscribed, skipping initialization');
      return;
    }

    const initializeMatchNotifications = async () => {
      try {
        console.log('useMatchNotifications: Initializing PubNub for match notifications...');
        
        // Initialize PubNub service
        const service = new PubNubGameService();
        await service.initialize(currentUser.id);
        pubNubServiceRef.current = service;

        // Set up match notification handler
        const handleMatchNotification = (event: any) => {
          console.log('useMatchNotifications: Received match notification:', event);

          const message = event.message;
          if (message && message.type === 'MATCH_FOUND' && message.gameId) {
            console.log(`useMatchNotifications: Match found! Game ID: ${message.gameId}`);

            // Small delay to ensure game is committed to database
            setTimeout(() => {
              const targetPath = `/uiux/pre-round?gameId=${message.gameId}`;
              console.log(`useMatchNotifications: Navigating to ${targetPath}`);
              navigate(targetPath, { replace: true });
            }, 500); // 500ms delay
          }
        };

        // Subscribe to user channel for match notifications
        await service.subscribeToUserChannel(currentUser.id, handleMatchNotification);
        isSubscribedRef.current = true;
        
        console.log(`useMatchNotifications: Successfully subscribed to user-${currentUser.id} for match notifications`);

        // Start polling fallback in case PubNub notifications fail
        const startPollingFallback = () => {
          pollingIntervalRef.current = setInterval(async () => {
            try {
              // Don't poll if we're already on a game page
              const currentPath = window.location.pathname;
              if (currentPath.includes('/pre-round') || currentPath.includes('/uiux/draw') || currentPath.includes('/voting') || currentPath.includes('/results')) {
                console.log('useMatchNotifications: Already on game page, stopping polling fallback');
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
                return;
              }

              // Check if user has any active games
              const { data: games } = await supabase
                .from('game_participants')
                .select('game_id, games!inner(id, status)')
                .eq('user_id', currentUser.id)
                .eq('games.status', 'briefing')
                .is('left_at', null);

              if (games && games.length > 0) {
                const game = games[0];
                console.log(`useMatchNotifications: Polling fallback found active game: ${game.game_id}`);

                // Navigate to the game
                const targetPath = `/uiux/pre-round?gameId=${game.game_id}`;
                console.log(`useMatchNotifications: Polling fallback navigating to ${targetPath}`);
                navigate(targetPath, { replace: true });

                // Stop polling once we find a game
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
              }
            } catch (error) {
              console.error('useMatchNotifications: Polling fallback error:', error);
            }
          }, 3000); // Poll every 3 seconds
        };

        startPollingFallback();

      } catch (error) {
        console.error('useMatchNotifications: Failed to initialize match notifications:', error);
      }
    };

    initializeMatchNotifications();

    // Cleanup function
    return () => {
      if (pubNubServiceRef.current && currentUser && isSubscribedRef.current) {
        console.log('useMatchNotifications: Cleaning up match notifications...');
        pubNubServiceRef.current.unsubscribeFromUserChannel(currentUser.id);
        isSubscribedRef.current = false;
      }

      // Clean up polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isLoggedIn, currentUser, navigate]);

  return {
    // Could return connection status or other info if needed
    isListening: isSubscribedRef.current
  };
}
