import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { BoosterPackUsage } from '../../types';

interface BoosterPackUsageCardProps {
  pack: BoosterPackUsage;
}

const BoosterPackUsageCard: React.FC<BoosterPackUsageCardProps> = ({ pack }) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white rounded-lg shadow-md overflow-hidden relative"
    >
      {/* Favorite badge */}
      {pack.isFavorite && (
        <div className="absolute top-3 right-3 z-10">
          <Star size={20} className="text-accent fill-accent" />
        </div>
      )}
      
      {/* Pack image */}
      <div className="h-24 overflow-hidden">
        <img 
          src={pack.packImage} 
          alt={pack.packName}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="p-4">
        <h3 className="font-heading font-semibold text-dark">{pack.packName}</h3>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-medium-gray">Used {pack.usageCount} times</span>
          {pack.isFavorite && (
            <span className="text-xs text-accent">Favorite</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BoosterPackUsageCard;