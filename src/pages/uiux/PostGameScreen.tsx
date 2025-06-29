import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Share2,
  User,
  Play,
  Trophy,
  Heart,
  AlertCircle,
  Crown,
  Medal,
  Eye,
  Users,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Seo from '../../components/utils/Seo';
import { useGame } from '../../context/GameContext';
import { useUnifiedGameState } from '../../hooks/useUnifiedGameState';
import { useAuth } from '../../context/AuthContext';

// Note: Achievement and booster pack data will be implemented when backend APIs are ready

// Confetti animation pieces
const CONFETTI_PIECES = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  emoji: ['🎉', '🎊', '✨', '🌟', '🎈'][Math.floor(Math.random() * 5)],
  delay: Math.random() * 3,
  duration: Math.random() * 2 + 3,
  x: Math.random() * 100,
  rotation: Math.random() * 360
}));

const PostGameScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Use unified game state for consistency with SimpleGameRoute
  const {
    game: currentGame,
    isLoading,
    error
  } = useUnifiedGameState({ autoNavigate: false }); // Disable auto-navigation since we're already on the correct page

  // Extract data from unified game state (memoized to prevent re-render loops)
  const submissions = useMemo(() => (currentGame as any)?.submissions || [], [currentGame]);
  const votes = useMemo(() => (currentGame as any)?.votes || [], [currentGame]);

  // Get actions from GameContext for resetGameState
  const { actions } = useGame();

  const [shareSuccess, setShareSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [userSubmission, setUserSubmission] = useState<any>(null);
  const [gameResults, setGameResults] = useState<{
    placement: number;
    voteCount: number;
    xpGained: number;
    isWinner: boolean;
  } | null>(null);

  // Calculate user stats when data is available
  useEffect(() => {
    if (submissions.length > 0 && currentUser) {
      // Find user's submission
      const submission = submissions.find((s: any) => s.user_id === currentUser.id);
      if (submission) {
        setUserSubmission(submission);

        // Calculate placement
        const sortedSubmissions = [...submissions].sort((a: any, b: any) => {
          const aVotes = votes.filter((v: any) => v.submission_id === a.id).length;
          const bVotes = votes.filter((v: any) => v.submission_id === b.id).length;
          return bVotes - aVotes;
        });

        const placement = sortedSubmissions.findIndex((s: any) => s.id === submission.id) + 1;
        const voteCount = votes.filter((v: any) => v.submission_id === submission.id).length;

        // Calculate XP based on placement and votes
        const baseXP = 10;
        const placementBonus = Math.max(0, (submissions.length - placement + 1) * 5);
        const voteBonus = voteCount * 2;
        const xpGained = baseXP + placementBonus + voteBonus;

        setGameResults({
          placement,
          voteCount,
          xpGained,
          isWinner: placement === 1
        });
      }
    }
  }, [submissions, votes, currentUser]);

  // Show confetti for winners
  useEffect(() => {
    if (gameResults?.isWinner) {
      setShowConfetti(true);
      // Hide confetti after animation
      const confettiTimer = setTimeout(() => {
        setShowConfetti(false);
      }, 8000);

      return () => clearTimeout(confettiTimer);
    }
  }, [gameResults]);

  // Navigation is now handled by useUnifiedGameState in SimpleGameRoute

  const handleQueueAgain = () => {
    // Reset game state
    actions.resetGameState();
    
    // Navigate to lobby
    navigate('/uiux/lobby');
  };

  const handleViewProfile = () => {
    navigate('/profile');
  };

  const handleDownloadDrawing = () => {
    if (userSubmission?.drawing_url) {
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = userSubmission.drawing_url;
      link.download = `sketchyaf-${currentGame?.id || 'drawing'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.log('No drawing to download');
    }
  };

  const handleShareDrawing = () => {
    if (navigator.share && userSubmission) {
      navigator.share({
        title: 'Check out my SketchyAF drawing!',
        text: `I drew "${currentGame?.prompt}" - see how sketchy it turned out!`,
        url: userSubmission.drawing_url || window.location.origin
      });
    } else {
      // Fallback
      navigator.clipboard.writeText(window.location.origin);
    }
    
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 3000);
  };

  // Helper function for ordinal suffixes
  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return num + "st";
    if (j === 2 && k !== 12) return num + "nd";
    if (j === 3 && k !== 13) return num + "rd";
    return num + "th";
  };

  return (
    <>
      <Seo 
        title="Game Complete! | SketchyAF"
        description="Your sketchy adventure continues! Check your progress and jump into another round."
      />
      
      <div className="min-h-screen bg-gradient-to-br from-cream via-green/20 to-secondary/20 relative overflow-hidden">

        {/* Confetti Animation */}
        <AnimatePresence>
          {showConfetti && (
            <div className="fixed inset-0 pointer-events-none z-30">
              {CONFETTI_PIECES.map(piece => (
                <motion.div
                  key={piece.id}
                  initial={{
                    y: -100,
                    x: `${piece.x}vw`,
                    rotate: 0,
                    opacity: 1
                  }}
                  animate={{
                    y: '110vh',
                    rotate: piece.rotation,
                    opacity: [1, 1, 0]
                  }}
                  transition={{
                    delay: piece.delay,
                    duration: piece.duration,
                    ease: 'easeIn'
                  }}
                  className="absolute text-2xl"
                >
                  {piece.emoji}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="bg-white border-b-2 border-dark p-4 relative z-20">
          <div className="max-w-6xl mx-auto text-center">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-heading font-bold text-2xl md:text-3xl text-dark transform rotate-[-1deg]"
            >
              🎨 Game Complete! Keep the Sketchy Train Rolling!
            </motion.h1>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-4 mt-4">
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
        <div className="p-4 pb-8">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Game Results */}
            {gameResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
              >
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <Trophy size={24} className="text-accent mr-2" />
                    <h2 className="font-heading font-bold text-xl text-dark">Your Results</h2>
                  </div>

                  <div className={`p-4 rounded-lg border mb-4 ${
                    gameResults.isWinner
                      ? 'bg-accent/10 border-accent/30'
                      : 'bg-primary/10 border-primary/30'
                  }`}>
                    <motion.p
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className={`font-heading font-bold text-3xl mb-2 ${
                        gameResults.isWinner ? 'text-accent' : 'text-primary'
                      }`}
                    >
                      {gameResults.isWinner ? '🏆 Winner!' : `#${gameResults.placement}`}
                    </motion.p>
                    <p className="text-medium-gray mb-2">
                      {gameResults.isWinner ? 'Congratulations!' : `${getOrdinalSuffix(gameResults.placement)} Place`}
                    </p>

                    <div className="flex items-center justify-center text-sm text-dark">
                      <Heart size={16} className="text-red mr-1" />
                      <span>{gameResults.voteCount} vote{gameResults.voteCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-heading font-bold text-lg text-green">+{gameResults.xpGained}</p>
                      <p className="text-medium-gray">XP Earned</p>
                    </div>
                    <div className="text-center">
                      <p className="font-heading font-bold text-lg text-red">{gameResults.voteCount}</p>
                      <p className="text-medium-gray">Votes</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Note: Level progress and detailed stats will be implemented when user profile system is ready */}

            {/* Final Rankings */}
            {submissions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
              >
                <div className="flex items-center mb-4">
                  <Trophy size={24} className="text-accent mr-2" />
                  <h2 className="font-heading font-bold text-xl text-dark">Final Rankings</h2>
                </div>

                <div className="space-y-3">
                  {submissions
                    .sort((a: any, b: any) => {
                      const aVotes = votes.filter((v: any) => v.submission_id === a.id).length;
                      const bVotes = votes.filter((v: any) => v.submission_id === b.id).length;
                      return bVotes - aVotes;
                    })
                    .map((submission: any, index: number) => {
                      const voteCount = votes.filter((v: any) => v.submission_id === submission.id).length;
                      const isCurrentUser = submission.user_id === currentUser?.id;
                      const placement = index + 1;

                      return (
                        <motion.div
                          key={submission.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + index * 0.1 }}
                          className={`flex items-center p-4 rounded-lg border-2 ${
                            isCurrentUser
                              ? 'border-primary bg-primary/10'
                              : 'border-light-gray bg-off-white'
                          }`}
                        >
                          <div className="flex items-center mr-4">
                            {placement === 1 && <Crown size={24} className="text-yellow-500" />}
                            {placement === 2 && <Medal size={24} className="text-gray-400" />}
                            {placement === 3 && <Medal size={24} className="text-orange-600" />}
                            {placement > 3 && (
                              <div className="w-6 h-6 rounded-full bg-light-gray flex items-center justify-center">
                                <span className="text-xs font-bold text-medium-gray">{placement}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center">
                              <span className={`font-heading font-bold ${isCurrentUser ? 'text-primary' : 'text-dark'}`}>
                                {submission.users?.username || 'Unknown Player'}
                                {isCurrentUser && ' (You)'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center">
                            <Heart size={16} className="text-red mr-1 fill-red" />
                            <span className="font-heading font-bold text-dark">{voteCount}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              </motion.div>
            )}

            {/* Recent Drawing Showcase */}
            {userSubmission && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
              >
                <div className="flex items-center mb-4">
                  <Eye size={24} className="text-secondary mr-2" />
                  <h2 className="font-heading font-bold text-xl text-dark">Your Latest Masterpiece</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="relative mb-4">
                      <img 
                        src={userSubmission.drawing_url || 'https://via.placeholder.com/400x300?text=Loading+Drawing'} 
                        alt="Your recent drawing"
                        className="w-full h-48 object-cover rounded-lg border-2 border-secondary"
                      />
                      <div className="absolute bottom-2 right-2 bg-white rounded-full px-3 py-1 border border-dark text-sm flex items-center">
                        <Heart size={14} className="text-red mr-1 fill-red" />
                        <span className="font-heading font-semibold">
                          {votes.filter((v: any) => v.submission_id === userSubmission.id).length}
                        </span>
                      </div>
                    </div>
                    
                    <p className="font-heading font-bold text-lg text-dark mb-2">
                      "{currentGame?.prompt || 'Loading prompt...'}"
                    </p>
                    <p className="text-medium-gray text-sm">
                      Finished {new Date(userSubmission.submitted_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-heading font-semibold text-lg text-dark">Share Your Art</h3>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <Button 
                        variant="primary" 
                        size="md" 
                        onClick={handleDownloadDrawing}
                        className="w-full"
                        disabled={!userSubmission.drawing_url}
                      >
                        <Download size={18} className="mr-2" />
                        Download Drawing
                      </Button>
                      
                      <Button 
                        variant="secondary" 
                        size="md" 
                        onClick={handleShareDrawing}
                        className="w-full"
                        disabled={!userSubmission.drawing_url}
                      >
                        <Share2 size={18} className="mr-2" />
                        Share to Social
                      </Button>
                    </div>

                    {shareSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green/10 p-3 rounded-lg border border-green text-center"
                      >
                        <p className="text-sm text-green font-heading font-semibold">
                          ✅ Shared successfully!
                        </p>
                      </motion.div>
                    )}

                    <div className="bg-turquoise/10 p-3 rounded-lg border border-turquoise/30">
                      <p className="text-xs text-center text-dark">
                        💡 Share your drawings to earn bonus XP on your next game and climb the leaderboard faster!
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Play Again */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={handleQueueAgain}
                  className="w-full h-full min-h-[120px] flex flex-col items-center justify-center text-center"
                  disabled={isLoading}
                >
                  <Play size={32} className="mb-2" />
                  <span className="text-lg font-heading font-bold">Play Again</span>
                  <span className="text-sm opacity-80">Jump back in!</span>
                </Button>
              </motion.div>

              {/* Profile */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Button 
                  variant="secondary" 
                  size="lg" 
                  onClick={handleViewProfile}
                  className="w-full h-full min-h-[120px] flex flex-col items-center justify-center text-center"
                  disabled={isLoading}
                >
                  <User size={32} className="mb-2" />
                  <span className="text-lg font-heading font-bold">My Profile</span>
                  <span className="text-sm opacity-80">View stats</span>
                </Button>
              </motion.div>

              {/* Achievements */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Button 
                  variant="tertiary" 
                  size="lg" 
                  className="w-full h-full min-h-[120px] flex flex-col items-center justify-center text-center bg-white border-2 border-dark hover:bg-purple/5"
                  disabled={isLoading}
                >
                  <Trophy size={32} className="mb-2 text-purple" />
                  <span className="text-lg font-heading font-bold text-dark">Achievements</span>
                  <span className="text-sm text-medium-gray">View progress</span>
                </Button>
              </motion.div>

              {/* Invite Friends */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Button 
                  variant="tertiary" 
                  size="lg" 
                  className="w-full h-full min-h-[120px] flex flex-col items-center justify-center text-center bg-white border-2 border-dark hover:bg-green/5"
                  disabled={isLoading}
                >
                  <Users size={32} className="mb-2 text-green" />
                  <span className="text-lg font-heading font-bold text-dark">Invite Friends</span>
                  <span className="text-sm text-medium-gray">Share the fun</span>
                </Button>
              </motion.div>
            </div>

            {/* Note: Achievement progress will be implemented when achievement system is ready */}

            {/* Note: Booster pack promotions will be implemented when store system is ready */}

            {/* Final CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              className="text-center bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg border-2 border-dark p-8 hand-drawn"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1],
                  rotate: [0, 2, -2, 0]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity
                }}
                className="text-6xl mb-4"
              >
                🎨
              </motion.div>
              
              <h2 className="font-heading font-bold text-2xl text-dark mb-2 transform rotate-[-1deg]">
                Ready for Round 2?
              </h2>
              <p className="text-medium-gray text-lg mb-6">
                The sketchy fun never stops! Jump back in and create more artistic chaos.
              </p>
              
              <Button 
                variant="primary" 
                size="lg" 
                onClick={handleQueueAgain}
                className="animate-pulse"
                disabled={isLoading}
              >
                <Zap size={20} className="mr-2" />
                Queue for Another Game!
              </Button>
            </motion.div>

          </div>
        </div>

        {/* Note: Detailed stats modal will be implemented when user profile system is ready */}
      </div>
    </>
  );
};

export default PostGameScreen;