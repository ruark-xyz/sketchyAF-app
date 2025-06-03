import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, Trophy } from 'lucide-react';
import { UserSubmission } from '../../types';

interface UserSubmissionCardProps {
  submission: UserSubmission;
}

const UserSubmissionCard: React.FC<UserSubmissionCardProps> = ({ submission }) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer relative"
    >
      <Link to={`/art/${submission.id}`}>
        {/* Winner badge */}
        {submission.isWinner && (
          <div className="absolute top-3 left-3 z-10 bg-accent text-dark px-3 py-1 rounded-full text-xs font-heading font-bold flex items-center space-x-1 border-2 border-dark shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] hand-drawn">
            <Trophy size={12} className="mr-1" />
            <span>Winner!</span>
          </div>
        )}
        
        {/* Vote count */}
        <div className="absolute top-3 right-3 z-10 bg-white rounded-full px-3 py-1 text-xs font-heading font-bold flex items-center space-x-1 shadow-md">
          <Heart size={12} className="text-primary mr-1 fill-primary" />
          <span>{submission.votes.toLocaleString()}</span>
        </div>
        
        {/* Drawing image */}
        <div className="h-48 overflow-hidden">
          <img 
            src={submission.drawingUrl} 
            alt={`Drawing of ${submission.prompt}`}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="p-4">
          {/* Prompt */}
          <p className="font-heading font-semibold text-dark line-clamp-2">
            "{submission.prompt}"
          </p>
          
          {/* Date */}
          <div className="mt-2 text-sm text-medium-gray">
            {new Date(submission.date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default UserSubmissionCard;