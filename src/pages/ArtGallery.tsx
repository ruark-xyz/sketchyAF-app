import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter } from 'lucide-react';
import DrawingCard from '../components/ui/DrawingCard';
import BottomCTA from '../components/sections/BottomCTA';
import EmailSignupModal from '../components/ui/EmailSignupModal';
import Seo from '../components/utils/Seo';
import { topDrawingsData } from '../data/mockData';

const ArtGallery: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  
  const openEmailModal = () => setIsEmailModalOpen(true);
  const closeEmailModal = () => setIsEmailModalOpen(false);
  
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
  const filteredDrawings = topDrawingsData
    .filter(drawing => {
      const matchesSearch = drawing.prompt.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           drawing.username.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filterType === 'all') return matchesSearch;
      if (filterType === 'premium') return matchesSearch && drawing.isPremium;
      if (filterType === 'winners') return matchesSearch && drawing.isWinner;
      
      return matchesSearch;
    })
    .sort((a, b) => b.score - a.score);

  return (
    <>
      <Seo 
        title="Art Gallery - Community Masterpieces"
        description="Explore the funniest and most creative drawings from SketchyAF players. Vote for your favorites and see what crazy prompts inspired these masterpieces!"
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
              Art Gallery
            </h1>
            <p className="text-medium-gray text-lg max-w-2xl mx-auto">
              Explore the most creative, hilarious, and occasionally disturbing masterpieces from our community.
              Vote for your favorites or get inspired for your next drawing!
            </p>
          </motion.div>
          
          {/* Search and Filter Controls */}
          <div className="mb-8 flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative flex-grow max-w-md">
              <input
                type="text"
                placeholder="Search by prompt or artist..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-light-gray rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-medium-gray" size={18} />
            </div>
            
            <div className="flex items-center gap-3">
              <Filter size={18} className="text-medium-gray" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border-2 border-light-gray rounded-lg py-2 px-3 focus:border-primary focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All Artwork</option>
                <option value="premium">Premium Only</option>
                <option value="winners">Contest Winners</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>
          </div>
          
          {filteredDrawings.length > 0 ? (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredDrawings.map((drawing) => (
                <motion.div 
                  key={drawing.id} 
                  variants={itemVariants}
                >
                  <DrawingCard drawing={drawing} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="bg-white p-16 rounded-lg shadow-md text-center">
              <h3 className="font-heading font-bold text-xl mb-3">No artworks found</h3>
              <p className="text-medium-gray">
                We couldn't find any art matching your search criteria. Try adjusting your filters.
              </p>
            </div>
          )}
          
          <div className="mt-10 text-center text-medium-gray">
            <p className="text-sm italic">
              Note: These drawings are placeholders and will be replaced with actual user submissions after launch.
            </p>
          </div>
        </div>
      </section>
      
      <BottomCTA 
        heading="Think You Can Do Better?" 
        subheading="Join the game and show off your artistic skills (or lack thereof)."
        buttonText="Start Drawing Now"
        onEmailSignupClick={openEmailModal}
      />
      
      {/* Email Signup Modal */}
      <EmailSignupModal 
        isOpen={isEmailModalOpen} 
        onClose={closeEmailModal} 
      />
    </>
  );
};

export default ArtGallery;