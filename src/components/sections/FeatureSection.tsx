import React from 'react';
import { motion } from 'framer-motion';
import { FeatureCard } from '../../types';
import * as Icons from 'lucide-react';

interface FeatureSectionProps {
  features: FeatureCard[];
}

const FeatureSection: React.FC<FeatureSectionProps> = ({ features }) => {
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
  
  const featureVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  // Dynamic icon rendering
  const renderIcon = (iconName: string, color: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons];
    return IconComponent ? <IconComponent size={36} style={{ color }} /> : null;
  };

  // Function to get card color based on index
  const getCardColor = (index: number) => {
    const colors = [
      'bg-turquoise border-dark', 
      'bg-orange border-dark',
      'bg-pink border-dark', 
      'bg-green border-dark',
      'bg-secondary border-dark', 
      'bg-primary border-dark'
    ];
    return colors[index % colors.length];
  };

  return (
    <section className="py-16 md:py-24 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-dark mb-4 transform rotate-[-1deg]">
            Why SketchyAF?
          </h2>
          <p className="font-body text-dark text-xl max-w-2xl mx-auto">
            Because drawing with stick figures and boosters has never been this entertaining. 
            Or this profitable for our shareholders.
          </p>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={featureVariants}
              whileHover={{ rotate: 1, y: -5 }}
              className={`hand-drawn ${getCardColor(index)} border-2 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] relative`}
            >
              {feature.isComingSoon && (
                <div className="absolute -top-3 -right-3 bg-pink text-dark px-4 py-1 rounded-full text-sm font-heading font-bold border-2 border-dark transform rotate-12 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] z-10">
                  Coming Soon
                </div>
              )}
              {feature.isSubscriberPerk && (
                <div className="absolute -top-3 -right-3 bg-turquoise text-dark px-4 py-1 rounded-full text-sm font-heading font-bold border-2 border-dark transform rotate-12 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] z-10">
                  Subscriber Perk
                </div>
              )}
              <div className="mb-4 transform rotate-[-3deg]">{renderIcon(feature.icon, "#2d2d2d")}</div>
              <h3 className="font-heading font-bold text-2xl mb-2 text-dark">{feature.title}</h3>
              <p className="text-dark">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeatureSection;