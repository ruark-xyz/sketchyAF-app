// Enhanced Lobby Screen with Real-time Integration
// Demonstrates how to integrate real-time functionality with existing UI components

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, Trophy, Lightbulb, X, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import { useRealtimeGame } from '../../hooks/useRealtimeGame';
import { useAuth } from '../../context/AuthContext';
import GameEventHandler from './GameEventHandler';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import GamePresenceIndicator from './GamePresenceIndicator';
import RealtimeStatusMonitor from './RealtimeStatusMonitor';
import { 
  PlayerJoinedEvent, 
  PlayerLeftEvent, 
  PlayerReadyEvent,
  GameStartedEvent 
} from '../../types/realtime';
import { GameService } from '../../services/GameService';
// Note: MatchmakingService will be implemented later
// import { MatchmakingService } from '../../services/MatchmakingService';

interface RealtimeLobbyScreenProps {
  gameId?: string;
  onGameStarted?: (gameId: string) => void;
  onError?: (error: string) => void;
}

const GAME_TIPS = [
  "💡 Use simple shapes - they're easier to recognize!",
  "🎨 Don't overthink it - sketchy is the goal!",
  "⚡ Speed beats perfection in SketchyAF!",
  "🤝 Vote for creativity, not just artistic skill!"
];

const RealtimeLobbyScreen: React.FC<RealtimeLobbyScreenProps> = ({
  gameId,
  onGameStarted,
  onError
}) => {
  const { currentUser } = useAuth();
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<number | null>(null);
  const [currentTip, setCurrentTip] = useState(0);
  const [showMatchFound, setShowMatchFound] = useState(false);
  const [isInQueue, setIsInQueue] = useState(false);
  const [gameData, setGameData] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const {
    isConnected,
    connectionStatus,
    activeGameId,
    gamePresence,
    initializeRealtime,
    joinGame,
    leaveGame,
    broadcastPlayerReady,
    error: realtimeError
  } = useRealtimeGame({ gameId, autoConnect: true });

  // Initialize real-time connection
  useEffect(() => {
    if (currentUser && !isConnected) {
      initializeRealtime();
    }
  }, [currentUser, isConnected, initializeRealtime]);

  // Join game if gameId is provided
  useEffect(() => {
    if (gameId && isConnected && !activeGameId) {
      handleJoinGame(gameId);
    }
  }, [gameId, isConnected, activeGameId]);

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % GAME_TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Handle joining a specific game
  const handleJoinGame = async (targetGameId: string) => {
    setIsLoading(true);
    try {
      // Join the game in the database
      const joinResult = await GameService.joinGame({ game_id: targetGameId });
      if (!joinResult.success) {
        onError?.(joinResult.error || 'Failed to join game');
        return;
      }

      // Join the real-time channel
      const realtimeResult = await joinGame(targetGameId);
      if (!realtimeResult.success) {
        onError?.(realtimeResult.error || 'Failed to join real-time channel');
        return;
      }

      // Fetch game data
      const gameResult = await GameService.getGame(targetGameId);
      if (gameResult.success && gameResult.data) {
        setGameData(gameResult.data);
        setPlayers(gameResult.data.participants || []);
      }

      setIsInQueue(true);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle joining matchmaking queue
  const handleJoinQueue = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement MatchmakingService.joinQueue()
      // const result = await MatchmakingService.joinQueue();
      // Mock implementation for now
      setIsInQueue(true);
      setQueuePosition(3); // Mock position
      setEstimatedWaitTime(32); // Mock wait time
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle leaving queue/game
  const handleExitQueue = async () => {
    setIsLoading(true);
    try {
      if (activeGameId) {
        await leaveGame();
        if (gameId) {
          await GameService.leaveGame(gameId);
        }
      } else {
        // TODO: Implement MatchmakingService.leaveQueue()
        // await MatchmakingService.leaveQueue();
      }
      
      setIsInQueue(false);
      setGameData(null);
      setPlayers([]);
      setQueuePosition(null);
      setEstimatedWaitTime(null);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle ready up
  const handleReadyUp = async () => {
    if (!activeGameId) return;
    
    try {
      // Update ready status in database
      await GameService.updateReadyStatus(activeGameId, true);
      
      // Broadcast ready status
      await broadcastPlayerReady(true);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to ready up');
    }
  };

  // Real-time event handlers
  const handlePlayerJoined = (event: PlayerJoinedEvent) => {
    setPlayers(prev => {
      const existing = prev.find(p => p.user_id === event.userId);
      if (existing) return prev;
      
      return [...prev, {
        user_id: event.userId,
        username: event.data.username,
        avatar_url: event.data.avatar_url,
        is_ready: false,
        joined_at: event.data.joinedAt
      }];
    });
  };

  const handlePlayerLeft = (event: PlayerLeftEvent) => {
    setPlayers(prev => prev.filter(p => p.user_id !== event.userId));
  };

  const handlePlayerReady = (event: PlayerReadyEvent) => {
    setPlayers(prev => prev.map(p => 
      p.user_id === event.userId 
        ? { ...p, is_ready: event.data.isReady }
        : p
    ));
  };

  const handleGameStarted = (event: GameStartedEvent) => {
    setShowMatchFound(true);
    setTimeout(() => {
      onGameStarted?.(event.gameId);
    }, 3000);
  };

  // Handle errors
  useEffect(() => {
    if (realtimeError) {
      onError?.(realtimeError);
    }
  }, [realtimeError, onError]);

  if (showMatchFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green via-turquoise/20 to-pink/20 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-lg border-2 border-dark p-8 text-center hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
        >
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="font-heading font-bold text-2xl text-dark mb-2">Match Found!</h2>
          <p className="text-medium-gray">Get ready to draw...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <GameEventHandler
        gameId={activeGameId || undefined}
        onPlayerJoined={handlePlayerJoined}
        onPlayerLeft={handlePlayerLeft}
        onPlayerReady={handlePlayerReady}
        onGameStarted={handleGameStarted}
        onError={onError}
      />

      <div className="min-h-screen bg-gradient-to-br from-cream via-turquoise/20 to-pink/20 flex flex-col">
        {/* Header */}
        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <ConnectionStatusIndicator 
              status={connectionStatus} 
              showText 
              size="sm" 
            />
            
            {activeGameId && (
              <GamePresenceIndicator 
                gameId={activeGameId}
                showUsernames={false}
                maxVisible={3}
              />
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <RealtimeStatusMonitor 
              showDetails={false}
              showErrors={false}
              className="text-xs"
            />
            
            <Button 
              variant="tertiary" 
              size="sm" 
              onClick={handleExitQueue}
              disabled={isLoading}
              className="text-medium-gray"
            >
              <X size={18} className="mr-1" />
              {isInQueue ? 'Exit Queue' : 'Exit'}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center px-4 pb-8">
          <div className="max-w-md mx-auto w-full space-y-6">
            
            {/* Queue Status */}
            {isInQueue ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
              >
                <div className="text-center mb-6">
                  <h1 className="font-heading font-bold text-2xl text-dark mb-2 transform rotate-[-1deg]">
                    {activeGameId ? 'In Game Lobby' : 'Finding Players...'}
                  </h1>
                  <p className="text-medium-gray">
                    {activeGameId ? 'Waiting for all players to ready up' : 'Matching you with other sketchy artists'}
                  </p>
                </div>

                {/* Players List */}
                {players.length > 0 && (
                  <div className="space-y-2 mb-6">
                    <h3 className="font-medium text-dark">Players ({players.length}/4)</h3>
                    <div className="space-y-1">
                      {players.map((player, index) => (
                        <div key={player.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            <img 
                              src={player.avatar_url || `https://randomuser.me/api/portraits/lego/${index}.jpg`}
                              alt={player.username}
                              className="w-6 h-6 rounded-full"
                            />
                            <span className="text-sm font-medium">{player.username}</span>
                          </div>
                          <div className={`text-xs px-2 py-1 rounded ${
                            player.is_ready ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {player.is_ready ? 'Ready' : 'Not Ready'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ready Button */}
                {activeGameId && currentUser && (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleReadyUp}
                    disabled={isLoading}
                    className="w-full"
                  >
                    Ready to Draw!
                  </Button>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
              >
                <div className="text-center mb-6">
                  <h1 className="font-heading font-bold text-2xl text-dark mb-2 transform rotate-[-1deg]">
                    Ready to Get Sketchy?
                  </h1>
                  <p className="text-medium-gray">Join the queue and show off your artistic... skills?</p>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleJoinQueue}
                  disabled={isLoading || !isConnected}
                  className="w-full"
                >
                  <Users size={20} className="mr-2" />
                  {isLoading ? 'Joining...' : 'Join Queue'}
                </Button>
              </motion.div>
            )}

            {/* Tips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg border-2 border-dark p-4 hand-drawn shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center mb-3">
                <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />
                <h3 className="font-heading font-bold text-dark">Pro Tip</h3>
              </div>
              
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentTip}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="text-medium-gray text-sm"
                >
                  {GAME_TIPS[currentTip]}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RealtimeLobbyScreen;
