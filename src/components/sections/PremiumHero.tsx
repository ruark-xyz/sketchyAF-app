import React from 'react';
import { motion } from 'framer-motion';
import { Crown, ChevronDown } from 'lucide-react';
import Button from '../ui/Button';

interface PremiumHeroProps {
  onExplorePacksClick?: () => void;
}

const PremiumHero: React.FC<PremiumHeroProps> = ({ onExplorePacksClick }) => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2 
      } 
    }
  };
  
  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-20 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center max-w-4xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full mb-6"
            variants={itemVariants}
          >
            <Crown className="w-10 h-10 text-white" />
          </motion.div>
          
          <motion.h1 
            className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl text-dark mb-6"
            variants={itemVariants}
          >
            Elevate Your <span className="text-primary">SketchyAF</span> Experience
          </motion.h1>
          
          <motion.p
            className="text-lg md:text-xl text-medium-gray mb-8"
            variants={itemVariants}
          >
            Unlock exclusive content, premium booster packs, and features that make the game even more ridiculous. 
            Because being Premium AF is the only way to play.
          </motion.p>
          
          <motion.div 
            className="flex flex-wrap justify-center gap-4 mb-10"
            variants={itemVariants}
          >
            <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
              <span className="h-3 w-3 bg-success rounded-full mr-2"></span>
              <span>No Ads</span>
            </div>
            <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
              <span className="h-3 w-3 bg-success rounded-full mr-2"></span>
              <span>Exclusive Packs</span>
            </div>
            <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
              <span className="h-3 w-3 bg-success rounded-full mr-2"></span>
              <span>Double XP</span>
            </div>
            <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
              <span className="h-3 w-3 bg-success rounded-full mr-2"></span>
              <span>Priority Support</span>
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Button
              variant="primary"
              size="lg"
              onClick={onExplorePacksClick}
              className="flex items-center"
            >
              Explore Booster Packs <ChevronDown className="ml-2" size={18} />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default PremiumHero;