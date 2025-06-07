import React from 'react';
import SectionContainer from '../layout/SectionContainer';
import SectionHeader from '../ui/SectionHeader';
import GridContainer from '../layout/GridContainer';
import TestimonialCard from '../ui/TestimonialCard';
import { Testimonial } from '../../types';

interface TestimonialSectionProps {
  testimonials: Testimonial[];
}

const TestimonialSection: React.FC<TestimonialSectionProps> = ({ testimonials }) => {
  return (
    <SectionContainer background="cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="What Players Will Be Saying"
          subtitle="These are the kinds of testimonials we expect to see after launch. (We're optimistic, but we promise these are just placeholders for now!)"
        />
        
        <GridContainer
          columns={{ default: 1, md: 2, lg: 3 }}
          gap="lg"
        >
          {testimonials.map((testimonial) => (
            <TestimonialCard
              key={testimonial.id}
              name={testimonial.name}
              avatar={testimonial.avatar}
              rating={testimonial.rating}
              text={testimonial.text}
            />
          ))}
        </GridContainer>
        
        <div className="mt-8 text-center text-dark">
          <p className="text-sm italic font-body">
            Note: These testimonials are placeholders and will be replaced with real user reviews after launch.
          </p>
        </div>
      </div>
    </SectionContainer>
  );
};

export default TestimonialSection;