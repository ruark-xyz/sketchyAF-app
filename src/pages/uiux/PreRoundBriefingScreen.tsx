import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, Palette, CheckCircle, ArrowRight, Zap, Star, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Seo from '../../components/utils/Seo';
import { useUnifiedGameState } from '../../hooks/useUnifiedGameState';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { useSimpleTimer } from '../../hooks/useSimpleTimer';
import { BoosterPackService } from '../../services/BoosterPackService';
import { BoosterPackWithOwnership } from '../../types/game';

const PreRoundBriefingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    game: currentGame,
    isLoading: gameLoading,
    error: gameError
  } = useUnifiedGameState({ autoNavigate: true }); // Enable auto-navigation for server-driven transitions

  // Keep some GameContext usage for briefing-specific state
  const {
    participants,
    isReady,
    actions,
    selectedBoosterPack,
    isLoading,
    error
  } = useGame();
  
  const [availableBoosterPacks, setAvailableBoosterPacks] = useState<BoosterPackWithOwnership[]>([]);
  const [gameStarting, setGameStarting] = useState(false);
  
  // Simple timer display
  const {
    timeRemaining,
    formattedTime,
    isLoading: timerLoading,
    error: timerError
  } = useSimpleTimer({
    gameId: currentGame?.id || ''
  });

  // Safe timer values
  const safeTimeRemaining = timeRemaining ?? 0;
  const isTimerCritical = safeTimeRemaining <= 5;

  // Load available booster packs from database
  useEffect(() => {
    const loadBoosterPacks = async () => {
      if (!currentUser) {
        console.log('PreRoundBriefingScreen: User not authenticated, skipping booster pack loading');
        return;
      }

      try {
        console.log('PreRoundBriefingScreen: Loading booster packs for user:', currentUser.id);
        const result = await BoosterPackService.getAvailablePacks();

        console.log('PreRoundBriefingScreen: Booster packs result:', {
          success: result.success,
          dataLength: result.data?.length,
          error: result.error,
          data: result.data
        });

        if (result.success && result.data) {
          setAvailableBoosterPacks(result.data);
          console.log('PreRoundBriefingScreen: Set available booster packs:', result.data.length);
        } else {
          console.error('Failed to load booster packs:', result.error);
        }
      } catch (err) {
        console.error('Failed to load booster packs:', err);
      }
    };

    loadBoosterPacks();
  }, [currentUser]);

  // Sync GameContext when currentGame changes
  useEffect(() => {
    if (currentGame?.id && actions?.refreshGameState) {
      console.log('PreRoundBriefingScreen: Syncing GameContext with game:', currentGame.id);
      actions.refreshGameState(currentGame.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGame?.id]); // Intentionally exclude actions to prevent infinite loop

  // Start timer when component mounts - but only if all players are present
  // Timer and phase transitions are now handled server-side automatically

  // Log component mount for debugging
  useEffect(() => {
    console.log('PreRoundBriefingScreen: Component mounted', {
      currentGame: currentGame ? {
        id: currentGame.id,
        status: currentGame.status
      } : null,
      gamePhase: currentGame?.status || 'unknown',
      currentUser: currentUser ? {
        id: currentUser.id,
        email: currentUser.email
      } : null,
      participants: participants.length,
      availableBoosterPacks: availableBoosterPacks.length,
      isLoading,
      error
    });
  }, [currentGame, currentUser, participants, availableBoosterPacks, isLoading, error]);

  const handleReadyUp = async () => {
    try {
      await actions.setPlayerReady(!isReady);
    } catch (err) {
      console.error('Failed to set ready status:', err);
    }
  };

  const handleBoosterPackSelect = async (packId: string) => {
    try {
      // If already selected, deselect it
      if (selectedBoosterPack === packId) {
        await actions.selectBoosterPack(null);
      } else {
        await actions.selectBoosterPack(packId);
      }
    } catch (err) {
      console.error('Failed to select booster pack:', err);
    }
  };

  // Manual game start is no longer needed - server handles transitions automatically
  const handleStartGame = async () => {
    // Phase transitions are now handled server-side automatically
    console.log('Manual start game clicked - server will handle transition automatically');
  };

  // Get icon for booster pack based on category or asset directory name
  const getIconForBoosterPack = (pack: BoosterPackWithOwnership): string => {
    const name = pack.category || pack.asset_directory_name || '';
    switch (name.toLowerCase()) {
      case 'shapes':
      case 'basics': return '🔷';
      case 'troll':
      case 'memes': return '😈';
      case 'premium': return '⭐';
      case 'emoji': return '😎';
      default: return '🎨';
    }
  };

  // Check if all players are ready
  const readyPlayersCount = participants.filter(p => p.is_ready).length;
  const allPlayersReady = readyPlayersCount === participants.length && participants.length > 0;

  return (
    <>
      <Seo 
        title="Game Starting Soon... | SketchyAF"
        description="Get ready to draw! Select your booster packs and prepare for sketchy chaos."
      />
      
      <div className="min-h-screen bg-gradient-to-br from-cream via-secondary/20 to-accent/20 flex flex-col">
        {/* Header with countdown */}
        <div className="p-4 text-center">
          <motion.div
            key={safeTimeRemaining}
            initial={{ scale: isTimerCritical ? 1.1 : 1 }}
            animate={{ scale: 1 }}
            className={`inline-flex items-center bg-white rounded-full px-4 py-2 border-2 border-dark hand-drawn shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]`}
          >
            <Clock size={20} className="mr-2" />
            <span className="font-heading font-bold text-xl">
              {isTimerCritical ? '🔥 ' : ''}{formattedTime}
            </span>
          </motion.div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-4 mb-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red/10 border border-red rounded-lg p-3 flex items-center"
            >
              <AlertCircle size={18} className="text-red mr-2 flex-shrink-0" />
              <p className="text-dark text-sm">{error}</p>
            </motion.div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center px-4 pb-8">
          <div className="max-w-lg mx-auto w-full space-y-6">
            
            {/* Game Prompt */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
            >
              <div className="text-center mb-6">
                <h1 className="font-heading font-bold text-2xl text-dark mb-2 transform rotate-[-1deg]">
                  Your Prompt
                </h1>
                <p className="text-medium-gray">Get ready for some sketchy chaos!</p>
              </div>

              {/* Animated Loading Doodles */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <motion.div
                    animate={{ 
                      rotate: 360,
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity }
                    }}
                    className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full"
                  />
                  <motion.div
                    animate={{ 
                      x: [-20, 20, -20],
                      y: [-10, 10, -10]
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl"
                  >
                    🎨
                  </motion.div>
                </div>
              </div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="bg-primary/10 p-4 rounded-lg border border-primary/30 mb-4"
              >
                <p className="font-heading font-bold text-xl text-primary">
                  "{currentGame?.prompt || 'Loading prompt...'}"
                </p>
              </motion.div>
              <p className="text-medium-gray text-sm">
                You have {currentGame?.round_duration || 60} seconds to draw this. Make it sketchy! 🎨
              </p>
            </motion.div>

            {/* Players Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-bold text-xl text-dark">Players</h2>
                <div className="flex items-center">
                  <Users size={18} className="text-green mr-1" />
                  <span className="font-heading font-semibold text-green">
                    {readyPlayersCount}/{participants.length} Ready
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {participants.map((participant, index) => {
                  const isCurrentUser = participant.user_id === currentUser?.id;
                  return (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index, duration: 0.3 }}
                      className={`flex items-center p-3 rounded-lg border-2 ${
                        participant.is_ready 
                          ? 'bg-green/10 border-green' 
                          : 'bg-orange/10 border-orange'
                      }`}
                    >
                      <div className="relative mr-3">
                        <img 
                          src={participant.avatar_url || `https://ui-avatars.com/api/?name=${participant.username}&background=random`} 
                          alt={participant.username}
                          className="w-10 h-10 rounded-full border-2 border-dark"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Username with premium badge */}
                        <div className="flex items-center gap-1 mb-1">
                          <p className="font-heading font-semibold text-sm truncate">
                            {participant.username}
                            {isCurrentUser && ' (You)'}
                          </p>
                        </div>
                        
                        {/* Ready status and booster pack */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {participant.is_ready ? (
                              <>
                                <CheckCircle size={12} className="text-green mr-1" />
                                <span className="text-xs text-green font-heading font-semibold">Ready</span>
                              </>
                            ) : (
                              <>
                                <Clock size={12} className="text-orange mr-1" />
                                <span className="text-xs text-orange font-heading font-semibold">
                                  {isCurrentUser ? 'Ready up!' : 'Waiting...'}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Show selected booster pack if any */}
                          {participant.selected_booster_pack && (
                            <div className="flex items-center">
                              <span className="text-xs text-purple mr-1">🎨</span>
                              <span className="text-xs text-purple font-heading font-semibold">Pack</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Booster Pack Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center mb-4">
                <Palette size={20} className="text-purple mr-2" />
                <h2 className="font-heading font-bold text-xl text-dark">Choose Your Chaos</h2>
              </div>
              
              <p className="text-medium-gray text-sm mb-4">
                Select a booster pack to spice up your drawing (optional)
              </p>

              <div className="grid grid-cols-2 gap-3">
                {availableBoosterPacks.length === 0 && (
                  <div className="col-span-2 text-center py-4">
                    <p className="text-medium-gray text-sm">
                      {currentUser ? 'Loading booster packs...' : 'Please log in to see booster packs'}
                    </p>
                  </div>
                )}
                {availableBoosterPacks.map(pack => {
                  const isAvailable = pack.is_owned || !pack.is_premium; // Free packs are always available, premium packs need to be owned
                  const isSelected = selectedBoosterPack === pack.id;

                  return (
                    <motion.button
                      key={pack.id}
                      whileHover={{ scale: isAvailable ? 1.05 : 1 }}
                      whileTap={{ scale: isAvailable ? 0.95 : 1 }}
                      onClick={() => isAvailable && handleBoosterPackSelect(pack.id)}
                      disabled={!isAvailable || isLoading}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'bg-purple/20 border-purple'
                          : isAvailable
                          ? 'bg-off-white border-light-gray hover:border-purple'
                          : 'bg-light-gray/30 border-light-gray opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">{getIconForBoosterPack(pack)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-heading font-semibold text-sm truncate">
                            {pack.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {pack.is_premium && (
                              <div className="flex items-center">
                                <Star size={10} className="text-primary mr-1" />
                                <span className="text-xs text-primary">Premium</span>
                              </div>
                            )}
                            {!isAvailable && (
                              <span className="text-xs text-medium-gray">Locked</span>
                            )}
                            {pack.is_owned && pack.is_premium && (
                              <span className="text-xs text-green">Owned</span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle size={16} className="text-purple ml-2" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* Ready Up Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="space-y-3"
            >
              <Button 
                variant={isReady ? "secondary" : "primary"}
                size="lg" 
                onClick={handleReadyUp}
                className="w-full"
                disabled={isLoading}
              >
                {isReady ? (
                  <>
                    <CheckCircle size={20} className="mr-2" />
                    Ready to Draw!
                  </>
                ) : (
                  <>
                    <Zap size={20} className="mr-2" />
                    Ready Up
                  </>
                )}
              </Button>

              {allPlayersReady && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={handleStartGame}
                    className="w-full bg-green hover:bg-green/90"
                    disabled={isLoading || gameStarting}
                  >
                    <ArrowRight size={20} className="mr-2" />
                    {gameStarting ? 'Starting...' : 'Start Drawing Now!'}
                  </Button>
                </motion.div>
              )}
            </motion.div>

            {/* Auto-start indicator */}
            {safeTimeRemaining <= 10 && !allPlayersReady && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center bg-accent/20 p-3 rounded-lg border border-accent"
              >
                <p className="text-sm text-dark">
                  ⚡ Game auto-starts in {timeRemaining}s even if not everyone is ready!
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Game Starting Overlay */}
        <AnimatePresence>
          {gameStarting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="text-center text-white"
              >
                <motion.h1
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 0.8,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                  className="font-heading font-bold text-6xl mb-4"
                >
                  🎨
                </motion.h1>
                <h2 className="font-heading font-bold text-3xl mb-2">
                  Game Starting!
                </h2>
                <p className="text-xl">
                  Time to get sketchy...
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default PreRoundBriefingScreen;