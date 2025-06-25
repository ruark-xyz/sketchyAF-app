import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, Trophy, Lightbulb, X, Wifi, Share2, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Seo from '../../components/utils/Seo';
import { useMatchmaking } from '../../hooks/useMatchmaking';
import { useAuth } from '../../context/AuthContext';
import { MatchmakingService } from '../../services/MatchmakingService';

// Tip and trivia data - static content that doesn't need to be fetched
const TIPS_AND_TRIVIA = [
  "💡 Tip: The worse your drawing, the funnier it gets!",
  "🎨 Did you know? 73% of SketchyAF winners can't draw stick figures properly.",
  "⚡ Pro tip: Use booster packs for maximum chaos and confusion.",
  "🏆 Fun fact: The most voted drawing was literally just a potato with legs.",
  "🎭 Remember: Artistic skill is optional, creativity is everything!",
  "🌟 Tip: Sometimes the best strategy is to embrace the chaos.",
];

// Recent sketches data - this would ideally come from an API in production
// For now, we'll keep this as static content since we don't have a real API endpoint
const RECENT_SKETCHES = [
  {
    id: 1,
    text: "🐱 Someone just drew 'A cat having an existential crisis'",
    drawingUrl: 'https://images.pexels.com/photos/1092364/pexels-photo-1092364.jpeg?auto=compress&cs=tinysrgb&w=150',
    drawingId: 1
  },
  {
    id: 2,
    text: "🚀 Winner: 'Astronaut eating spaghetti in zero gravity'",
    drawingUrl: 'https://images.pexels.com/photos/1887946/pexels-photo-1887946.jpeg?auto=compress&cs=tinysrgb&w=150',
    drawingId: 2
  },
  {
    id: 3,
    text: "🦄 Epic sketch: 'Unicorn working in customer service'",
    drawingUrl: 'https://images.pexels.com/photos/1616403/pexels-photo-1616403.jpeg?auto=compress&cs=tinysrgb&w=150',
    drawingId: 3
  },
  {
    id: 4,
    text: "🍕 Masterpiece: 'Pizza slice contemplating life choices'",
    drawingUrl: 'https://images.pexels.com/photos/1266302/pexels-photo-1266302.jpeg?auto=compress&cs=tinysrgb&w=150',
    drawingId: 4
  },
];

const LobbyScreen: React.FC = () => {
  const [currentTip, setCurrentTip] = useState(0);
  const [currentSketch, setCurrentSketch] = useState(0);
  const navigate = useNavigate();
  const { isLoggedIn, currentUser } = useAuth();
  const hasAttemptedJoin = useRef(false);

  // Debug: Log current user
  useEffect(() => {
    console.log('LobbyScreen: Current user:', currentUser?.id, currentUser?.email);
  }, [currentUser]);

  // Use the matchmaking hook for real queue management
  const {
    isInQueue,
    queuePosition,
    estimatedWaitTime,
    matchFound,
    isLoading,
    error,
    joinQueue,
    leaveQueue,
    acceptMatch,
    declineMatch
  } = useMatchmaking();

  // Rotate tips every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % TIPS_AND_TRIVIA.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Rotate recent sketches every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSketch(prev => (prev + 1) % RECENT_SKETCHES.length);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  // Join queue on component mount if not already in queue
  useEffect(() => {
    if (isLoggedIn && !isInQueue && !isLoading && !matchFound && !hasAttemptedJoin.current) {
      console.log('LobbyScreen: Attempting to join queue...');
      hasAttemptedJoin.current = true;
      joinQueue();
    }

    // Reset the flag when user leaves queue
    if (!isInQueue && !isLoading) {
      hasAttemptedJoin.current = false;
    }
  }, [isLoggedIn, isInQueue, isLoading, matchFound]); // Removed joinQueue from dependencies

  // Debug logging for queue state
  useEffect(() => {
    console.log('LobbyScreen: Queue state:', {
      isInQueue,
      queuePosition,
      estimatedWaitTime,
      matchFound,
      isLoading,
      error
    });
  }, [isInQueue, queuePosition, estimatedWaitTime, matchFound, isLoading, error]);

  // Handle exit queue action
  const handleExitQueue = useCallback(() => {
    leaveQueue();
    navigate('/');
  }, [leaveQueue, navigate]);

  // Show match found message (auto-redirect is handled in useMatchmaking)
  useEffect(() => {
    if (matchFound) {
      console.log('Match found! Preparing to redirect to pre-round...');
    }
  }, [matchFound]);

  // Handle invite friend action
  const handleInviteFriend = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: 'Join me in SketchyAF!',
        text: 'Come draw terrible sketches with me!',
        url: window.location.origin,
      }).catch(err => {
        console.log('Error sharing:', err);
      });
    } else {
      // Fallback for desktop
      navigator.clipboard.writeText(window.location.origin)
        .then(() => {
          alert('Invite link copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy:', err);
        });
    }
  }, []);

  // Format number with commas for readability
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // Get current sketch data
  const currentSketchData = RECENT_SKETCHES[currentSketch];

  return (
    <>
      <Seo 
        title="Finding Players... | SketchyAF"
        description="Joining a SketchyAF drawing game - finding other players to create chaos with!"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-cream via-turquoise/20 to-pink/20 flex flex-col">
        {/* Header */}
        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center">
            <Wifi className={`w-5 h-5 ${isInQueue ? 'text-green' : 'text-red'} mr-2`} />
            <div className="flex flex-col">
              <span className="text-sm font-heading font-bold text-dark">
                {isInQueue ? 'In Queue' : isLoading ? 'Connecting...' : 'Disconnected'}
              </span>
              <span className="text-xs text-medium-gray">
                {currentUser?.email || 'Not logged in'}
              </span>
            </div>
          </div>
          
          <Button 
            variant="tertiary" 
            size="sm" 
            onClick={handleExitQueue}
            className="text-medium-gray"
            disabled={isLoading}
          >
            <X size={18} className="mr-1" />
            Exit Queue
          </Button>
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

        {/* Debug Info */}
        <div className="mx-4 mb-4">
          <div className="bg-gray-100 border rounded-lg p-3 text-xs">
            <div><strong>User:</strong> {currentUser?.id?.slice(0, 8)}... ({currentUser?.email})</div>
            <div><strong>Queue Status:</strong> {isInQueue ? 'In Queue' : 'Not in Queue'}</div>
            <div><strong>Position:</strong> {queuePosition || 'N/A'}</div>
            <div><strong>Wait Time:</strong> {estimatedWaitTime ? `${estimatedWaitTime}s` : 'N/A'}</div>
            <div><strong>Match Found:</strong> {matchFound ? 'Yes' : 'No'}</div>
            <div><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</div>
            <div className="mt-2 space-x-2">
              <button
                onClick={async () => {
                  const queueState = await (MatchmakingService as any).getQueueState();
                  console.log('Manual queue check:', queueState);
                  alert(`Queue has ${queueState.count} players: ${queueState.players.map((p: string) => p.slice(0, 8)).join(', ')}`);
                }}
                className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
              >
                Check Queue
              </button>
              <button
                onClick={async () => {
                  console.log('Manually triggering queue processing...');
                  const result = await MatchmakingService.triggerQueueProcessing();
                  console.log('Queue processing result:', result);
                  alert(result.success ? 'Queue processing triggered!' : `Error: ${result.error}`);
                }}
                className="bg-green-500 text-white px-2 py-1 rounded text-xs"
              >
                Process Queue
              </button>
              <button
                onClick={async () => {
                  const matchResult = await (MatchmakingService as any).checkMatchStatus();
                  console.log('Match status:', matchResult);
                  alert(`Match found: ${matchResult.data?.match_found ? 'YES' : 'NO'}${matchResult.data?.game_id ? ` - Game: ${matchResult.data.game_id}` : ''}`);
                }}
                className="bg-purple-500 text-white px-2 py-1 rounded text-xs"
              >
                Check Match
              </button>
            </div>
          </div>
        </div>

        {/* Match Found Overlay */}
        {matchFound && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-green/90 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg p-8 text-center shadow-lg"
            >
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="font-heading font-bold text-2xl text-dark mb-2">Match Found!</h2>
              <p className="text-dark-gray mb-4">Preparing your game...</p>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-green rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-green rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center px-4 pb-8">
          <div className="max-w-md mx-auto w-full space-y-6">
            
            {/* Queue Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
            >
              <div className="text-center mb-6">
                <h1 className="font-heading font-bold text-2xl text-dark mb-2 transform rotate-[-1deg]">
                  Finding Players...
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

              {/* Queue Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <motion.div 
                  className="bg-secondary/10 p-3 rounded-lg text-center border border-secondary/30"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="flex items-center justify-center mb-1">
                    <Trophy size={16} className="text-secondary mr-1" />
                    <span className="text-xs text-medium-gray">Position</span>
                  </div>
                  <motion.p 
                    key={queuePosition}
                    initial={{ scale: 1.2, color: "#22a7e5" }}
                    animate={{ scale: 1, color: "#2d2d2d" }}
                    className="font-heading font-bold text-xl"
                  >
                    #{queuePosition || '...'}
                  </motion.p>
                </motion.div>

                <motion.div 
                  className="bg-green/10 p-3 rounded-lg text-center border border-green/30"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="flex items-center justify-center mb-1">
                    <Users size={16} className="text-green mr-1" />
                    <span className="text-xs text-medium-gray">Queue Position</span>
                  </div>
                  <motion.p
                    key={queuePosition || 0}
                    initial={{ scale: 1.2, color: "#7bc043" }}
                    animate={{ scale: 1, color: "#2d2d2d" }}
                    className="font-heading font-bold text-xl"
                  >
                    {queuePosition ? `#${formatNumber(queuePosition)}` : '...'}
                  </motion.p>
                </motion.div>
              </div>

              {/* Estimated Wait Time */}
              <div className="bg-accent/10 p-4 rounded-lg border border-accent/30 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clock size={18} className="text-accent mr-2" />
                  <span className="text-sm text-medium-gray">Estimated Wait</span>
                </div>
                <motion.p 
                  key={estimatedWaitTime}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="font-heading font-bold text-lg"
                >
                  ~{estimatedWaitTime || '...'} seconds
                </motion.p>
              </div>
            </motion.div>

            {/* Tips & Trivia */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-pink/20 rounded-lg border-2 border-pink p-4 hand-drawn"
            >
              <div className="flex items-center mb-2">
                <Lightbulb size={18} className="text-dark mr-2" />
                <span className="font-heading font-semibold text-dark">While You Wait...</span>
              </div>
              
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentTip}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-dark-gray"
                >
                  {TIPS_AND_TRIVIA[currentTip]}
                </motion.p>
              </AnimatePresence>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-turquoise/20 rounded-lg border-2 border-turquoise p-4 hand-drawn"
            >
              <h3 className="font-heading font-semibold text-dark mb-3">🎯 Recent Activity</h3>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSketch}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-start space-x-3"
                >
                  {/* Thumbnail */}
                  <Link 
                    to={`/art/${currentSketchData.drawingId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 group"
                  >
                    <motion.img 
                      src={currentSketchData.drawingUrl} 
                      alt="Recent winning sketch"
                      className="w-12 h-12 rounded-lg border-2 border-turquoise object-cover group-hover:scale-110 transition-transform duration-200"
                      whileHover={{ scale: 1.1 }}
                    />
                  </Link>
                  
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-dark-gray text-sm">
                      {currentSketchData.text}
                    </p>
                    <Link 
                      to={`/art/${currentSketchData.drawingId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-turquoise hover:underline inline-flex items-center mt-1"
                    >
                      View artwork →
                    </Link>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Invite Friend Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-center"
            >
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleInviteFriend}
                className="w-full"
              >
                <Share2 size={18} className="mr-2" />
                Invite a Friend
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Match Found Modal */}
        <AnimatePresence>
          {matchFound && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-white rounded-lg border-2 border-dark p-6 max-w-sm w-full hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
              >
                <div className="text-center">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 0.6,
                      repeat: Infinity,
                      repeatDelay: 1
                    }}
                    className="text-4xl mb-4"
                  >
                    🎉
                  </motion.div>
                  
                  <h2 className="font-heading font-bold text-2xl text-dark mb-2 transform rotate-[-1deg]">
                    Match Found!
                  </h2>
                  <p className="text-medium-gray mb-6">
                    Players ready to create chaos!
                  </p>
                  
                  <div className="flex gap-3">
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={acceptMatch}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Joining...' : 'Accept'}
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={declineMatch}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      Decline
                    </Button>
                  </div>
                  
                  <p className="text-xs text-medium-gray mt-3">
                    Auto-accepting in 10s...
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default LobbyScreen;