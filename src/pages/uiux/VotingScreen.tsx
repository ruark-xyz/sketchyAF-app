import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Users, 
  Check, 
  Heart,
  Eye,
  ZoomIn,
  X,
  Vote,
  Star,
  AlertCircle
} from 'lucide-react';

import Button from '../../components/ui/Button';
import Seo from '../../components/utils/Seo';
import { useUnifiedGameState } from '../../hooks/useUnifiedGameState';
import { useGame } from '../../context/GameContext';
import { useSimpleTimer } from '../../hooks/useSimpleTimer';
import { Submission } from '../../types/game';

const VotingScreen: React.FC = () => {
  const {
    game: currentGame,
    isLoading: gameLoading,
    error: gameError
  } = useUnifiedGameState({ autoNavigate: true }); // Enable auto-navigation for server-driven transitions

  // Keep some GameContext usage for voting-specific state
  const {
    submissions,
    hasVoted,
    actions,
    error,
    isLoading
  } = useGame();

  // Use participants from unified game state (includes user data)
  const participants = (currentGame as any)?.game_participants || [];
  
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [showZoomedImage, setShowZoomedImage] = useState<string | null>(null);
  const [votingPhase, setVotingPhase] = useState<'voting' | 'waiting' | 'revealing'>('voting');
  const [showVoteBreakdown, setShowVoteBreakdown] = useState(false);
  
  // Simple timer display - server manages the timer, we just display it
  const {
    timeRemaining,
    formattedTime,
    isLoading: timerLoading,
    error: timerError
  } = useSimpleTimer({
    gameId: currentGame?.id || ''
  });

  // Navigation is now handled by useUnifiedGameState in SimpleGameRoute

  // Auto-submit logic is now handled server-side via timer expiration

  // Update voting phase based on votes
  useEffect(() => {
    // If user has voted, show waiting phase
    if (hasVoted && votingPhase === 'voting') {
      setVotingPhase('waiting');
    }
    
    // Check if all players have voted
    const allVoted = participants.length > 0 && 
                    submissions.every(s => s.vote_count > 0);
    
    if (allVoted && votingPhase !== 'revealing') {
      setVotingPhase('revealing');
      setTimeout(() => {
        setShowVoteBreakdown(true);
      }, 1000);
    }
  }, [hasVoted, participants, submissions, votingPhase]);

  // Phase transitions are now handled server-side automatically

  const handleVote = useCallback(async () => {
    if (!selectedSubmission || hasVoted || isLoading) return;
    
    try {
      await actions.castVote(selectedSubmission);
      setVotingPhase('waiting');
    } catch (err) {
      console.error('Failed to cast vote:', err);
    }
  }, [selectedSubmission, hasVoted, isLoading, actions]);

  const handleZoomImage = (submissionId: string) => {
    setShowZoomedImage(submissionId);
  };

  const closeZoomedImage = () => {
    setShowZoomedImage(null);
  };

  // Get non-current-user submissions for voting
  const votableSubmissions = submissions.filter(s => s.user_id !== currentGame?.created_by);
  
  // Count voted players
  const votedPlayersCount = participants.filter((p: any) => p.is_ready).length;

  return (
    <>
      <Seo 
        title="Vote for the Best! | SketchyAF"
        description="Time to vote! Which drawing made you laugh the most?"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-cream via-accent/20 to-primary/20 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b-2 border-dark p-4 relative z-20">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            {/* Timer */}
            <motion.div
              key={timeRemaining || 0}
              initial={{ scale: (timeRemaining !== null && timeRemaining <= 10) ? 1.1 : 1 }}
              animate={{ scale: 1 }}
              className={`flex items-center px-3 py-2 rounded-full border-2 border-dark ${
                (timeRemaining !== null && timeRemaining <= 10)
                  ? 'bg-red text-white animate-pulse'
                  : 'bg-secondary text-dark'
              }`}
            >
              <Clock size={18} className="mr-2" />
              <span className="font-heading font-bold text-lg">
                {formattedTime}
              </span>
            </motion.div>

            {/* Prompt */}
            <div className="flex-1 text-center px-4">
              <h1 className="font-heading font-bold text-xl md:text-2xl text-dark transform rotate-[-1deg]">
                Vote: "{currentGame?.prompt || 'Loading prompt...'}"
              </h1>
            </div>

            {/* Player Status */}
            <div className="flex items-center">
              <Users size={18} className="text-green mr-2" />
              <span className="font-heading font-semibold text-green">
                {votedPlayersCount}/{participants.length}
              </span>
            </div>
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
        <div className="flex-1 p-4">
          <div className="max-w-6xl mx-auto">
            
            {/* Voting Phase */}
            {votingPhase === 'voting' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Instructions */}
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] inline-block max-w-2xl"
                  >
                    <div className="flex items-center justify-center mb-3">
                      <Vote size={24} className="text-primary mr-2" />
                      <p className="font-heading font-bold text-xl text-dark">
                        Time to Vote!
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <div className="bg-primary/10 p-4 rounded-lg border border-primary/30">
                        <div className="flex items-center justify-center mb-2">
                          <Check size={16} className="text-primary mr-2" />
                          <span className="font-heading font-semibold text-primary">How to Vote</span>
                        </div>
                        <p className="text-sm text-dark">
                          Tap a drawing card to select it, then tap the "Vote" button that appears. You get one vote only!
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-light-gray">
                      <p className="text-sm text-medium-gray flex items-center justify-center">
                        <ZoomIn size={14} className="mr-1" />
                        Tap any drawing to zoom in for a closer look
                      </p>
                    </div>
                  </motion.div>
                </div>

                {/* Submissions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {votableSubmissions.map((submission, index) => {
                    // Find participant info for this submission
                    const participant = participants.find((p: any) => p.user_id === submission.user_id);
                    
                    return (
                      <motion.div
                        key={submission.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        className={`bg-white rounded-lg border-2 border-dark p-4 hand-drawn shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] transition-all cursor-pointer ${
                          selectedSubmission === submission.id
                            ? 'ring-4 ring-primary transform scale-105'
                            : 'hover:transform hover:scale-102'
                        }`}
                        onClick={() => setSelectedSubmission(submission.id)}
                      >
                        {/* Artist Info */}
                        <div className="flex items-center mb-3">
                          <img
                            src={(participant as any)?.users?.avatar_url || `https://ui-avatars.com/api/?name=${(participant as any)?.users?.username || 'User'}&background=random`}
                            alt={(participant as any)?.users?.username || 'User'}
                            className="w-8 h-8 rounded-full border-2 border-dark mr-3"
                          />
                          <div className="flex-1">
                            <p className="font-heading font-semibold text-dark">
                              {(participant as any)?.users?.username || 'Anonymous'}
                            </p>
                            {participant?.is_ready && (
                              <div className="flex items-center text-xs text-green">
                                <Check size={12} className="mr-1" />
                                Ready
                              </div>
                            )}
                          </div>
                          {selectedSubmission === submission.id && (
                            <div className="bg-primary text-white rounded-full p-1">
                              <Check size={16} />
                            </div>
                          )}
                        </div>

                        {/* Drawing */}
                        <div 
                          className="relative mb-4 cursor-pointer group"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleZoomImage(submission.id);
                          }}
                        >
                          <img
                            src={submission.drawing_url || 'https://via.placeholder.com/400x300?text=Loading+Drawing'}
                            alt={`Drawing by ${(participant as any)?.users?.username || 'Anonymous'}`}
                            className="w-full h-48 object-cover rounded-lg border border-light-gray"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-lg flex items-center justify-center">
                            <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
                          </div>
                        </div>

                        {/* Vote Button - Only show when this submission is selected */}
                        {selectedSubmission === submission.id && !hasVoted && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center"
                          >
                            <Button
                              variant="primary"
                              size="md"
                              onClick={() => handleVote()}
                              className="w-full animate-pulse"
                              disabled={isLoading}
                            >
                              <Vote size={18} className="mr-2" />
                              {isLoading ? 'Voting...' : 'Vote for this drawing!'}
                            </Button>
                          </motion.div>
                        )}

                        {/* Selection prompt when not selected */}
                        {selectedSubmission !== submission.id && !hasVoted && (
                          <div className="text-center">
                            <div className="bg-off-white border border-light-gray rounded-lg p-3">
                              <p className="text-sm text-medium-gray font-heading">
                                Tap to select this drawing
                              </p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Bottom instruction */}
                {selectedSubmission && !hasVoted && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <div className="bg-primary/10 border border-primary rounded-lg p-4 max-w-md mx-auto">
                      <p className="text-primary font-heading font-semibold">
                        You've selected a drawing
                      </p>
                      <p className="text-sm text-dark mt-1">
                        Tap the "Vote" button on the card to cast your vote!
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Waiting Phase */}
            {votingPhase === 'waiting' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="bg-white rounded-lg border-2 border-dark p-8 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] max-w-md mx-auto">
                  <motion.div
                    animate={{ 
                      rotate: 360,
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                      scale: { duration: 1.5, repeat: Infinity }
                    }}
                    className="text-6xl mb-4"
                  >
                    🗳️
                  </motion.div>
                  
                  <h2 className="font-heading font-bold text-2xl text-dark mb-3 transform rotate-[-1deg]">
                    Vote Cast!
                  </h2>
                  <p className="text-medium-gray mb-4">
                    Waiting for other players to finish voting...
                  </p>
                  
                  <div className="bg-secondary/10 p-3 rounded-lg border border-secondary/30">
                    <p className="text-sm text-dark">
                      {votedPlayersCount}/{participants.length} players have voted
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Revealing Phase */}
            {votingPhase === 'revealing' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="bg-white rounded-lg border-2 border-dark p-8 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] max-w-md mx-auto mb-6">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.3, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{ 
                      duration: 1,
                      repeat: Infinity
                    }}
                    className="text-6xl mb-4"
                  >
                    📊
                  </motion.div>
                  
                  <h2 className="font-heading font-bold text-2xl text-dark mb-3 transform rotate-[-1deg]">
                    All Votes Are In!
                  </h2>
                  <p className="text-medium-gray">
                    Calculating results...
                  </p>
                </div>

                {/* Vote Breakdown (when revealed) */}
                {showVoteBreakdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] max-w-2xl mx-auto"
                  >
                    <h3 className="font-heading font-bold text-xl text-dark mb-4 flex items-center justify-center">
                      <Star size={20} className="mr-2 text-accent" />
                      Vote Breakdown
                    </h3>
                    
                    <div className="space-y-3">
                      {votableSubmissions.map((submission, index) => {
                        // Find participant info for this submission
                        const participant = participants.find((p: any) => p.user_id === submission.user_id);
                        
                        return (
                          <motion.div
                            key={submission.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.2 }}
                            className="flex items-center p-3 bg-off-white rounded-lg border border-light-gray"
                          >
                            <img 
                              src={participant?.avatar_url || `https://ui-avatars.com/api/?name=${participant?.username || 'User'}&background=random`} 
                              alt={participant?.username || 'User'}
                              className="w-10 h-10 rounded-full border-2 border-dark mr-3"
                            />
                            <div className="flex-1">
                              <p className="font-heading font-semibold">{participant?.username || 'Anonymous'}</p>
                              <div className="w-full bg-light-gray rounded-full h-2 mt-1">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(submission.vote_count / participants.length) * 100}%` }}
                                  transition={{ delay: index * 0.2 + 0.5, duration: 0.8 }}
                                  className="bg-primary h-2 rounded-full"
                                />
                              </div>
                            </div>
                            <span className="font-heading font-bold text-lg ml-3">
                              {submission.vote_count}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="mt-6 text-center">
                      <Button 
                        variant="primary" 
                        size="lg" 
                        onClick={() => {
                          // Navigation is handled automatically by server-side transitions
                          // This button is just for display, the server will transition automatically
                          console.log('Results will be shown automatically when server transitions the game');
                        }}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Loading...' : 'View Results'}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Zoomed Image Modal */}
        <AnimatePresence>
          {showZoomedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={closeZoomedImage}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative max-w-3xl max-h-[80vh] w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={closeZoomedImage}
                  className="absolute -top-4 -right-4 bg-white text-dark rounded-full p-2 border-2 border-dark shadow-lg z-10"
                >
                  <X size={20} />
                </button>
                
                {submissions.find(s => s.id === showZoomedImage)?.drawing_url ? (
                  <img 
                    src={submissions.find(s => s.id === showZoomedImage)?.drawing_url}
                    alt="Zoomed drawing"
                    className="w-full h-full object-contain rounded-lg border-2 border-white"
                  />
                ) : (
                  <div className="w-full h-64 bg-white rounded-lg border-2 border-white flex items-center justify-center">
                    <p className="text-medium-gray">Image not available</p>
                  </div>
                )}
                
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-dark">
                  <p className="font-heading font-semibold text-dark">
                    By {participants.find((p: any) => p.user_id === submissions.find(s => s.id === showZoomedImage)?.user_id)?.users?.username || 'Anonymous'}
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

export default VotingScreen;