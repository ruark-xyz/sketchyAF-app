import React, { useRef, useState } from 'react';
import HeroSection from '../components/sections/HeroSection';
import EmailSignup from '../components/sections/EmailSignup';
import FeatureSection from '../components/sections/FeatureSection';
import TestimonialSection from '../components/sections/TestimonialSection';
import BottomCTA from '../components/sections/BottomCTA';
import EmailSignupModal from '../components/ui/EmailSignupModal';
import Button from '../components/ui/Button';
import Seo from '../components/utils/Seo';
import { gameFeatures, testimonials } from '../data/mockData';
import { motion } from 'framer-motion';
import { Route } from 'lucide-react';

const Home: React.FC = () => {
  const featuresRef = useRef<HTMLDivElement>(null);
  const emailSignupRef = useRef<HTMLElement>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  
  const openEmailModal = () => setIsEmailModalOpen(true);
  const closeEmailModal = () => setIsEmailModalOpen(false);
  
  return (
    <>
      <Seo 
        title="The Wildly Entertaining Drawing Game"
        description="SketchyAF is a weird, wildly entertaining drawing game perfect for killing time anywhere. Join 60-second rounds of frantic drawing and fun!"
      />
      
      <HeroSection 
        scrollToRef={emailSignupRef}
      />
      
      <div ref={featuresRef}>
        <FeatureSection features={gameFeatures} />
      </div>
      
      {/* Demo Video Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="py-16 bg-white text-center"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-dark mb-6 transform rotate-[-1deg]">
            See SketchyAF in Action!
          </h2>
          <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-lg border-4 border-dark hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <iframe 
              width="560" 
              height="315" 
              src="https://www.youtube.com/embed/X0cLbGBvAOY?si=I6zDV1CdE7_5lqim" 
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full"
            ></iframe>
          </div>
        </div>
      </motion.section>
      
      <EmailSignup ref={emailSignupRef} />
      
      {/* Roadmap Link Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="py-12 bg-white text-center border-y-2 border-dark"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Route size={36} className="mb-4 text-primary mx-auto" />
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-dark mb-4 transform rotate-[-1deg]">
            Curious about what's coming next?
          </h2>
          <p className="text-dark text-lg font-body mb-6">
            Check out our public roadmap to see what we're planning to build next,
            and vote for the features you're most excited about!
          </p>
          <Button variant="secondary" to="/roadmap">
            View Our Roadmap
          </Button>
        </div>
      </motion.section>
      
      <TestimonialSection testimonials={testimonials} />
      
      <BottomCTA 
        heading="Ready to Get Sketchy?" 
        subheading="Join the drawing mayhem today and prove that stick figures can be art... sort of."
        buttonText="Join a Game"
        useConditionalNavigation={true}
      />
      
      {/* Email Signup Modal */}
      <EmailSignupModal 
        isOpen={isEmailModalOpen} 
        onClose={closeEmailModal} 
      />
    </>
  );
};

export default Home;