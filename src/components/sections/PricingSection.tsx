import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Button from '../ui/Button';
import { SubscriptionBenefit } from '../../types';

interface PricingSectionProps {
  benefits: SubscriptionBenefit[];
  price: {
    monthly: string;
    annual: string;
  };
}

const PricingSection: React.FC<PricingSectionProps> = ({ benefits, price }) => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-dark mb-4">
            Become Premium AF
          </h2>
          <p className="text-medium-gray text-lg max-w-2xl mx-auto">
            Upgrade your experience with exclusive content and features that make the game even more entertaining.
          </p>
        </motion.div>
        
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-off-white rounded-lg shadow-lg overflow-hidden border-2 border-primary"
          >
            <div className="bg-primary text-white py-6 px-8">
              <h3 className="font-heading font-bold text-2xl">Premium Subscription</h3>
            </div>
            
            <div className="p-8">
              <div className="flex justify-center items-end mb-8">
                <div className="text-center">
                  <span className="font-heading font-bold text-4xl text-primary">{price.monthly}</span>
                  <span className="text-medium-gray ml-1">/month</span>
                  <p className="text-sm mt-1 text-medium-gray">or {price.annual}/year (save 20%)</p>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                {benefits.map((benefit, index) => (
                  <motion.li 
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.4 }}
                    viewport={{ once: true }}
                    className="flex items-start"
                  >
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center mr-3 mt-0.5">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <span className={benefit.isHighlighted ? 
                      "font-bold text-primary relative" : 
                      "text-dark-gray"
                    }>
                      {benefit.text}
                      {benefit.isHighlighted && (
                        <motion.span
                          className="absolute top-0 right-0 bottom-0 left-0 bg-primary/10 rounded-sm -z-10"
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                        />
                      )}
                    </span>
                  </motion.li>
                ))}
              </ul>
              
              <div className="text-center">
                <Button variant="primary" size="lg" href="#">
                  Get Premium Now
                </Button>
                <p className="text-sm text-medium-gray mt-4">
                  No commitment. Cancel anytime.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;