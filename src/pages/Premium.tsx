import React, { useRef, useState } from 'react';
import PremiumHero from '../components/sections/PremiumHero';
import PricingSection from '../components/sections/PricingSection';
import BoosterPacksGrid from '../components/sections/BoosterPacksGrid';
import BottomCTA from '../components/sections/BottomCTA';
import EmailSignupModal from '../components/ui/EmailSignupModal';
import Seo from '../components/utils/Seo';
import { boosterPacks, subscriptionBenefits } from '../data/mockData';

const Premium: React.FC = () => {
  const boosterPacksRef = useRef<HTMLDivElement>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  
  const openEmailModal = () => setIsEmailModalOpen(true);
  const closeEmailModal = () => setIsEmailModalOpen(false);
  
  const scrollToBoosterPacks = () => {
    if (boosterPacksRef.current) {
      boosterPacksRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  return (
    <>
      <Seo 
        title="Premium Features & Booster Packs"
        description="Upgrade your SketchyAF experience with exclusive premium features, booster packs, and content that makes the game even more entertaining."
      />
      
      <PremiumHero onExplorePacksClick={scrollToBoosterPacks} />
      
      <PricingSection 
        benefits={subscriptionBenefits}
        price={{
          monthly: "$1.99",
          annual: "$17.90"
        }}
        onEmailSignupClick={openEmailModal}
      />
      
      <section id="booster-packs" ref={boosterPacksRef} className="py-16 bg-off-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-dark mb-4">
              Explore Booster Packs
            </h2>
            <p className="text-medium-gray text-lg max-w-2xl mx-auto">
              From meme collections to NSFW content, we've got packs for every occasion. Our packs are still baking in the meme oven. Take a sneak peek before launch!
              Click on a pack to see what's inside!
            </p>
          </div>
          
          <BoosterPacksGrid packs={boosterPacks} />
        </div>
      </section>
      
      <BottomCTA 
        heading="Ready to Unlock Premium?"
        subheading="Get access to exclusive content and features that make the game even more entertaining."
        buttonText="Get Premium Now"
        onEmailSignupClick={openEmailModal}
      />
      
      {/* Email Signup Modal */}
      <EmailSignupModal 
        isOpen={isEmailModalOpen} 
        onClose={closeEmailModal} 
      />
    </>
  );
};

export default Premium;