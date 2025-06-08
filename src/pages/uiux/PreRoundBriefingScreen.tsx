import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, Palette, CheckCircle, ArrowRight, Zap, Star } from 'lucide-react';
import Button from '../../components/ui/Button';
import Seo from '../../components/utils/Seo';

// Mock data for demo purposes
const MOCK_PLAYERS = [
  { 
    id: 1, 
    username: 'SketchLord', 
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg', 
    isReady: false,
    level: 47,
    isPremium: true
  },
  { 
    id: 2, 
    username: 'DoodleQueen', 
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg', 
    isReady: true,
    level: 23,
    isPremium: false
  },
  { 
    id: 3, 
    username: 'ArtisticTroll', 
    avatar: 'https://randomuser.me/api/portraits/men/15.jpg', 
    isReady: true,
    level: 31,
    isPremium: true
  },
  { 
    id: 4, 
    username: 'You', 
    avatar: 'https://randomuser.me/api/portraits/women/63.jpg', 
    isReady: false, 
    isCurrentUser: true,
    level: 12,
    isPremium: false
  },
];

const MOCK_BOOSTER_PACKS = [
  { id: 'meme-lords', name: 'Meme Lords', icon: '😂', available: true },
  { id: 'internet-classics', name: 'Internet Classics', icon: '🌐', available: true },
  { id: 'premium-chaos', name: 'Premium Chaos', icon: '⭐', available: false, isPremium: true },
  { id: 'emoji-explosion', name: 'Emoji Explosion', icon: '🎭', available: true },
];

const GAME_PROMPTS = [
  'A raccoon having an existential crisis',
  'Your boss as a potato',
  'A cat wearing a business suit',
  'Aliens visiting a fast-food restaurant',
  'A dinosaur riding a skateboard',
];

const PreRoundBriefingScreen: React.FC = () => {
  const [players, setPlayers] = useState(MOCK_PLAYERS);
  const [selectedBoosterPack, setSelectedBoosterPack] = useState<string | null>(null);
  const [currentPrompt] = useState(GAME_PROMPTS[Math.floor(Math.random() * GAME_PROMPTS.length)]);
  const [countdown, setCountdown] = useState(15);
  const [isReady, setIsReady] = useState(false);
  const [gameStarting, setGameStarting] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setGameStarting(true);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // Simulate other players getting ready
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers(prev => 
        prev.map(player => {
          if (!player.isCurrentUser && !player.isReady && Math.random() > 0.7) {
            return { ...player, isReady: true };
          }
          return player;
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleReadyUp = () => {
    setIsReady(!isReady);
    setPlayers(prev => 
      prev.map(player => 
        player.isCurrentUser ? { ...player, isReady: !isReady } : player
      )
    );
  };

  const handleBoosterPackSelect = (packId: string) => {
    setSelectedBoosterPack(packId === selectedBoosterPack ? null : packId);
  };

  const handleStartGame = () => {
    // In real app, this would navigate to drawing canvas
    console.log('Starting game with:', { 
      prompt: currentPrompt, 
      boosterPack: selectedBoosterPack 
    });
  };

  const readyPlayersCount = players.filter(p => p.isReady).length;
  const allPlayersReady = readyPlayersCount === players.length;

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
            key={countdown}
            initial={{ scale: 1.2, color: countdown <= 5 ? '#ff5a5a' : '#2d2d2d' }}
            animate={{ scale: 1, color: countdown <= 5 ? '#ff5a5a' : '#2d2d2d' }}
            className="inline-flex items-center bg-white rounded-full px-4 py-2 border-2 border-dark hand-drawn shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            <Clock size={20} className="mr-2" />
            <span className="font-heading font-bold text-xl">
              {countdown <= 5 ? '🔥 ' : ''}{countdown}s
            </span>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center px-4 pb-8">
          <div className="max-w-lg mx-auto w-full space-y-6">
            
            {/* Game Prompt */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] text-center"
            >
              <h1 className="font-heading font-bold text-2xl text-dark mb-2 transform rotate-[-1deg]">
                Your Prompt
              </h1>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="bg-primary/10 p-4 rounded-lg border border-primary/30 mb-4"
              >
                <p className="font-heading font-bold text-xl text-primary">
                  "{currentPrompt}"
                </p>
              </motion.div>
              <p className="text-medium-gray text-sm">
                You have 60 seconds to draw this. Make it sketchy! 🎨
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
                    {readyPlayersCount}/{players.length} Ready
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index, duration: 0.3 }}
                    className={`flex items-center p-3 rounded-lg border-2 ${
                      player.isReady 
                        ? 'bg-green/10 border-green' 
                        : 'bg-orange/10 border-orange'
                    }`}
                  >
                    <img 
                      src={player.avatar} 
                      alt={player.username}
                      className="w-10 h-10 rounded-full border-2 border-dark mr-3"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        <p className="font-heading font-semibold text-sm truncate">
                          {player.username}
                          {player.isCurrentUser && ' (You)'}
                        </p>
                        {player.isPremium && (
                          <Star size={12} className="text-primary fill-primary flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-medium-gray">
                          Lv. {player.level}
                        </span>
                        <div className="flex items-center">
                          {player.isReady ? (
                            <>
                              <CheckCircle size={12} className="text-green mr-1" />
                              <span className="text-xs text-green">Ready</span>
                            </>
                          ) : (
                            <>
                              <Clock size={12} className="text-orange mr-1" />
                              <span className="text-xs text-orange">
                                {player.isCurrentUser ? 'Ready up!' : 'Waiting...'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
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
                {MOCK_BOOSTER_PACKS.map(pack => (
                  <motion.button
                    key={pack.id}
                    whileHover={{ scale: pack.available ? 1.05 : 1 }}
                    whileTap={{ scale: pack.available ? 0.95 : 1 }}
                    onClick={() => pack.available && handleBoosterPackSelect(pack.id)}
                    disabled={!pack.available}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedBoosterPack === pack.id
                        ? 'bg-purple/20 border-purple'
                        : pack.available
                        ? 'bg-off-white border-light-gray hover:border-purple'
                        : 'bg-light-gray/30 border-light-gray opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">{pack.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-semibold text-sm truncate">
                          {pack.name}
                        </p>
                        {pack.isPremium && (
                          <div className="flex items-center mt-1">
                            <Star size={10} className="text-primary mr-1" />
                            <span className="text-xs text-primary">Premium</span>
                          </div>
                        )}
                      </div>
                      {selectedBoosterPack === pack.id && (
                        <CheckCircle size={16} className="text-purple ml-2" />
                      )}
                    </div>
                  </motion.button>
                ))}
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
                  >
                    <ArrowRight size={20} className="mr-2" />
                    Start Drawing Now!
                  </Button>
                </motion.div>
              )}
            </motion.div>

            {/* Auto-start indicator */}
            {countdown <= 10 && !allPlayersReady && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center bg-accent/20 p-3 rounded-lg border border-accent"
              >
                <p className="text-sm text-dark">
                  ⚡ Game auto-starts in {countdown}s even if not everyone is ready!
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