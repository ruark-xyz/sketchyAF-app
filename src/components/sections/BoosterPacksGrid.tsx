import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import BoosterPackCard from '../ui/BoosterPackCard';
import { LegacyBoosterPack } from '../../types';

interface BoosterPacksGridProps {
  packs: LegacyBoosterPack[];
}

const BoosterPacksGrid = forwardRef<HTMLDivElement, BoosterPacksGridProps>(({ packs }, ref) => {
  // Animation variants for staggered grid
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
    <div ref={ref}>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        {packs.map((pack) => (
          <motion.div 
            key={pack.id} 
            variants={itemVariants}
          >
            <BoosterPackCard pack={pack} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
});

BoosterPacksGrid.displayName = 'BoosterPacksGrid';

export default BoosterPacksGrid;