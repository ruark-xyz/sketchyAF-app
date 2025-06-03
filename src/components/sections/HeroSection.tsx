import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../ui/Button';
import { ChevronDown } from 'lucide-react';

interface HeroSectionProps {
  scrollToRef?: React.RefObject<HTMLElement>;
}

const HeroSection: React.FC<HeroSectionProps> = ({ scrollToRef }) => {
  const scrollToContent = () => {
    if (scrollToRef && scrollToRef.current) {
      scrollToRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative bg-cream min-h-[90vh] flex items-center">
      {/* Background grid pattern is handled by global CSS */}
      
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="absolute top-20 right-10 w-32 h-32 bg-turquoise border-2 border-dark rounded-xl transform rotate-12"
        ></motion.div>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="absolute bottom-20 left-10 w-40 h-40 bg-pink border-2 border-dark rounded-full"
        ></motion.div>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="absolute top-1/3 left-1/4 w-24 h-24 bg-orange border-2 border-dark rounded-xl transform -rotate-6"
        ></motion.div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white border-2 border-dark p-8 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] max-w-4xl mx-auto"
        >
          <motion.h1 
            className="font-heading font-bold text-4xl sm:text-5xl md:text-6xl text-dark max-w-3xl mx-auto leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="text-secondary transform inline-block rotate-[-1deg]">DRAW</span> <span className="text-red transform inline-block rotate-[1deg]">FAST.</span> <br/>
            <span className="text-green transform inline-block rotate-[-2deg]">VOTE</span> <span className="text-accent transform inline-block rotate-[2deg]">FASTER.</span>
          </motion.h1>
          
          <motion.p
            className="mt-6 text-xl md:text-2xl text-dark max-w-2xl mx-auto font-body"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            The weird, wildly entertaining drawing game perfect for killing time anywhere. 
            Join 60-second rounds of frantic drawing and guessing!
          </motion.p>
          
          <motion.div
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          >
            <Button 
              variant="primary" 
              size="lg" 
              onClick={scrollToContent}
            >
              Join a Game
            </Button>
            <Button variant="secondary" size="lg" to="/leaderboard">
              View Leaderboard
            </Button>
          </motion.div>
        </motion.div>
        
        <motion.div
          className="absolute bottom-8 left-0 right-0 flex justify-center cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          onClick={scrollToContent}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <ChevronDown size={36} className="text-dark" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;