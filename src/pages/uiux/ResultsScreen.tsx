import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Medal, 
  Award, 
  Crown, 
  Star, 
  Heart, 
  Users, 
  Play, 
  User, 
  Share2,
  Gift,
  Sparkles,
  TrendingUp,
  Zap,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Seo from '../../components/utils/Seo';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { GamePhase } from '../../types/gameContext';

// Confetti animation pieces
const CONFETTI_PIECES = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  emoji: ['🎉', '🎊', '✨', '🌟', '🎈'][Math.floor(Math.random() * 5)],
  delay: Math.random() * 3,
  duration: Math.random() * 2 + 3,
  x: Math.random() * 100,
  rotation: Math.random() * 360
}));

const ResultsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { 
    currentGame, 
    gamePhase, 
    submissions, 
    participants, 
    votes, 
    results,
    actions,
    error,
    isLoading
  } = useGame();
  
  const [showConfetti, setShowConfetti] = useState(true);
  const [showAchievements, setShowAchievements] = useState(false);
  const [currentPlayerRank, setCurrentPlayerRank] = useState<string>('');
  const [winnerSubmission, setWinnerSubmission] = useState<any>(null);
  const [runnerUps, setRunnerUps] = useState<any[]>([]);

  // Calculate results when data is available
  useEffect(() => {
    if (submissions.length > 0 && votes.length > 0) {
      // Calculate vote counts for each submission
      const submissionsWithVotes = submissions.map(submission => {
        const voteCount = votes.filter(vote => vote.submission_id === submission.id).length;
        return {
          ...submission,
          voteCount
        };
      });
      
      // Sort by vote count (descending)
      const sortedSubmissions = [...submissionsWithVotes].sort((a, b) => b.voteCount - a.voteCount);
      
      // Get winner and runner-ups
      if (sortedSubmissions.length > 0) {
        setWinnerSubmission(sortedSubmissions[0]);
        setRunnerUps(sortedSubmissions.slice(1, 3));
      }
      
      // Determine current player's placement
      if (currentUser) {
        const userSubmission = sortedSubmissions.find(s => s.user_id === currentUser.id);
        if (userSubmission) {
          const placement = sortedSubmissions.findIndex(s => s.id === userSubmission.id) + 1;
          const suffix = placement === 1 ? 'st' : placement === 2 ? 'nd' : placement === 3 ? 'rd' : 'th';
          setCurrentPlayerRank(`${placement}${suffix}`);
        }
      }
    }
  }, [submissions, votes, currentUser]);

  // Navigation is now handled by useUnifiedGameState in SimpleGameRoute

  // Show achievements after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAchievements(true);
    }, 3000);
    
    // Hide confetti after animation
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 8000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(confettiTimer);
    };
  }, []);

  // Auto-transition to post-game after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentGame) {
        // Transition to completed phase
        actions.transitionGameStatus(currentGame.id, 'completed', 'results')
          .then(() => {
            navigate(`/uiux/post-game?gameId=${currentGame.id}`);
          })
          .catch(err => {
            console.error('Failed to transition to completed:', err);
          });
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [currentGame, navigate, actions]);

  const handlePlayAgain = () => {
    navigate('/uiux/lobby');
  };

  const handleViewProfile = () => {
    navigate('/profile');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Check out my SketchyAF results!',
        text: `I just played SketchyAF with the prompt "${currentGame?.prompt}"!`,
        url: window.location.origin
      });
    } else {
      // Fallback
      navigator.clipboard.writeText(window.location.origin);
      alert('Link copied to clipboard!');
    }
  };

  // Check if current player is the winner
  const isCurrentPlayerWinner = winnerSubmission?.user_id === currentUser?.id;

  // Find participant info for a submission
  const getParticipantInfo = (userId: string) => {
    return participants.find(p => p.user_id === userId);
  };

  return (
    <>
      <Seo 
        title="Game Results | SketchyAF"
        description="See who won this round of sketchy chaos!"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-cream via-accent/30 to-primary/20 relative overflow-hidden">
        
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
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-heading font-bold text-2xl md:text-3xl text-dark transform rotate-[-1deg]"
            >
              🏆 Results: "{currentGame?.prompt || 'Loading prompt...'}"
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
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Winner Spotlight */}
            {winnerSubmission && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="text-center"
              >
                <div className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] relative overflow-hidden">
                  
                  {/* Winner Crown Animation */}
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 1, type: "spring", stiffness: 300 }}
                    className="absolute -top-4 -right-4 text-4xl"
                  >
                    👑
                  </motion.div>

                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="relative"
                  >
                    <h2 className="font-heading font-bold text-2xl text-dark mb-4">
                      🎉 Winner! 🎉
                    </h2>
                    
                    <div className="flex flex-col items-center mb-4">
                      <motion.img 
                        src={getParticipantInfo(winnerSubmission.user_id)?.avatar_url || `https://ui-avatars.com/api/?name=${getParticipantInfo(winnerSubmission.user_id)?.username || 'Winner'}&background=random`} 
                        alt={getParticipantInfo(winnerSubmission.user_id)?.username || 'Winner'}
                        className="w-20 h-20 rounded-full border-4 border-accent mb-3"
                        whileHover={{ scale: 1.1 }}
                      />
                      <h3 className="font-heading font-bold text-xl text-primary">
                        {getParticipantInfo(winnerSubmission.user_id)?.username || 'Winner'}
                      </h3>
                      <div className="flex items-center mt-1">
                        <Heart size={16} className="text-red mr-1 fill-red" />
                        <span className="font-heading font-semibold">
                          {winnerSubmission.voteCount} votes ({Math.round((winnerSubmission.voteCount / votes.length) * 100)}%)
                        </span>
                      </div>
                    </div>

                    <div className="relative mb-4">
                      <img 
                        src={winnerSubmission.drawing_url || 'https://via.placeholder.com/400x300?text=Loading+Drawing'} 
                        alt="Winning drawing"
                        className="w-full max-w-md mx-auto h-48 object-cover rounded-lg border-2 border-accent"
                      />
                      <div className="absolute -top-2 -left-2 bg-accent text-dark px-3 py-1 rounded-full text-sm font-heading font-bold border-2 border-dark transform -rotate-12">
                        Winner!
                      </div>
                    </div>

                    {winnerSubmission.voteCount >= participants.length / 2 && (
                      <div className="inline-flex items-center bg-primary/10 px-4 py-2 rounded-full border border-primary/30">
                        <Star size={16} className="text-primary mr-2" />
                        <span className="text-sm font-heading font-semibold text-primary">
                          MVP - Majority Vote!
                        </span>
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Action Buttons - Moved here between Winner and Podium */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <Button 
                variant="primary" 
                size="lg" 
                onClick={handlePlayAgain}
                className="w-full"
                disabled={isLoading}
              >
                <Play size={20} className="mr-2" />
                Play Again
              </Button>

              <Button 
                variant="secondary" 
                size="lg" 
                onClick={handleViewProfile}
                className="w-full"
                disabled={isLoading}
              >
                <User size={20} className="mr-2" />
               See performance
              </Button>

              <Button 
                variant="tertiary" 
                size="lg" 
                onClick={handleShare}
                className="w-full"
                disabled={isLoading}
              >
                <Share2 size={20} className="mr-2" />
                Share Results
              </Button>
            </motion.div>

            {/* Podium Display */}
            {runnerUps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.6 }}
                className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
              >
                <h3 className="font-heading font-bold text-xl text-dark mb-6 text-center flex items-center justify-center">
                  <Medal size={24} className="mr-2 text-accent" />
                  Final Standings
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Winner (already shown above, so show abbreviated version) */}
                  {winnerSubmission && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.7 }}
                      className="bg-accent/20 p-4 rounded-lg border-2 border-accent text-center order-2 md:order-1"
                    >
                      <div className="relative">
                        <div className="text-3xl mb-2">🥇</div>
                        <img 
                          src={getParticipantInfo(winnerSubmission.user_id)?.avatar_url || `https://ui-avatars.com/api/?name=${getParticipantInfo(winnerSubmission.user_id)?.username || 'Winner'}&background=random`} 
                          alt={getParticipantInfo(winnerSubmission.user_id)?.username || 'Winner'}
                          className="w-12 h-12 rounded-full border-2 border-accent mx-auto mb-2"
                        />
                        <p className="font-heading font-bold text-sm">{getParticipantInfo(winnerSubmission.user_id)?.username || 'Winner'}</p>
                        <p className="text-xs text-medium-gray">{winnerSubmission.voteCount} votes</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Runner-ups */}
                  {runnerUps.map((submission, index) => (
                    <motion.div
                      key={submission.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.8 + index * 0.1 }}
                      className={`bg-off-white p-4 rounded-lg border-2 border-light-gray text-center ${
                        index === 0 ? 'order-1 md:order-2' : 'order-3'
                      }`}
                    >
                      <div className="text-2xl mb-2">
                        {index === 0 ? '🥈' : '🥉'}
                      </div>
                      <img 
                        src={getParticipantInfo(submission.user_id)?.avatar_url || `https://ui-avatars.com/api/?name=${getParticipantInfo(submission.user_id)?.username || 'User'}&background=random`} 
                        alt={getParticipantInfo(submission.user_id)?.username || 'User'}
                        className="w-12 h-12 rounded-full border-2 border-light-gray mx-auto mb-2"
                      />
                      <p className="font-heading font-bold text-sm">{getParticipantInfo(submission.user_id)?.username || 'User'}</p>
                      <p className="text-xs text-medium-gray">{submission.voteCount} votes</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Personal Results */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2, duration: 0.6 }}
              className={`rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] ${
                isCurrentPlayerWinner 
                  ? 'bg-gradient-to-br from-accent/20 to-primary/20' 
                  : 'bg-white'
              }`}
            >
              <div className="text-center">
                {isCurrentPlayerWinner ? (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <h3 className="font-heading font-bold text-2xl text-dark mb-3">
                      🎊 Congratulations! You Won! 🎊
                    </h3>
                    <p className="text-lg text-dark mb-4">
                      Your sketchy masterpiece claimed victory!
                    </p>
                  </motion.div>
                ) : (
                  <div>
                    <h3 className="font-heading font-bold text-xl text-dark mb-2">
                      You came {currentPlayerRank || '...'}!
                    </h3>
                    <p className="text-medium-gray mb-4">
                      {currentPlayerRank && parseInt(currentPlayerRank) <= 2 
                        ? "Great job! You're getting better at this sketchy business." 
                        : "Keep practicing those artistic skills! Every sketch counts."}
                    </p>
                  </div>
                )}

                {/* Rewards - Only showing XP now */}
                <div className="flex justify-center mb-4">
                  <div className="bg-secondary/10 p-4 rounded-lg border border-secondary/30 max-w-xs">
                    <div className="flex items-center justify-center mb-2">
                      <Zap size={20} className="text-secondary mr-2" />
                      <span className="text-sm text-medium-gray">XP Gained</span>
                    </div>
                    <p className="font-heading font-bold text-2xl text-secondary">
                      +{isCurrentPlayerWinner ? 100 : currentPlayerRank && parseInt(currentPlayerRank) <= 3 ? 50 : 25}
                    </p>
                  </div>
                </div>

                {isCurrentPlayerWinner && (
                  <div className="bg-primary/10 p-3 rounded-lg border border-primary/30 mb-4">
                    <div className="flex items-center justify-center">
                      <Trophy size={18} className="text-primary mr-2" />
                      <span className="font-heading font-semibold text-primary">
                        Winner Bonus: +50 XP!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Vote Breakdown (Optional Detail) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 3, duration: 0.6 }}
              className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              <h3 className="font-heading font-bold text-lg text-dark mb-4 flex items-center">
                <Users size={20} className="mr-2 text-primary" />
                Who Voted for Whom
              </h3>

              <div className="space-y-3">
                <div className="text-sm text-medium-gray mb-3">
                  Here's how the votes broke down:
                </div>
                
                {/* Vote details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {votes.map((vote, index) => {
                    const voter = getParticipantInfo(vote.voter_id);
                    const submission = submissions.find(s => s.id === vote.submission_id);
                    const submitter = submission ? getParticipantInfo(submission.user_id) : null;
                    
                    return (
                      <div key={vote.id} className="bg-off-white p-3 rounded-lg border border-light-gray">
                        <span className="font-heading font-semibold">{voter?.username || 'Unknown'}</span> voted for <span className="text-primary font-semibold">{submitter?.username || 'Unknown'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Next Round Teaser */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 3.5, duration: 0.6 }}
              className="text-center bg-turquoise/20 rounded-lg border-2 border-turquoise p-4 hand-drawn"
            >
              <div className="flex items-center justify-center mb-2">
                <TrendingUp size={18} className="text-turquoise mr-2" />
                <span className="font-heading font-semibold text-dark">Coming Up Next</span>
              </div>
              <p className="text-dark text-sm">
                More ridiculous prompts await! Jump back in for round 2 of artistic chaos.
              </p>
            </motion.div>

          </div>
        </div>
      </div>
    </>
  );
};

export default ResultsScreen;