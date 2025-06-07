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
  Zap
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Seo from '../../components/utils/Seo';

// Mock data for demo purposes
const GAME_PROMPT = "A raccoon having an existential crisis";

const RESULTS_DATA = {
  winner: {
    id: 1,
    username: 'SketchLord',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    drawingUrl: 'https://images.pexels.com/photos/1092364/pexels-photo-1092364.jpeg?auto=compress&cs=tinysrgb&w=600',
    votes: 3,
    percentage: 75
  },
  runnerUps: [
    {
      id: 2,
      username: 'ArtisticTroll',
      avatar: 'https://randomuser.me/api/portraits/men/15.jpg',
      drawingUrl: 'https://images.pexels.com/photos/1616403/pexels-photo-1616403.jpeg?auto=compress&cs=tinysrgb&w=600',
      votes: 1,
      percentage: 25,
      placement: 2
    },
    {
      id: 3,
      username: 'DoodleQueen',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      drawingUrl: 'https://images.pexels.com/photos/1887946/pexels-photo-1887946.jpeg?auto=compress&cs=tinysrgb&w=600',
      votes: 0,
      percentage: 0,
      placement: 3
    }
  ],
  currentPlayer: {
    id: 4,
    username: 'You',
    placement: 3,
    votes: 0,
    earnedXP: 50,
    earnedCoins: 25
  }
};

const ACHIEVEMENT_UNLOCKS = [
  {
    id: 'first-vote',
    name: 'Getting Noticed',
    description: 'Received your first vote!',
    icon: '👀',
    isNew: false
  },
  {
    id: 'participation',
    name: 'Artistic Participant',
    description: 'Completed your 5th game',
    icon: '🎨',
    isNew: true
  }
];

const CONFETTI_PIECES = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  emoji: ['🎉', '🎊', '✨', '🌟', '🎈'][Math.floor(Math.random() * 5)],
  delay: Math.random() * 3,
  duration: Math.random() * 2 + 3,
  x: Math.random() * 100,
  rotation: Math.random() * 360
}));

const ResultsScreen: React.FC = () => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [showAchievements, setShowAchievements] = useState(false);
  const [currentPlayerRank, setCurrentPlayerRank] = useState<string>('');

  useEffect(() => {
    // Determine player's placement text
    const placement = RESULTS_DATA.currentPlayer.placement;
    const suffix = placement === 1 ? 'st' : placement === 2 ? 'nd' : placement === 3 ? 'rd' : 'th';
    setCurrentPlayerRank(`${placement}${suffix}`);

    // Show achievements after a delay
    setTimeout(() => {
      setShowAchievements(true);
    }, 3000);

    // Hide confetti after animation
    setTimeout(() => {
      setShowConfetti(false);
    }, 8000);
  }, []);

  const handlePlayAgain = () => {
    console.log('Queue for another game');
    // In real app, this would navigate back to lobby
  };

  const handleViewProfile = () => {
    console.log('View player profile');
    // In real app, this would navigate to profile
  };

  const handleShare = () => {
    console.log('Share results');
    // In real app, this would open share dialog
  };

  const isCurrentPlayerWinner = RESULTS_DATA.currentPlayer.placement === 1;

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
              🏆 Results: "{GAME_PROMPT}"
            </motion.h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 pb-8">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Winner Spotlight */}
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
                      src={RESULTS_DATA.winner.avatar} 
                      alt={RESULTS_DATA.winner.username}
                      className="w-20 h-20 rounded-full border-4 border-accent mb-3"
                      whileHover={{ scale: 1.1 }}
                    />
                    <h3 className="font-heading font-bold text-xl text-primary">
                      {RESULTS_DATA.winner.username}
                    </h3>
                    <div className="flex items-center mt-1">
                      <Heart size={16} className="text-red mr-1 fill-red" />
                      <span className="font-heading font-semibold">
                        {RESULTS_DATA.winner.votes} votes ({RESULTS_DATA.winner.percentage}%)
                      </span>
                    </div>
                  </div>

                  <div className="relative mb-4">
                    <img 
                      src={RESULTS_DATA.winner.drawingUrl} 
                      alt="Winning drawing"
                      className="w-full max-w-md mx-auto h-48 object-cover rounded-lg border-2 border-accent"
                    />
                    <div className="absolute -top-2 -left-2 bg-accent text-dark px-3 py-1 rounded-full text-sm font-heading font-bold border-2 border-dark transform -rotate-12">
                      Winner!
                    </div>
                  </div>

                  {RESULTS_DATA.winner.percentage >= 50 && (
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

            {/* Podium Display */}
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
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.7 }}
                  className="bg-accent/20 p-4 rounded-lg border-2 border-accent text-center order-2 md:order-1"
                >
                  <div className="relative">
                    <div className="text-3xl mb-2">🥇</div>
                    <img 
                      src={RESULTS_DATA.winner.avatar} 
                      alt={RESULTS_DATA.winner.username}
                      className="w-12 h-12 rounded-full border-2 border-accent mx-auto mb-2"
                    />
                    <p className="font-heading font-bold text-sm">{RESULTS_DATA.winner.username}</p>
                    <p className="text-xs text-medium-gray">{RESULTS_DATA.winner.votes} votes</p>
                  </div>
                </motion.div>

                {/* Runner-ups */}
                {RESULTS_DATA.runnerUps.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.8 + index * 0.1 }}
                    className={`bg-off-white p-4 rounded-lg border-2 border-light-gray text-center ${
                      index === 0 ? 'order-1 md:order-2' : 'order-3'
                    }`}
                  >
                    <div className="text-2xl mb-2">
                      {player.placement === 2 ? '🥈' : '🥉'}
                    </div>
                    <img 
                      src={player.avatar} 
                      alt={player.username}
                      className="w-12 h-12 rounded-full border-2 border-light-gray mx-auto mb-2"
                    />
                    <p className="font-heading font-bold text-sm">{player.username}</p>
                    <p className="text-xs text-medium-gray">{player.votes} votes</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

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
                      You came {currentPlayerRank}!
                    </h3>
                    <p className="text-medium-gray mb-4">
                      {RESULTS_DATA.currentPlayer.placement <= 2 
                        ? "Great job! You're getting better at this sketchy business." 
                        : "Keep practicing those artistic skills! Every sketch counts."}
                    </p>
                  </div>
                )}

                {/* Rewards */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-secondary/10 p-3 rounded-lg border border-secondary/30">
                    <div className="flex items-center justify-center mb-1">
                      <Zap size={16} className="text-secondary mr-1" />
                      <span className="text-xs text-medium-gray">XP Gained</span>
                    </div>
                    <p className="font-heading font-bold text-lg text-secondary">
                      +{RESULTS_DATA.currentPlayer.earnedXP}
                    </p>
                  </div>

                  <div className="bg-accent/10 p-3 rounded-lg border border-accent/30">
                    <div className="flex items-center justify-center mb-1">
                      <Star size={16} className="text-accent mr-1" />
                      <span className="text-xs text-medium-gray">Coins</span>
                    </div>
                    <p className="font-heading font-bold text-lg text-accent">
                      +{RESULTS_DATA.currentPlayer.earnedCoins}
                    </p>
                  </div>
                </div>

                {isCurrentPlayerWinner && (
                  <div className="bg-primary/10 p-3 rounded-lg border border-primary/30 mb-4">
                    <div className="flex items-center justify-center">
                      <Trophy size={18} className="text-primary mr-2" />
                      <span className="font-heading font-semibold text-primary">
                        Winner Bonus: +50 XP, +25 Coins!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Achievement Unlocks */}
            <AnimatePresence>
              {showAchievements && ACHIEVEMENT_UNLOCKS.some(a => a.isNew) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="bg-green/10 rounded-lg border-2 border-green p-6 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.6, repeat: 3 }}
                      className="text-4xl mb-3"
                    >
                      🏆
                    </motion.div>
                    
                    <h3 className="font-heading font-bold text-xl text-dark mb-4">
                      Achievement Unlocked!
                    </h3>

                    <div className="space-y-3">
                      {ACHIEVEMENT_UNLOCKS.filter(a => a.isNew).map(achievement => (
                        <motion.div
                          key={achievement.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-white p-4 rounded-lg border border-green flex items-center"
                        >
                          <span className="text-2xl mr-3">{achievement.icon}</span>
                          <div className="text-left">
                            <p className="font-heading font-bold text-dark">{achievement.name}</p>
                            <p className="text-sm text-medium-gray">{achievement.description}</p>
                          </div>
                          <div className="ml-auto bg-green text-white rounded-full p-1">
                            <Sparkles size={16} />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5, duration: 0.6 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <Button 
                variant="primary" 
                size="lg" 
                onClick={handlePlayAgain}
                className="w-full"
              >
                <Play size={20} className="mr-2" />
                Play Again
              </Button>

              <Button 
                variant="secondary" 
                size="lg" 
                onClick={handleViewProfile}
                className="w-full"
              >
                <User size={20} className="mr-2" />
                View Profile
              </Button>

              <Button 
                variant="tertiary" 
                size="lg" 
                onClick={handleShare}
                className="w-full"
              >
                <Share2 size={20} className="mr-2" />
                Share Results
              </Button>
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
                
                {/* Mock voting details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-off-white p-3 rounded-lg border border-light-gray">
                    <span className="font-heading font-semibold">DoodleQueen</span> voted for <span className="text-primary font-semibold">SketchLord</span>
                  </div>
                  <div className="bg-off-white p-3 rounded-lg border border-light-gray">
                    <span className="font-heading font-semibold">ArtisticTroll</span> voted for <span className="text-primary font-semibold">SketchLord</span>
                  </div>
                  <div className="bg-off-white p-3 rounded-lg border border-light-gray">
                    <span className="font-heading font-semibold">You</span> voted for <span className="text-primary font-semibold">SketchLord</span>
                  </div>
                  <div className="bg-off-white p-3 rounded-lg border border-light-gray">
                    <span className="font-heading font-semibold">SketchLord</span> voted for <span className="text-secondary font-semibold">ArtisticTroll</span>
                  </div>
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