import React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import ContentCard from './ContentCard';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  isComingSoon?: boolean;
  isSubscriberPerk?: boolean;
  className?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ 
  title, 
  description, 
  icon, 
  color,
  isComingSoon = false,
  isSubscriberPerk = false,
  className = ''
}) => {
  // Dynamic icon rendering
  const renderIcon = (iconName: string, color: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons];
    return IconComponent ? <IconComponent size={36} style={{ color }} /> : null;
  };

  return (
    <ContentCard 
      hover={true}
      className={`relative ${className}`}
      background="white"
    >
      {isComingSoon && (
        <div className="absolute -top-3 -right-3 bg-pink text-dark px-4 py-1 rounded-full text-sm font-heading font-bold border-2 border-dark transform rotate-12 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] z-10">
          Coming Soon
        </div>
      )}
      
      {isSubscriberPerk && (
        <div className="absolute -top-3 -right-3 bg-turquoise text-dark px-4 py-1 rounded-full text-sm font-heading font-bold border-2 border-dark transform rotate-12 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] z-10">
          Subscriber Perk
        </div>
      )}
      
      <div className="mb-4 transform rotate-[-3deg]">
        {renderIcon(icon, color)}
      </div>
      
      <h3 className="font-heading font-bold text-2xl mb-2 text-dark">
        {title}
      </h3>
      
      <p className="text-dark font-body">
        {description}
      </p>
    </ContentCard>
  );
};

export default FeatureCard;