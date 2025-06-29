import React, { useRef, useState, useEffect } from 'react';
import PremiumHero from '../components/sections/PremiumHero';
import PricingSection from '../components/sections/PricingSection';
import BoosterPacksGrid from '../components/sections/BoosterPacksGrid';
import BottomCTA from '../components/sections/BottomCTA';
import EmailSignupModal from '../components/ui/EmailSignupModal';
import Seo from '../components/utils/Seo';
import { subscriptionBenefits } from '../data/mockData';
import { BoosterPackService } from '../services/BoosterPackService';
import { transformBoosterPackForUI } from '../utils/boosterPackAdapter';
import { LegacyBoosterPack } from '../types';

const Premium: React.FC = () => {
  const boosterPacksRef = useRef<HTMLDivElement>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [boosterPacks, setBoosterPacks] = useState<LegacyBoosterPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const openEmailModal = () => setIsEmailModalOpen(true);
  const closeEmailModal = () => setIsEmailModalOpen(false);
  
  const scrollToBoosterPacks = () => {
    if (boosterPacksRef.current) {
      boosterPacksRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Fetch booster packs from database
  useEffect(() => {
    const fetchBoosterPacks = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await BoosterPackService.getAllPacks();

        if (response.success && response.data) {
          // Transform database packs to legacy UI format
          const transformedPacks = response.data.map(pack => transformBoosterPackForUI(pack));
          setBoosterPacks(transformedPacks);
        } else {
          setError(response.error || 'Failed to load booster packs');
        }
      } catch (err) {
        console.error('Error fetching booster packs:', err);
        setError('An unexpected error occurred while loading booster packs');
      } finally {
        setLoading(false);
      }
    };

    fetchBoosterPacks();
  }, []);
  
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
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-medium-gray text-lg">Loading booster packs...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red/10 border border-red text-red p-6 rounded-lg max-w-md mx-auto">
                <h3 className="font-heading font-bold text-lg mb-2">Failed to Load Packs</h3>
                <p className="text-sm">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-red text-white rounded-lg hover:bg-red/80 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : boosterPacks.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-off-white border-2 border-light-gray rounded-lg p-8 max-w-md mx-auto">
                <h3 className="font-heading font-bold text-lg text-dark mb-2">No Packs Available</h3>
                <p className="text-medium-gray">No booster packs are currently available.</p>
              </div>
            </div>
          ) : (
            <BoosterPacksGrid packs={boosterPacks} />
          )}
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