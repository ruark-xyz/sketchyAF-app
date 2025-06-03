import React from 'react';
import { motion } from 'framer-motion';
import LeaderboardTable from '../components/ui/LeaderboardTable';
import Button from '../components/ui/Button';
import BottomCTA from '../components/sections/BottomCTA';
import Seo from '../components/utils/Seo';
import { leaderboardData } from '../data/mockData';

const Leaderboard: React.FC = () => {
  return (
    <>
      <Seo 
        title="Leaderboard - Top Players"
        description="Check out the top SketchyAF players and their scores. Join the competition and see if you can make it to the top of our leaderboard!"
      />
      
      <section className="py-16 md:py-24 bg-off-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 md:mb-16"
          >
            <h1 className="font-heading font-bold text-3xl md:text-5xl text-dark mb-4">
              SketchyAF Leaderboard (Example)
            </h1>
            <p className="text-medium-gray text-lg max-w-2xl mx-auto">
              This is an example of how our leaderboard will look when the game launches.
              Soon these will be real players with real (but probably terrible) drawings!
            </p>
          </motion.div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
              <h2 className="font-heading font-semibold text-2xl">Top Players</h2>
              <div className="flex gap-2">
                <Button variant="tertiary" className="text-sm">Weekly</Button>
                <Button variant="tertiary" className="text-sm">Monthly</Button>
                <Button variant="tertiary" className="text-sm font-bold">All Time</Button>
              </div>
            </div>
            
            <LeaderboardTable entries={leaderboardData} />
            
            <div className="mt-8 text-center">
              <p className="text-medium-gray mb-4">
                When we launch, you'll be able to compete against these artistic geniuses!
              </p>
              <Button variant="primary" to="/#email-signup">
                Join a Game & Prove It
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      <BottomCTA 
        heading="Ready to Join the Ranks?" 
        subheading="Your terrible drawing skills could earn you a spot on this prestigious leaderboard."
        buttonText="Start Drawing Now"
        buttonLink="/#email-signup"
        isExternalLink={false}
      />
    </>
  );
};

export default Leaderboard;