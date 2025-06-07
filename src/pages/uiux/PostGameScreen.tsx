import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Seo from '../../components/utils/Seo';

// Mock data for demo purposes
const PLAYER_STATS = {
  username: 'You',
  avatar: 'https://randomuser.me/api/portraits/women/63.jpg',
  currentRank: 847,
  previousRank: 923,
  totalGames: 127,
  totalWins: 23,
  winRate: 18.1,
  favoriteCategory: 'Animals',
  level: 12,
  xpToNextLevel: 150,
  currentXP: 1850,
  nextLevelXP: 2000
};

const RECENT_DRAWING = {
  prompt: "A raccoon having an existential crisis",
  drawingUrl: 'https://images.pexels.com/photos/1266302/pexels-photo-1266302.jpeg?auto=compress&cs=tinysrgb&w=600',
  votes: 2,
  placement: 3,
  gameDate: new Date().toISOString()
};

const ACHIEVEMENT_PROGRESS = [
  {
    id: 'games-played',
    name: 'Sketch Addict',
    description: 'Play 150 games',
    progress: 127,
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
    progress: 73,
    maxProgress: 100,
    icon: '❤️',
    category: 'Social'
  }
];

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

const FRIENDS_ONLINE = [
  { username: 'SketchBuddy', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', status: 'In Game' },
  { username: 'DoodlePal', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', status: 'In Lobby' },
  { username: 'ArtFriend', avatar: 'https://randomuser.me/api/portraits/men/15.jpg', status: 'Online' }
];

const PostGameScreen: React.FC = () => {
  const [showFullStats, setShowFullStats] = useState(false);
  const [selectedBoosterPack, setSelectedBoosterPack] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  const rankImprovement = PLAYER_STATS.previousRank - PLAYER_STATS.currentRank;
  const levelProgress = ((PLAYER_STATS.currentXP - (PLAYER_STATS.nextLevelXP - PLAYER_STATS.xpToNextLevel)) / PLAYER_STATS.xpToNextLevel) * 100;

  const handleQueueAgain = () => {
    console.log('Queue for another game');
    // In real app, this would navigate back to lobby
  };

  const handleViewProfile = () => {
    console.log('View public profile');
    // In real app, this would navigate to profile
  };

  const handleDownloadDrawing = () => {
    console.log('Download drawing');
    // In real app, this would download the drawing
    alert('Drawing downloaded! (Demo)');
  };

  const handleShareDrawing = () => {
    console.log('Share drawing');
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 3000);
    
    if (navigator.share) {
      navigator.share({
        title: 'Check out my SketchyAF drawing!',
        text: `I drew "${RECENT_DRAWING.prompt}" - see how sketchy it turned out!`,
        url: window.location.origin,
      });
    } else {
      // Fallback
      navigator.clipboard.writeText(window.location.origin);
    }
  };

  const handleBoosterPackClick = (packId: string) => {
    setSelectedBoosterPack(packId);
    console.log('Booster pack clicked:', packId);
    // In real app, this would navigate to purchase flow
  };

  const handleInviteFriend = (friend: typeof FRIENDS_ONLINE[0]) => {
    console.log('Invite friend:', friend.username);
    // In real app, this would send invitation
  };

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
                        #{PLAYER_STATS.currentRank}
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
                      <p className="font-heading font-bold text-lg">{PLAYER_STATS.totalGames}</p>
                      <p className="text-medium-gray">Games</p>
                    </div>
                    <div className="text-center">
                      <p className="font-heading font-bold text-lg">{PLAYER_STATS.totalWins}</p>
                      <p className="text-medium-gray">Wins</p>
                    </div>
                    <div className="text-center">
                      <p className="font-heading font-bold text-lg">{PLAYER_STATS.winRate}%</p>
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
                        Level {PLAYER_STATS.level}
                      </span>
                      <span className="text-sm text-medium-gray">
                        {PLAYER_STATS.xpToNextLevel} XP to go
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
                      <span>{PLAYER_STATS.currentXP} XP</span>
                      <span>{PLAYER_STATS.nextLevelXP} XP</span>
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

            {/* Recent Drawing Showcase */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
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
                      src={RECENT_DRAWING.drawingUrl} 
                      alt="Your recent drawing"
                      className="w-full h-48 object-cover rounded-lg border-2 border-secondary"
                    />
                    <div className="absolute bottom-2 right-2 bg-white rounded-full px-3 py-1 border border-dark text-sm flex items-center">
                      <Heart size={14} className="text-red mr-1 fill-red" />
                      <span className="font-heading font-semibold">{RECENT_DRAWING.votes}</span>
                    </div>
                  </div>
                  
                  <p className="font-heading font-bold text-lg text-dark mb-2">
                    "{RECENT_DRAWING.prompt}"
                  </p>
                  <p className="text-medium-gray text-sm">
                    Finished {new Date(RECENT_DRAWING.gameDate).toLocaleDateString()} • {RECENT_DRAWING.placement === 1 ? '🥇' : RECENT_DRAWING.placement === 2 ? '🥈' : RECENT_DRAWING.placement === 3 ? '🥉' : `#${RECENT_DRAWING.placement}`} Place
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
                    >
                      <Download size={18} className="mr-2" />
                      Download Drawing
                    </Button>
                    
                    <Button 
                      variant="secondary" 
                      size="md" 
                      onClick={handleShareDrawing}
                      className="w-full"
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
                      💡 Share your drawings to earn bonus XP on your next round and climb the leaderboard faster!
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Play Again */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={handleQueueAgain}
                  className="w-full h-full min-h-[120px] flex flex-col items-center justify-center text-center"
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

            {/* Friends Online */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1 }}
              className="bg-white rounded-lg border-2 border-dark p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center mb-4">
                <Users size={24} className="text-green mr-2" />
                <h2 className="font-heading font-bold text-xl text-dark">Friends Online</h2>
                <div className="ml-2 bg-green text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {FRIENDS_ONLINE.length}
                </div>
              </div>

              <div className="space-y-3">
                {FRIENDS_ONLINE.map((friend, index) => (
                  <motion.div
                    key={friend.username}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.1 + index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-off-white rounded-lg border border-light-gray"
                  >
                    <div className="flex items-center">
                      <div className="relative">
                        <img 
                          src={friend.avatar} 
                          alt={friend.username}
                          className="w-10 h-10 rounded-full border-2 border-green"
                        />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green rounded-full border border-white" />
                      </div>
                      <div className="ml-3">
                        <p className="font-heading font-semibold text-dark">{friend.username}</p>
                        <p className="text-xs text-green">{friend.status}</p>
                      </div>
                    </div>
                    
                    <Button 
                      variant="tertiary" 
                      size="sm"
                      onClick={() => handleInviteFriend(friend)}
                    >
                      Invite
                    </Button>
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 text-center">
                <Button variant="tertiary" size="sm">
                  Find More Friends
                  <Users size={16} className="ml-2" />
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
                    <p className="font-heading font-bold">{PLAYER_STATS.favoriteCategory}</p>
                  </div>
                  <div className="bg-off-white p-3 rounded-lg">
                    <p className="text-medium-gray">Best Rank</p>
                    <p className="font-heading font-bold">#423</p>
                  </div>
                  <div className="bg-off-white p-3 rounded-lg">
                    <p className="text-medium-gray">Total Votes</p>
                    <p className="font-heading font-bold">847</p>
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