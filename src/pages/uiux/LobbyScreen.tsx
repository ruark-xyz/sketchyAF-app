import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, Trophy, Lightbulb, X, Wifi, Share2, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Seo from '../../components/utils/Seo';
import { useAuth } from '../../context/AuthContext';
import { MatchmakingService } from '../../services/MatchmakingService';
import { useSimpleQueue } from '../../hooks/useSimpleQueue';
import { useMatchNotifications } from '../../hooks/useMatchNotifications';

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

  // Use simple queue management - navigation handled by server events
  const {
    isInQueue,
    isLoading,
    error,
    joinQueue,
    leaveQueue,
    clearError
  } = useSimpleQueue();

  // Listen for match notifications via PubNub
  const { isListening } = useMatchNotifications();

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
    if (isLoggedIn && !isInQueue && !isLoading && !hasAttemptedJoin.current) {
      console.log('LobbyScreen: Attempting to join queue...');
      hasAttemptedJoin.current = true;
      joinQueue();
    }

    // Reset the flag when user leaves queue
    if (!isInQueue && !isLoading) {
      hasAttemptedJoin.current = false;
    }
  }, [isLoggedIn, isInQueue, isLoading]); // Removed joinQueue from dependencies

  // Debug logging for queue state
  useEffect(() => {
    console.log('LobbyScreen: Queue state:', {
      isInQueue,
      isLoading,
      error
    });
  }, [isInQueue, isLoading, error]);

  // Handle exit queue action
  const handleExitQueue = useCallback(() => {
    leaveQueue();
    navigate('/');
  }, [leaveQueue, navigate]);

  // Navigation is now handled by server events via PubNub -> useUnifiedGameState

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
            <div><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</div>
            <div><strong>Listening for Matches:</strong> {isListening ? 'Yes' : 'No'}</div>
            <div><strong>Error:</strong> {error || 'None'}</div>
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

        {/* Match notifications now handled by server events */}

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

              {/* Queue Status */}
              <div className="bg-green/10 p-4 rounded-lg border border-green/30 text-center mb-6">
                <div className="flex items-center justify-center mb-2">
                  <Users size={18} className="text-green mr-2" />
                  <span className="text-sm text-medium-gray">Queue Status</span>
                </div>
                <motion.p
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="font-heading font-bold text-lg text-green"
                >
                  Waiting for players...
                </motion.p>
                <p className="text-xs text-medium-gray mt-1">
                  Server will notify when match is ready
                </p>
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

        {/* Match notifications handled by server events -> PubNub -> useUnifiedGameState */}
      </div>
    </>
  );
};

export default LobbyScreen;