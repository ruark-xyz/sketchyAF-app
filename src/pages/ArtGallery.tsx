import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import DrawingCard from '../components/ui/DrawingCard';
import BottomCTA from '../components/sections/BottomCTA';
import EmailSignupModal from '../components/ui/EmailSignupModal';
import PageContainer from '../components/layout/PageContainer';
import SectionHeader from '../components/ui/SectionHeader';
import GridContainer from '../components/layout/GridContainer';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import ContentCard from '../components/ui/ContentCard';
import Seo from '../components/utils/Seo';
import { useTopDrawings } from '../hooks/useApi';

const ArtGallery: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const { data: drawings, loading, error, refetch } = useTopDrawings();
  
  const openEmailModal = () => setIsEmailModalOpen(true);
  const closeEmailModal = () => setIsEmailModalOpen(false);

  // Filter drawings based on search term and filter type
  const filteredDrawings = drawings ? drawings
    .filter(drawing => {
      const matchesSearch = drawing.prompt.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           drawing.username.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filterType === 'all') return matchesSearch;
      if (filterType === 'premium') return matchesSearch && drawing.isPremium;
      if (filterType === 'winners') return matchesSearch && drawing.isWinner;
      
      return matchesSearch;
    })
    .sort((a, b) => b.score - a.score) : [];

  return (
    <>
      <Seo 
        title="Art Gallery - Community Masterpieces"
        description="Explore the funniest and most creative drawings from SketchyAF players. Vote for your favorites and see what crazy prompts inspired these masterpieces!"
      />
      
      <PageContainer background="off-white">
        <SectionHeader
          title="Art Gallery"
          subtitle="Explore the most creative, hilarious, and occasionally disturbing masterpieces from our community. Vote for your favorites or get inspired for your next drawing!"
        />
        
        {/* Search and Filter Controls */}
        <div className="mb-8 flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder="Search by prompt or artist..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-light-gray rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-medium-gray" size={18} />
          </div>
          
          <div className="flex items-center gap-3">
            <Filter size={18} className="text-medium-gray" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border-2 border-light-gray rounded-lg py-2 px-3 focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All Artwork</option>
              <option value="premium">Premium Only</option>
              <option value="winners">Contest Winners</option>
              <option value="recent">Most Recent</option>
            </select>
          </div>
        </div>
        
        {loading && (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        )}
        
        {error && (
          <ErrorMessage 
            message={error} 
            onRetry={refetch}
            className="my-8" 
          />
        )}
        
        {filteredDrawings.length > 0 ? (
          <GridContainer
            columns={{ default: 1, sm: 2, lg: 3, xl: 4 }}
            gap="md"
          >
            {filteredDrawings.map((drawing) => (
              <DrawingCard key={drawing.id} drawing={drawing} />
            ))}
          </GridContainer>
        ) : drawings && !loading ? (
          <ContentCard className="text-center py-16">
            <h3 className="font-heading font-bold text-xl mb-3">No artworks found</h3>
            <p className="text-medium-gray">
              We couldn't find any art matching your search criteria. Try adjusting your filters.
            </p>
          </ContentCard>
        ) : null}
        
        {drawings && (
          <div className="mt-10 text-center text-medium-gray">
            <p className="text-sm italic">
              Note: These drawings are placeholders and will be replaced with actual user submissions after launch.
            </p>
          </div>
        )}
      </PageContainer>
      
      <BottomCTA 
        heading="Think You Can Do Better?" 
        subheading="Join the game and show off your artistic skills (or lack thereof)."
        buttonText="Start Drawing Now"
        onEmailSignupClick={openEmailModal}
      />
      
      <EmailSignupModal 
        isOpen={isEmailModalOpen} 
        onClose={closeEmailModal} 
      />
    </>
  );
};

export default ArtGallery;