import React, { useRef } from 'react';
import HeroSection from '../components/sections/HeroSection';
import EmailSignup from '../components/sections/EmailSignup';
import FeatureSection from '../components/sections/FeatureSection';
import TestimonialSection from '../components/sections/TestimonialSection';
import BottomCTA from '../components/sections/BottomCTA';
import Seo from '../components/utils/Seo';
import { gameFeatures, testimonials } from '../data/mockData';

const Home: React.FC = () => {
  const featuresRef = useRef<HTMLDivElement>(null);
  const emailSignupRef = useRef<HTMLElement>(null);
  
  return (
    <>
      <Seo 
        title="The Wildly Entertaining Drawing Game"
        description="SketchyAF is a weird, wildly entertaining drawing game perfect for killing time anywhere. Join 60-second rounds of frantic drawing and fun!"
      />
      
      <HeroSection scrollToRef={emailSignupRef} />
      
      <div ref={featuresRef}>
        <FeatureSection features={gameFeatures} />
      </div>
      
      <EmailSignup ref={emailSignupRef} />
      
      <TestimonialSection testimonials={testimonials} />
      
      <BottomCTA 
        heading="Ready to Get Sketchy?" 
        subheading="Join the drawing mayhem today and prove that stick figures can be art... sort of."
        buttonText="Join a Game"
        buttonLink="#email-signup"
        isExternalLink={false}
      />
    </>
  );
};

export default Home;