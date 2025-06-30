import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import LeaderboardTable from '../components/ui/LeaderboardTable';
import Button from '../components/ui/Button';
import BottomCTA from '../components/sections/BottomCTA';
import EmailSignupModal from '../components/ui/EmailSignupModal';
import Seo from '../components/utils/Seo';
import { leaderboardData } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { getJoinGameRoute } from '../utils/navigationHelpers';

const Leaderboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  
  const openEmailModal = () => setIsEmailModalOpen(true);
  const closeEmailModal = () => setIsEmailModalOpen(false);
  
  const handleJoinGame = () => {
    const targetRoute = getJoinGameRoute(isLoggedIn);
    navigate(targetRoute);
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1 
      } 
    }
  };
  
  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  // Filter drawings based on search term and filter type
  const filteredDrawings = leaderboardData
    .filter(drawing => {
      const matchesSearch = drawing.username.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filterType === 'all') return matchesSearch;
      if (filterType === 'premium') return matchesSearch && drawing.country?.code === 'US';
      if (filterType === 'winners') return matchesSearch && drawing.rank <= 3;
      
      return matchesSearch;
    })
    .sort((a, b) => a.rank - b.rank);

  return (
    <>
      <Seo 
        title="Leaderboard - Top Players"
        description="Check out the top SketchyAF players and their scores. Join the competition and see if you can make it to the top of our leaderboard!"
      />
      
      <section className="py-16 md:py-24 bg-off-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 md:mb-16"
          >
            <h1 className="font-heading font-bold text-3xl md:text-5xl text-dark mb-4">
              SketchyAF Leaderboard (Coming Soon)
            </h1>
            <p className="text-medium-gray text-lg max-w-2xl mx-auto">
              We're in the process of rolling out our algorithm for the learderboard. Get playing, get your practice in and we'll let you know when the leaderboard is ready!
            </p>
          </motion.div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
              <h2 className="font-heading font-semibold text-2xl">Top Players</h2>
              <div className="flex gap-2">
                <Button variant="tertiary" className="text-sm">Weekly</Button>
                <Button variant="tertiary" className="text-sm">Monthly</Button>
                <Button variant="tertiary" className="text-sm font-bold">All Time</Button>
              </div>
            </div>
            
            <LeaderboardTable entries={filteredDrawings} />
            
            <div className="mt-8 text-center">
              <Button variant="primary" onClick={handleJoinGame}>
                Get Practicing
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      <BottomCTA 
        heading="Ready to Join the Ranks?" 
        subheading="Your terrible drawing skills could earn you a spot on this prestigious leaderboard."
        buttonText="Start Drawing Now"
        useConditionalNavigation={true}
      />
      
      {/* Email Signup Modal */}
      <EmailSignupModal 
        isOpen={isEmailModalOpen} 
        onClose={closeEmailModal} 
      />
    </>
  );
};

export default Leaderboard;