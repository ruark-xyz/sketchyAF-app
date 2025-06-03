import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, Award, Star, Trophy } from 'lucide-react';
import { TopDrawing } from '../../types';

interface DrawingCardProps {
  drawing: TopDrawing;
}

const DrawingCard: React.FC<DrawingCardProps> = ({ drawing }) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white rounded-lg shadow-md overflow-hidden"
    >
      <Link to={`/art/${drawing.id}`}>
        <div className="relative">
          {/* Drawing badges */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            {drawing.isWinner && (
              <div className="bg-accent text-dark px-2 py-1 rounded-full text-xs font-heading font-bold flex items-center shadow-md">
                <Trophy size={12} className="mr-1" />
                <span>Winner</span>
              </div>
            )}
            
            {drawing.isPremium && (
              <div className="bg-primary text-white px-2 py-1 rounded-full text-xs font-heading font-bold flex items-center shadow-md">
                <Star size={12} className="mr-1" />
                <span>Premium</span>
              </div>
            )}
          </div>
          
          {/* Vote count badge */}
          <div className="absolute bottom-3 left-3 flex items-center bg-white rounded-full px-3 py-1 shadow-md z-10">
            <Heart className="h-4 w-4 text-primary mr-1 fill-primary" />
            <span className="font-semibold">{drawing.score.toLocaleString()}</span>
          </div>
          
          {/* Drawing image */}
          <div className="h-64">
            <img 
              src={drawing.drawingUrl} 
              alt={`Drawing of ${drawing.prompt}`}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        
        <div className="p-5">
          {/* Prompt */}
          <h3 className="font-heading font-semibold text-lg mb-2 line-clamp-2">
            "{drawing.prompt}"
          </h3>
          
          {/* Artist and date */}
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center">
              <Award className="h-5 w-5 text-accent mr-2" />
              <span className="font-medium">{drawing.username}</span>
            </div>
            <span className="text-sm text-medium-gray">
              {new Date(drawing.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default DrawingCard;