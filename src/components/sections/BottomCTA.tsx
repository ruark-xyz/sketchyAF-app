import React from 'react';
import { motion } from 'framer-motion';
import Button from '../ui/Button';

interface BottomCTAProps {
  heading: string;
  subheading?: string;
  buttonText: string;
  buttonLink: string;
  isExternalLink?: boolean;
}

const BottomCTA: React.FC<BottomCTAProps> = ({
  heading,
  subheading,
  buttonText,
  buttonLink,
  isExternalLink = false,
}) => {
  return (
    <section className="bg-secondary py-16 md:py-24 border-y-2 border-dark">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-white border-2 border-dark p-8 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
        >
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-dark mb-4 transform rotate-[-1deg]">
            {heading}
          </h2>
          
          {subheading && (
            <p className="text-dark text-xl font-body max-w-3xl mx-auto mb-8">
              {subheading}
            </p>
          )}
          
          {isExternalLink ? (
            <Button 
              variant="primary" 
              size="lg" 
              href={buttonLink}
            >
              {buttonText}
            </Button>
          ) : (
            <Button 
              variant="primary" 
              size="lg" 
              to={buttonLink}
            >
              {buttonText}
            </Button>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default BottomCTA;