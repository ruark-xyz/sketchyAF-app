import React from 'react';
import { Star } from 'lucide-react';
import ContentCard from './ContentCard';

interface TestimonialCardProps {
  name: string;
  avatar: string;
  rating: number;
  text: string;
  className?: string;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ 
  name, 
  avatar, 
  rating, 
  text,
  className = ''
}) => {
  const renderRating = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star 
        key={i} 
        size={18} 
        className={`${i < rating ? 'text-accent fill-accent' : 'text-light-gray'}`}
      />
    ));
  };

  return (
    <ContentCard 
      hover={true}
      className={className}
      background="white"
    >
      <div className="flex items-center mb-4">
        <img 
          src={avatar} 
          alt={name}
          className="w-12 h-12 rounded-full border-2 border-dark mr-4 object-cover"
        />
        <div>
          <h3 className="font-heading font-bold text-lg text-dark">{name}</h3>
          <div className="flex mt-1">
            {renderRating(rating)}
          </div>
        </div>
      </div>
      
      <p className="text-dark italic font-body text-lg">
        "{text}"
      </p>
    </ContentCard>
  );
};

export default TestimonialCard;