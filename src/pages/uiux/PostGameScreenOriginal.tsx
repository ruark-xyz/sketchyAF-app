import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Download, 
  Share2, 
  User, 
  Play, 
  Package, 
  Trophy, 
  Star, 
  Zap, 
  Crown,
  Medal,
  Target,
  Gift,
  ArrowRight,
  Eye,
  Heart,
  Users,
  Calendar,
  ChevronRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Seo from '../../components/utils/Seo';
import { useGame } from '../../context/GameContext';
import { useUnifiedGameState } from '../../hooks/useUnifiedGameState';
import { useAuth } from '../../context/AuthContext';
import { ROUTE_LOBBY } from '../../constants/routes';

// Achievement data (would come from backend in production)
const ACHIEVEMENT_PROGRESS = [
  {
    id: 'games-played',
    name: 'Sketch Addict',
    description: 'Play 150 games',
    progress: 1,
    maxProgress: 150,
    icon: '🎮',
    category: 'Participation'
  },
  {
    id: 'win-streak',
    name: 'Hot Streak',
    description: 'Win 3 games in a row',
    progress: 1,
    maxProgress: 3,
    icon: '🔥',
    category: 'Performance'
  },
  {
    id: 'vote-getter',
    name: 'Vote Magnet',
    description: 'Get 100 total votes',
    progress: 1,
    maxProgress: 100,
    icon: '❤️',
    category: 'Social'
  }
];

// Featured booster packs (would come from backend in production)
const FEATURED_BOOSTER_PACKS = [
  {
    id: 'weekly-special',
    name: 'Weekly Special',
    description: '50% off premium packs',
    originalPrice: '$4.99',
    salePrice: '$2.49',
    icon: '⚡',
    isLimitedTime: true,
    timeLeft: '2 days'
  },
  {
    id: 'trending-pack',
    name: 'Trending Memes',
    description: 'Latest viral content',
    price: '$3.99',
    icon: '📈',
    isNew: true
  },
  {
    id: 'free-pack',
    name: 'Daily Free Pack',
    description: 'Claim your daily reward',
    price: 'FREE',
    icon: '🎁',
    isFree: true
  }
];

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

  const [showFullStats, setShowFullStats] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [userSubmission, setUserSubmission] = useState<any>(null);
  const [userStats, setUserStats] = useState({
    totalGames: 1,
    totalWins: 0,
    winRate: 0,
    currentRank: 0,
    previousRank: 0,
    level: 1,
    currentXP: 0,
    nextLevelXP: 100,
    xpToNextLevel: 100
  });

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
        
        // Update user stats
        setUserStats(prev => ({
          ...prev,
          totalWins: placement === 1 ? prev.totalWins + 1 : prev.totalWins,
          winRate: Math.round((placement === 1 ? prev.totalWins + 1 : prev.totalWins) / (prev.totalGames) * 100),
          currentRank: 847 - (placement === 1 ? 50 : placement === 2 ? 30 : placement === 3 ? 15 : 5),
          previousRank: 847,
          currentXP: prev.currentXP + (placement === 1 ? 100 : placement === 2 ? 75 : placement === 3 ? 50 : 25),
        }));
      }
    }
  }, [submissions, votes, currentUser]);

  // Navigation is now handled by useUnifiedGameState in SimpleGameRoute

  const handleQueueAgain = () => {
    // Reset game state
    actions.resetGameState();
    
    // Navigate to lobby
    navigate(ROUTE_LOBBY);
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

  const handleBoosterPackClick = (packId: string) => {
    // In a real app, this would navigate to purchase flow
    console.log('Selected booster pack:', packId);
  };

  // Calculate level progress
  const levelProgress = ((userStats.currentXP - (userStats.nextLevelXP - userStats.xpToNextLevel)) / userStats.xpToNextLevel) * 100;
  
  // Calculate rank improvement
  const rankImprovement = userStats.previousRank - userStats.currentRank;

  return (
    <>
      <Seo 
        title="Game Complete! | SketchyAF"
        description="Your sketchy adventure continues! Check your progress and jump into another round."
      />
      
      <div className="min-h-screen bg-gradient-to-br from-cream via-green/20 to-secondary/20">
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
            
            {/* Player Level & Rank Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Rank Progress */}
                <div>
                  <div className="flex items-center mb-4">
                    <TrendingUp size={24} className="text-primary mr-2" />
                    <h2 className="font-heading font-bold text-xl text-dark">Leaderboard Progress</h2>
                  </div>
                  
                  <div className="bg-primary/10 p-4 rounded-lg border border-primary/30 mb-4">
                    <div className="text-center">
                      <motion.p 
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="font-heading font-bold text-3xl text-primary"
                      >
                        #{userStats.currentRank}
                      </motion.p>
                      <p className="text-medium-gray">Global Rank</p>
                      
                      {rankImprovement > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="flex items-center justify-center mt-2 text-green"
                        >
                          <TrendingUp size={16} className="mr-1" />
                          <span className="text-sm font-heading font-semibold">
                            +{rankImprovement} spots!
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="text-center">
                      <p className="font-heading font-bold text-lg">{userStats.totalGames}</p>
                      <p className="text-medium-gray">Games</p>
                    </div>
                    <div className="text-center">
                      <p className="font-heading font-bold text-lg">{userStats.totalWins}</p>
                      <p className="text-medium-gray">Wins</p>
                    </div>
                    <div className="text-center">
                      <p className="font-heading font-bold text-lg">{userStats.winRate}%</p>
                      <p className="text-medium-gray">Win Rate</p>
                    </div>
                  </div>
                </div>

                {/* Level Progress */}
                <div>
                  <div className="flex items-center mb-4">
                    <Star size={24} className="text-accent mr-2" />
                    <h2 className="font-heading font-bold text-xl text-dark">Level Progress</h2>
                  </div>
                  
                  <div className="bg-accent/10 p-4 rounded-lg border border-accent/30 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-heading font-bold text-2xl text-accent">
                        Level {userStats.level}
                      </span>
                      <span className="text-sm text-medium-gray">
                        {userStats.xpToNextLevel} XP to go
                      </span>
                    </div>
                    
                    <div className="w-full bg-light-gray rounded-full h-3">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${levelProgress}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="bg-accent h-3 rounded-full"
                      />
                    </div>
                    
                    <div className="flex justify-between text-xs text-medium-gray mt-1">
                      <span>{userStats.currentXP} XP</span>
                      <span>{userStats.nextLevelXP} XP</span>
                    </div>
                  </div>

                  <Button 
                    variant="tertiary" 
                    size="sm" 
                    onClick={() => setShowFullStats(!showFullStats)}
                  >
                    {showFullStats ? 'Hide' : 'View'} Detailed Stats
                  </Button>
                </div>
              </div>
            </motion.div>

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

            {/* Achievement Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Sparkles size={24} className="text-purple mr-2" />
                  <h2 className="font-heading font-bold text-xl text-dark">Achievement Progress</h2>
                </div>
                <Button variant="tertiary" size="sm">
                  View All
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ACHIEVEMENT_PROGRESS.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="bg-off-white p-4 rounded-lg border border-light-gray"
                  >
                    <div className="flex items-center mb-3">
                      <span className="text-2xl mr-3">{achievement.icon}</span>
                      <div>
                        <p className="font-heading font-semibold text-dark">{achievement.name}</p>
                        <p className="text-xs text-medium-gray">{achievement.category}</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-medium-gray mb-3">{achievement.description}</p>
                    
                    <div className="w-full bg-light-gray rounded-full h-2 mb-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                        transition={{ duration: 1, delay: 0.8 + index * 0.1 }}
                        className="bg-purple h-2 rounded-full"
                      />
                    </div>
                    
                    <div className="flex justify-between text-xs text-medium-gray">
                      <span>{achievement.progress}/{achievement.maxProgress}</span>
                      <span>{Math.round((achievement.progress / achievement.maxProgress) * 100)}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Booster Pack Promotions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Package size={24} className="text-orange mr-2" />
                  <h2 className="font-heading font-bold text-xl text-dark">Booster Pack Store</h2>
                </div>
                <div className="bg-red text-white px-2 py-1 rounded-full text-xs font-heading font-bold">
                  Limited Time!
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {FEATURED_BOOSTER_PACKS.map((pack, index) => (
                  <motion.button
                    key={pack.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleBoosterPackClick(pack.id)}
                    className="bg-off-white p-4 rounded-lg border-2 border-light-gray hover:border-orange transition-all text-left relative"
                  >
                    {pack.isLimitedTime && (
                      <div className="absolute -top-2 -right-2 bg-red text-white px-2 py-1 rounded-full text-xs font-heading font-bold">
                        {pack.timeLeft}
                      </div>
                    )}
                    
                    {pack.isNew && (
                      <div className="absolute -top-2 -right-2 bg-green text-white px-2 py-1 rounded-full text-xs font-heading font-bold">
                        NEW
                      </div>
                    )}

                    <div className="flex items-center mb-3">
                      <span className="text-3xl mr-3">{pack.icon}</span>
                      <div>
                        <p className="font-heading font-bold text-dark">{pack.name}</p>
                        <p className="text-xs text-medium-gray">{pack.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        {pack.originalPrice && (
                          <span className="text-xs text-medium-gray line-through mr-2">
                            {pack.originalPrice}
                          </span>
                        )}
                        <span className={`font-heading font-bold ${
                          pack.isFree ? 'text-green' : 'text-primary'
                        }`}>
                          {pack.salePrice || pack.price}
                        </span>
                      </div>
                      <ArrowRight size={16} className="text-medium-gray" />
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="mt-4 text-center">
                <Button variant="secondary" size="sm">
                  View All Packs
                  <Package size={16} className="ml-2" />
                </Button>
              </div>
            </motion.div>

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

        {/* Detailed Stats Modal */}
        <AnimatePresence>
          {showFullStats && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowFullStats(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className="bg-white rounded-lg border-2 border-dark p-6 max-w-lg w-full hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-heading font-bold text-xl text-dark mb-4">Detailed Stats</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-off-white p-3 rounded-lg">
                    <p className="text-medium-gray">Favorite Category</p>
                    <p className="font-heading font-bold">Animals</p>
                  </div>
                  <div className="bg-off-white p-3 rounded-lg">
                    <p className="text-medium-gray">Best Rank</p>
                    <p className="font-heading font-bold">#423</p>
                  </div>
                  <div className="bg-off-white p-3 rounded-lg">
                    <p className="text-medium-gray">Total Votes</p>
                    <p className="font-heading font-bold">1</p>
                  </div>
                  <div className="bg-off-white p-3 rounded-lg">
                    <p className="text-medium-gray">Avg. Placement</p>
                    <p className="font-heading font-bold">2.3</p>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => setShowFullStats(false)}
                  >
                    Close
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default PostGameScreen;