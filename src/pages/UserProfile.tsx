import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Award, 
  Trophy, 
  Heart, 
  Users, 
  Star, 
  Calendar, 
  Zap, 
  Sparkles,
  TrendingUp,
  Share2,
  Shield
} from 'lucide-react';
import Seo from '../components/utils/Seo';
import Button from '../components/ui/Button';
import UserSubmissionCard from '../components/ui/UserSubmissionCard';
import AchievementCard from '../components/ui/AchievementCard';
import StatCard from '../components/ui/StatCard';
import BoosterPackUsageCard from '../components/ui/BoosterPackUsageCard';
import { 
  publicProfileData, 
  userGameStats, 
  userSubmissions, 
  userAchievements,
  boosterPackUsage,
  favoriteStencils
} from '../data/mockData';

const UserProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'popular' | 'winning'>('recent');
  
  // In a real app, we would fetch the user data based on the username
  // For this mockup, we'll use our static data
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Calculate win rate
  const winRate = userGameStats.gamesWon / userGameStats.gamesPlayed * 100;
  
  // Filter submissions based on active tab
  const filteredSubmissions = (() => {
    switch (activeTab) {
      case 'popular':
        return [...userSubmissions].sort((a, b) => b.votes - a.votes);
      case 'winning':
        return userSubmissions.filter(submission => submission.isWinner);
      case 'recent':
      default:
        return [...userSubmissions].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }
  })();
  
  // Get earned and in-progress achievements
  const earnedAchievements = userAchievements.filter(achievement => achievement.earned);
  const inProgressAchievements = userAchievements.filter(achievement => !achievement.earned);
  
  return (
    <>
      <Seo 
        title={`${publicProfileData.displayName} (@${publicProfileData.username})`}
        description={`Check out ${publicProfileData.displayName}'s profile on SketchyAF. View their drawings, stats, and achievements.`}
      />
      
      <div className="py-16 md:py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Basic Information Section */}
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg border-2 border-dark hand-drawn mb-8">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar and Basic Info */}
                <div className="md:w-1/3 flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <img 
                      src={publicProfileData.avatar} 
                      alt={publicProfileData.displayName} 
                      className="w-32 h-32 rounded-full object-cover border-4 border-primary"
                    />
                    {publicProfileData.isPremium && (
                      <div className="absolute -top-2 -right-2 bg-primary text-white p-1 rounded-full">
                        <Star size={16} fill="white" />
                      </div>
                    )}
                  </div>
                  
                  <h1 className="font-heading font-bold text-2xl text-dark mb-1">
                    {publicProfileData.displayName}
                  </h1>
                  <p className="text-primary font-heading mb-3">@{publicProfileData.username}</p>
                  
                  {publicProfileData.bio && (
                    <p className="text-medium-gray mb-4">{publicProfileData.bio}</p>
                  )}
                  
                  <div className="flex items-center text-medium-gray text-sm mb-6">
                    <Calendar size={14} className="mr-1" />
                    <span>Joined {formatDate(publicProfileData.joinedDate)}</span>
                  </div>
                  
                  <div className="flex justify-center gap-8 mb-6">
                    <div className="text-center">
                      <p className="font-heading font-bold text-xl">{publicProfileData.followers.toLocaleString()}</p>
                      <p className="text-sm text-medium-gray">Followers</p>
                    </div>
                    <div className="text-center">
                      <p className="font-heading font-bold text-xl">{publicProfileData.following.toLocaleString()}</p>
                      <p className="text-sm text-medium-gray">Following</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant={isFollowing ? "secondary" : "primary"} 
                      size="sm"
                      onClick={() => setIsFollowing(!isFollowing)}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </Button>
                    
                    <Button 
                      variant="secondary" 
                      size="sm"
                      disabled={true}
                    >
                      Challenge (Soon!)
                    </Button>
                    
                    <Button 
                      variant="tertiary" 
                      size="sm"
                    >
                      <Share2 size={16} className="mr-1" /> Share
                    </Button>
                  </div>
                </div>
                
                {/* Stats and Achievements Overview */}
                <div className="md:w-2/3">
                  <h2 className="font-heading font-bold text-xl mb-4 flex items-center">
                    <Trophy size={20} className="mr-2 text-accent" />
                    Gameplay Statistics
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <StatCard 
                      label="Games Played" 
                      value={userGameStats.gamesPlayed}
                      icon={<Calendar size={16} color="white" />} 
                      color="#4f57d2" // primary
                    />
                    <StatCard 
                      label="Games Won" 
                      value={userGameStats.gamesWon}
                      icon={<Trophy size={16} color="white" />} 
                      color="#ffcc00" // accent
                    />
                    <StatCard 
                      label="Win Rate" 
                      value={`${winRate.toFixed(1)}%`}
                      icon={<TrendingUp size={16} color="white" />} 
                      color="#7bc043" // green
                    />
                    <StatCard 
                      label="Top-3 Placements" 
                      value={userGameStats.topThreePlacements}
                      icon={<Award size={16} color="white" />} 
                      color="#ff5a5a" // red
                    />
                    <StatCard 
                      label="Avg. Votes" 
                      value={userGameStats.averageVotesPerSubmission}
                      icon={<Heart size={16} color="white" />} 
                      color="#ff66c4" // pink
                    />
                    <StatCard 
                      label="Longest Streak" 
                      value={userGameStats.longestWinStreak}
                      icon={<Zap size={16} color="white" />} 
                      color="#22a7e5" // secondary
                    />
                  </div>
                  
                  {publicProfileData.isPremium && userGameStats.totalPrompts && (
                    <div className="bg-primary/10 p-4 rounded-lg mb-6 border-2 border-primary hand-drawn">
                      <div className="flex items-center mb-2">
                        <Star size={18} className="text-primary mr-2" />
                        <h3 className="font-heading font-semibold">Premium Stats</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-medium-gray">Total Prompts Used</p>
                          <p className="font-heading font-bold">{userGameStats.totalPrompts}</p>
                        </div>
                        {userGameStats.favoritePromptCategories && (
                          <div>
                            <p className="text-sm text-medium-gray">Favorite Categories</p>
                            <p className="font-heading font-bold">{userGameStats.favoritePromptCategories.join(", ")}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <h2 className="font-heading font-bold text-xl mb-4 flex items-center">
                    <Sparkles size={20} className="mr-2 text-accent" />
                    Recent Achievements
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {earnedAchievements.slice(0, 4).map(achievement => (
                      <AchievementCard 
                        key={achievement.id} 
                        achievement={achievement} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Submissions Section */}
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg border-2 border-dark hand-drawn mb-8">
              <div className="flex flex-wrap justify-between items-center mb-6">
                <h2 className="font-heading font-bold text-2xl flex items-center">
                  <Award size={24} className="mr-2 text-accent" />
                  Submissions
                </h2>
                
                <div className="flex border-b border-light-gray">
                  <button
                    className={`py-2 px-4 font-heading font-semibold ${
                      activeTab === 'recent' 
                      ? 'text-primary border-b-2 border-primary' 
                      : 'text-medium-gray hover:text-primary'
                    }`}
                    onClick={() => setActiveTab('recent')}
                  >
                    Recent
                  </button>
                  <button
                    className={`py-2 px-4 font-heading font-semibold ${
                      activeTab === 'popular' 
                      ? 'text-primary border-b-2 border-primary' 
                      : 'text-medium-gray hover:text-primary'
                    }`}
                    onClick={() => setActiveTab('popular')}
                  >
                    Popular
                  </button>
                  <button
                    className={`py-2 px-4 font-heading font-semibold ${
                      activeTab === 'winning' 
                      ? 'text-primary border-b-2 border-primary' 
                      : 'text-medium-gray hover:text-primary'
                    }`}
                    onClick={() => setActiveTab('winning')}
                  >
                    Winning
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredSubmissions.map(submission => (
                  <UserSubmissionCard 
                    key={submission.id} 
                    submission={submission} 
                  />
                ))}
              </div>
            </div>
            
            {/* Achievements Section */}
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg border-2 border-dark hand-drawn mb-8">
              <h2 className="font-heading font-bold text-2xl mb-6 flex items-center">
                <Sparkles size={24} className="mr-2 text-accent" />
                Achievements & Badges
              </h2>
              
              <div className="mb-6">
                <h3 className="font-heading font-semibold text-xl mb-4">Earned Achievements</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {earnedAchievements.map(achievement => (
                    <AchievementCard 
                      key={achievement.id} 
                      achievement={achievement} 
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-heading font-semibold text-xl mb-4">In Progress</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {inProgressAchievements.map(achievement => (
                    <AchievementCard 
                      key={achievement.id} 
                      achievement={achievement} 
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Booster Pack Usage Section */}
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg border-2 border-dark hand-drawn mb-8">
              <h2 className="font-heading font-bold text-2xl mb-6 flex items-center">
                <Shield size={24} className="mr-2 text-accent" />
                Booster Pack Usage
              </h2>
              
              <div className="mb-8">
                <h3 className="font-heading font-semibold text-xl mb-4">Favorite Packs</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {boosterPackUsage.map(pack => (
                    <BoosterPackUsageCard 
                      key={pack.packId} 
                      pack={pack} 
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-heading font-semibold text-xl mb-4">Most Used Stencils</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {favoriteStencils.map(stencil => (
                    <div 
                      key={stencil.id}
                      className="bg-white p-4 rounded-lg shadow-sm border border-light-gray"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-heading font-semibold">{stencil.name}</h4>
                          <p className="text-sm text-medium-gray">{stencil.packName}</p>
                        </div>
                        <div className="bg-primary/10 px-2 py-1 rounded text-xs font-medium text-primary">
                          {stencil.usageCount} uses
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Community Ranking Section (Premium only) */}
            {publicProfileData.isPremium && (
              <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg border-2 border-dark hand-drawn">
                <div className="flex items-center mb-6">
                  <Star size={24} className="mr-2 text-primary" />
                  <h2 className="font-heading font-bold text-2xl">Community Ranking</h2>
                  <div className="ml-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                    Premium
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-off-white p-4 rounded-lg">
                    <h3 className="font-heading font-semibold text-xl mb-2">Top Artist Ranking</h3>
                    <div className="flex items-center">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                        <span className="font-heading font-bold text-2xl text-primary">#24</span>
                      </div>
                      <div>
                        <p className="text-medium-gray">Based on votes and wins</p>
                        <p className="text-sm">Top 1% of all players</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-off-white p-4 rounded-lg">
                    <h3 className="font-heading font-semibold text-xl mb-2">Community Engagement</h3>
                    <div className="flex items-center">
                      <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mr-4">
                        <Users size={24} className="text-accent" />
                      </div>
                      <div>
                        <p className="font-heading font-semibold">Very Active</p>
                        <p className="text-sm text-medium-gray">Plays almost daily</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default UserProfile;