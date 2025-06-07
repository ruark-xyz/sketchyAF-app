import React from 'react';
import { motion } from 'framer-motion';
import { Heart, ChevronRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RoadmapItem } from '../../types';
import { useAuth } from '../../context/OptimizedAuthContext';

interface RoadmapItemCardProps {
  item: RoadmapItem;
  onLike: (itemId: string) => void;
  isLiked: boolean;
}

const RoadmapItemCard: React.FC<RoadmapItemCardProps> = ({ item, onLike, isLiked }) => {
  const { isLoggedIn } = useAuth();
  
  // Determine status color and label
  const getStatusInfo = () => {
    switch (item.status) {
      case 'in-progress':
        return { color: 'bg-primary text-white', label: 'In Progress' };
      case 'completed':
        return { color: 'bg-success text-white', label: 'Completed' };
      case 'delayed':
        return { color: 'bg-warning text-white', label: 'Delayed' };
      case 'planned':
      default:
        return { color: 'bg-secondary text-white', label: 'Planned' };
    }
  };
  
  const statusInfo = getStatusInfo();
  const targetTime = `${item.targetQuarter} ${item.targetYear}`;

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-dark hand-drawn h-full flex flex-col"
    >
      {/* Image */}
      <div className="h-48 overflow-hidden">
        <img 
          src={item.image} 
          alt={item.title} 
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Content */}
      <div className="p-5 flex-grow flex flex-col">
        {/* Status and target date */}
        <div className="flex justify-between items-center mb-3">
          <span className={`px-3 py-1 text-xs rounded-full ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          <div className="flex items-center text-medium-gray text-xs">
            <Clock size={14} className="mr-1" />
            <span>Target: {targetTime}</span>
          </div>
        </div>
        
        {/* Title */}
        <h3 className="font-heading font-bold text-xl mb-2">{item.title}</h3>
        
        {/* Description */}
        <p className="text-medium-gray text-sm mb-4 flex-grow">{item.description}</p>
        
        {/* Like button and count */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <button
            onClick={() => isLoggedIn && onLike(item.id)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
              isLiked 
                ? 'text-primary bg-primary/10' 
                : 'text-medium-gray hover:text-primary hover:bg-primary/5'
            } ${!isLoggedIn ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            disabled={!isLoggedIn}
            aria-label={isLiked ? "Unlike this feature" : "Like this feature"}
          >
            <Heart size={16} className={isLiked ? "fill-primary" : ""} />
            <span>{item.likes.toLocaleString()}</span>
          </button>
          
          <Link 
            to={`/roadmap/${item.id}`}
            className="text-primary text-sm hover:underline flex items-center"
          >
            Details <ChevronRight size={14} className="ml-1" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default RoadmapItemCard;