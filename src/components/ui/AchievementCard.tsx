import React from 'react';
import { motion } from 'framer-motion';
import { UserAchievement } from '../../types';

interface AchievementCardProps {
  achievement: UserAchievement;
}

const AchievementCard: React.FC<AchievementCardProps> = ({ achievement }) => {
  const { name, description, icon, earned, progress, maxProgress, date } = achievement;
  
  // Determine progress percentage for the progress bar
  const progressPercentage = progress && maxProgress 
    ? Math.min(100, (progress / maxProgress) * 100) 
    : 0;
  
  // Format date
  const formattedDate = date 
    ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
    : null;

  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      className={`p-4 rounded-lg border-2 ${
        earned 
          ? 'bg-accent/10 border-accent' 
          : 'bg-light-gray/30 border-light-gray'
      } relative hand-drawn`}
    >
      <div className="flex items-start">
        {/* Icon */}
        <div className={`text-3xl mr-3 ${!earned && 'opacity-50'}`}>
          {icon}
        </div>
        
        <div className="flex-1">
          {/* Name and date */}
          <div className="flex justify-between items-start">
            <h3 className={`font-heading font-bold text-lg ${!earned && 'text-medium-gray'}`}>
              {name}
            </h3>
            {earned && formattedDate && (
              <span className="text-xs text-medium-gray">
                {formattedDate}
              </span>
            )}
          </div>
          
          {/* Description */}
          <p className={`text-sm ${!earned && 'text-medium-gray'}`}>
            {description}
          </p>
          
          {/* Progress bar for unearned achievements with progress */}
          {!earned && progress !== undefined && maxProgress !== undefined && (
            <div className="mt-2">
              <div className="h-2 bg-light-gray rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-medium-gray">{progress}/{maxProgress}</span>
                <span className="text-xs text-medium-gray">{progressPercentage.toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Badge for earned achievements */}
      {earned && (
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent text-dark rounded-full flex items-center justify-center border-2 border-dark font-bold text-sm">
          ✓
        </div>
      )}
    </motion.div>
  );
};

export default AchievementCard;