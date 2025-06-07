import React, { useState } from 'react';
import LeaderboardTable from '../components/ui/LeaderboardTable';
import BottomCTA from '../components/sections/BottomCTA';
import EmailSignupModal from '../components/ui/EmailSignupModal';
import PageContainer from '../components/layout/PageContainer';
import SectionHeader from '../components/ui/SectionHeader';
import ContentCard from '../components/ui/ContentCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import Button from '../components/ui/Button';
import Seo from '../components/utils/Seo';
import { useLeaderboard } from '../hooks/useApi';

const Leaderboard: React.FC = () => {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const { data: leaderboardData, loading, error, refetch } = useLeaderboard();
  
  const openEmailModal = () => setIsEmailModalOpen(true);
  const closeEmailModal = () => setIsEmailModalOpen(false);

  return (
    <>
      <Seo 
        title="Leaderboard - Top Players"
        description="Check out the top SketchyAF players and their scores. Join the competition and see if you can make it to the top of our leaderboard!"
      />
      
      <PageContainer>
        <SectionHeader
          title="SketchyAF Leaderboard (Example)"
          subtitle="This is an example of how our leaderboard will look when the game launches. Soon these will be real players with real (but probably terrible) drawings!"
        />
        
        <ContentCard>
          <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
            <h2 className="font-heading font-semibold text-2xl">Top Players</h2>
            <div className="flex gap-2">
              <Button variant="tertiary" className="text-sm">Weekly</Button>
              <Button variant="tertiary" className="text-sm">Monthly</Button>
              <Button variant="tertiary" className="text-sm font-bold">All Time</Button>
            </div>
          </div>
          
          {loading && (
            <div className="flex justify-center py-12">
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
          
          {leaderboardData && (
            <>
              <LeaderboardTable entries={leaderboardData} />
              
              <div className="mt-8 text-center">
                <p className="text-medium-gray mb-4">
                  When we launch, you'll be able to compete against these artistic geniuses!
                </p>
                <Button variant="primary" onClick={openEmailModal}>
                  Join a Game & Prove It
                </Button>
              </div>
            </>
          )}
        </ContentCard>
      </PageContainer>
      
      <BottomCTA 
        heading="Ready to Join the Ranks?" 
        subheading="Your terrible drawing skills could earn you a spot on this prestigious leaderboard."
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

export default Leaderboard;