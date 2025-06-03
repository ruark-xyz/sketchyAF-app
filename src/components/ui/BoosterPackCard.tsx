import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import { BoosterPack } from '../../types';

interface BoosterPackCardProps {
  pack: BoosterPack;
}

const BoosterPackCard: React.FC<BoosterPackCardProps> = ({ pack }) => {
  // Determine badge color based on pack type
  const getPriceBadgeColor = (type: string) => {
    switch (type) {
      case 'premium':
        return 'bg-primary text-white';
      case 'paid':
        return 'bg-secondary text-white';
      case 'free':
      default:
        return 'bg-success text-white';
    }
  };

  // Determine color for feature badges
  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'subscriber-perk':
        return 'bg-turquoise text-dark';
      case 'new':
        return 'bg-green text-dark';
      case 'promotion':
        return 'bg-orange text-dark';
      case 'limited-time':
        return 'bg-pink text-dark';
      case 'partner':
        return 'bg-purple text-white';
      default:
        return 'bg-accent text-dark';
    }
  };

  // Determine rotation angle for each badge to create a staggered look
  const getBadgeRotation = (index: number) => {
    const rotations = [-6, 6, -3, 3];
    return rotations[index % rotations.length];
  };

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer relative"
    >
      <Link to={`/booster-packs/${pack.id}`}>
        {/* Feature Badges */}
        {pack.badges && pack.badges.length > 0 && (
          <div className="absolute top-3 left-3 z-10 flex flex-col space-y-2">
            {pack.badges.map((badge, index) => (
              <motion.div
                key={badge.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.3 }}
                className={`${getBadgeColor(badge.type)} px-3 py-1 text-xs font-heading font-bold rounded-full border-2 border-dark shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] hand-drawn`}
                style={{ transform: `rotate(${getBadgeRotation(index)}deg)` }}
              >
                {badge.text}
              </motion.div>
            ))}
          </div>
        )}

        {/* Partner Curated Badge (separate from other badges for emphasis) */}
        {pack.isPartnerCurated && !pack.badges?.some(b => b.type === 'partner') && (
          <div className="absolute top-3 right-3 z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-purple text-white px-3 py-1 text-xs font-heading font-bold rounded-full flex items-center border-2 border-dark shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] hand-drawn"
            >
              <Award size={12} className="mr-1" />
              <span>Partner Curated</span>
            </motion.div>
          </div>
        )}

        {/* Pack Image */}
        <div className="h-48 overflow-hidden">
          <img 
            src={pack.image} 
            alt={pack.name} 
            className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
          />
        </div>
        
        <div className="p-5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-heading font-semibold text-xl">{pack.name}</h3>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getPriceBadgeColor(pack.type)}`}>
              {pack.price}
            </span>
          </div>
          
          <p className="text-medium-gray text-sm mb-4">{pack.description}</p>
          
          {/* Partner info preview (only if partner curated) */}
          {pack.isPartnerCurated && pack.partnerInfo && (
            <div className="flex items-center mt-2 pt-2 border-t border-light-gray">
              <img 
                src={pack.partnerInfo.logo} 
                alt={pack.partnerInfo.name}
                className="w-6 h-6 rounded-full object-cover mr-2"
              />
              <span className="text-xs text-medium-gray">
                Curated by <span className="font-semibold">{pack.partnerInfo.name}</span>
              </span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

export default BoosterPackCard;