import React from 'react';
import { motion } from 'framer-motion';
import DrawingCard from '../components/ui/DrawingCard';
import BottomCTA from '../components/sections/BottomCTA';
import Seo from '../components/utils/Seo';
import { topDrawingsData } from '../data/mockData';

const TopDrawings: React.FC = () => {
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

  return (
    <>
      <Seo 
        title="Top Drawings Gallery"
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
              Top Drawings (Example)
            </h1>
            <p className="text-medium-gray text-lg max-w-2xl mx-auto">
              These are examples of what our gallery of top-rated drawings will look like.
              Soon, these will be replaced with actual masterpieces from our talented (or not) users!
            </p>
          </motion.div>
          
          <div className="mb-6 flex justify-center sm:justify-end">
            <div className="inline-flex rounded-md shadow">
              <select className="border border-light-gray rounded-md p-2 text-medium-gray focus:border-primary">
                <option>All Time</option>
                <option>This Week</option>
                <option>This Month</option>
              </select>
            </div>
          </div>
          
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {topDrawingsData.map((drawing) => (
              <motion.div 
                key={drawing.id} 
                variants={itemVariants}
              >
                <DrawingCard drawing={drawing} />
              </motion.div>
            ))}
          </motion.div>
          
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
        useConditionalNavigation={true}
      />
    </>
  );
};

export default TopDrawings;