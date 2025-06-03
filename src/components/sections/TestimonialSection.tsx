import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Testimonial } from '../../types';

interface TestimonialSectionProps {
  testimonials: Testimonial[];
}

const TestimonialSection: React.FC<TestimonialSectionProps> = ({ testimonials }) => {
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
  
  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  const renderRating = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star 
        key={i} 
        size={18} 
        className={`${i < rating ? 'text-accent fill-accent' : 'text-light-gray'}`}
      />
    ));
  };

  // Function to get card color based on index
  const getCardColor = (index: number) => {
    const colors = [
      'bg-turquoise border-dark', 
      'bg-orange border-dark',
      'bg-green border-dark', 
      'bg-secondary border-dark',
      'bg-pink border-dark', 
      'bg-primary border-dark'
    ];
    return colors[index % colors.length];
  };

  return (
    <section className="py-16 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-dark mb-4 transform rotate-[-1deg]">
            What Players Will Be Saying
          </h2>
          <p className="text-dark text-xl font-body max-w-2xl mx-auto">
            These are the kinds of testimonials we expect to see after launch. 
            (We're optimistic, but we promise these are just placeholders for now!)
          </p>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              variants={itemVariants}
              whileHover={{ rotate: 2, y: -5 }}
              className={`p-6 hand-drawn ${getCardColor(index)} border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]`}
            >
              <div className="flex items-center mb-4">
                <img 
                  src={testimonial.avatar} 
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full border-2 border-dark mr-4 object-cover"
                />
                <div>
                  <h3 className="font-heading font-bold text-lg text-dark">{testimonial.name}</h3>
                  <div className="flex mt-1">
                    {renderRating(testimonial.rating)}
                  </div>
                </div>
              </div>
              <p className="text-dark italic font-body text-lg">"{testimonial.text}"</p>
            </motion.div>
          ))}
        </motion.div>
        
        <div className="mt-8 text-center text-dark">
          <p className="text-sm italic font-body">
            Note: These testimonials are placeholders and will be replaced with real user reviews after launch.
          </p>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;