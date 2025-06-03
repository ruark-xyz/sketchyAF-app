import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Users, BarChart, Award, Star, Download, Globe, ExternalLink } from 'lucide-react';
import Button from '../components/ui/Button';
import Seo from '../components/utils/Seo';
import { boosterPacks } from '../data/mockData';
import { BoosterPack } from '../types';

const BoosterPackDetail: React.FC = () => {
  const { packId } = useParams<{ packId: string }>();
  const [pack, setPack] = useState<BoosterPack | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // In a real app, this would be an API call
    const foundPack = boosterPacks.find(p => p.id === packId);
    setPack(foundPack || null);
    setLoading(false);
  }, [packId]);
  
  if (loading) {
    return (
      <div className="py-16 md:py-24 bg-cream min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!pack) {
    return (
      <div className="py-16 md:py-24 bg-cream min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-heading font-bold text-3xl md:text-4xl text-dark mb-6">Pack Not Found</h1>
          <p className="text-medium-gray text-lg mb-8">The booster pack you're looking for doesn't exist or has been removed.</p>
          <Button variant="primary" to="/premium">
            Back to Booster Packs
          </Button>
        </div>
      </div>
    );
  }
  
  // Determine badge color based on pack type
  const getPriceBadgeColor = (type: string) => {
    switch (type) {
      case 'premium':
        return 'bg-primary text-white';
      case 'paid':
        return 'bg-secondary text-white';
      case 'free':
      default:
        return 'bg-success text-white';
    }
  };
  
  // Fake statistics for the pack (in a real app, these would come from the backend)
  const packStats = {
    usageCount: Math.floor(Math.random() * 100000) + 50000,
    userCount: Math.floor(Math.random() * 50000) + 10000,
    avgRating: (Math.random() * 2 + 3).toFixed(1), // Random between 3.0 and 5.0
    topArtists: [
      "SketchLord",
      "ArtisticTroll",
      "DrawMaster64",
      "PencilPusher"
    ]
  };

  return (
    <>
      <Seo 
        title={`${pack.name} Booster Pack`}
        description={pack.description}
      />
      
      <div className="py-16 md:py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <div className="mb-6">
            <Link 
              to="/premium" 
              className="inline-flex items-center text-dark-gray hover:text-primary transition-colors"
            >
              <ChevronLeft size={20} className="mr-1" />
              <span>Back to All Packs</span>
            </Link>
          </div>
          
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-dark hand-drawn mb-12"
          >
            <div className="md:flex">
              <div className="md:w-1/3">
                <img 
                  src={pack.image} 
                  alt={pack.name} 
                  className="w-full h-64 md:h-full object-cover"
                />
              </div>
              <div className="md:w-2/3 p-6 md:p-8">
                <div className="flex justify-between items-center mb-2">
                  <h1 className="font-heading font-bold text-3xl md:text-4xl text-dark">{pack.name}</h1>
                  <span className={`px-4 py-1 text-sm font-semibold rounded-full ${getPriceBadgeColor(pack.type)}`}>
                    {pack.price}
                  </span>
                </div>
                
                <p className="text-medium-gray text-lg mb-6">{pack.description}</p>
                
                {/* Feature Badges */}
                {pack.badges && pack.badges.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {pack.badges.map(badge => {
                      let badgeColor;
                      switch(badge.type) {
                        case 'subscriber-perk':
                          badgeColor = 'bg-turquoise text-dark';
                          break;
                        case 'new':
                          badgeColor = 'bg-green text-dark';
                          break;
                        case 'promotion':
                          badgeColor = 'bg-orange text-dark';
                          break;
                        case 'limited-time':
                          badgeColor = 'bg-pink text-dark';
                          break;
                        case 'partner':
                          badgeColor = 'bg-purple text-white';
                          break;
                        default:
                          badgeColor = 'bg-accent text-dark';
                      }
                      
                      return (
                        <span 
                          key={badge.text} 
                          className={`${badgeColor} px-3 py-1 text-xs font-heading font-bold rounded-full border-2 border-dark shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] hand-drawn`}
                        >
                          {badge.text}
                        </span>
                      );
                    })}
                  </div>
                )}
                
                {/* CTA Button */}
                <div>
                  {pack.type === 'premium' ? (
                    <Button variant="primary\" to="/premium">
                      Become Premium AF
                    </Button>
                  ) : pack.type === 'paid' ? (
                    <Button variant="primary" href="#">
                      Buy for {pack.price}
                    </Button>
                  ) : (
                    <Button variant="primary" href="#">
                      Add to My Collection
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Partner Section (only shown if partner curated) */}
          {pack.isPartnerCurated && pack.partnerInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-dark hand-drawn mb-12"
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center mb-6">
                  <Award size={24} className="mr-3 text-purple" />
                  <h2 className="font-heading font-bold text-2xl text-dark">Partner Curated Pack</h2>
                </div>
                
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="md:w-1/4 flex justify-center">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple">
                      <img 
                        src={pack.partnerInfo.logo} 
                        alt={pack.partnerInfo.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  
                  <div className="md:w-3/4">
                    <h3 className="font-heading font-bold text-xl mb-2">
                      Curated by {pack.partnerInfo.name}
                    </h3>
                    <p className="text-medium-gray mb-4">
                      {pack.partnerInfo.description}
                    </p>
                    
                    {pack.partnerInfo.website && (
                      <a 
                        href={pack.partnerInfo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-purple hover:underline"
                      >
                        <Globe size={16} className="mr-1" />
                        Visit {pack.partnerInfo.name}
                        <ExternalLink size={14} className="ml-1" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Pack Contents */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-dark hand-drawn mb-12"
          >
            <div className="p-6 md:p-8">
              <h2 className="font-heading font-bold text-2xl mb-6 text-dark">Pack Contents</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pack.items.map((item, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-off-white rounded-md p-4 text-center shadow-sm border border-light-gray"
                  >
                    <p className="font-medium">{item}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
          
          {/* Global Usage Statistics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-dark hand-drawn mb-12"
          >
            <div className="p-6 md:p-8">
              <h2 className="font-heading font-bold text-2xl mb-6 text-dark">Global Usage Statistics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-primary/10 p-4 rounded-lg flex items-center">
                  <div className="mr-4 bg-primary/20 p-3 rounded-full">
                    <Download size={24} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-medium-gray">Total Uses</p>
                    <p className="font-heading font-bold text-xl">{packStats.usageCount.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="bg-secondary/10 p-4 rounded-lg flex items-center">
                  <div className="mr-4 bg-secondary/20 p-3 rounded-full">
                    <Users size={24} className="text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-medium-gray">Unique Users</p>
                    <p className="font-heading font-bold text-xl">{packStats.userCount.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="bg-accent/10 p-4 rounded-lg flex items-center">
                  <div className="mr-4 bg-accent/20 p-3 rounded-full">
                    <Star size={24} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-medium-gray">Average Rating</p>
                    <p className="font-heading font-bold text-xl">{packStats.avgRating}/5</p>
                  </div>
                </div>
                
                <div className="bg-green/10 p-4 rounded-lg flex items-center">
                  <div className="mr-4 bg-green/20 p-3 rounded-full">
                    <Award size={24} className="text-green" />
                  </div>
                  <div>
                    <p className="text-sm text-medium-gray">Winners Created</p>
                    <p className="font-heading font-bold text-xl">{Math.floor(packStats.usageCount * 0.15).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Top Artists */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-dark hand-drawn mb-12"
          >
            <div className="p-6 md:p-8">
              <h2 className="font-heading font-bold text-2xl mb-6 text-dark">Top Artists Using This Pack</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {packStats.topArtists.map((artist, index) => (
                  <div 
                    key={artist} 
                    className="flex items-center p-4 border border-light-gray rounded-lg"
                  >
                    <div className="mr-4 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-heading font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <Link 
                        to={`/user/${artist}`}
                        className="font-heading font-bold text-lg hover:text-primary transition-colors"
                      >
                        {artist}
                      </Link>
                      <p className="text-sm text-medium-gray">
                        {Math.floor(Math.random() * 500) + 100} pack uses
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          
          {/* Usage Over Time Chart (Placeholder) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-dark hand-drawn"
          >
            <div className="p-6 md:p-8">
              <div className="flex items-center mb-6">
                <BarChart size={24} className="mr-3 text-dark" />
                <h2 className="font-heading font-bold text-2xl text-dark">Usage Trend</h2>
              </div>
              
              {/* Placeholder for chart */}
              <div className="h-64 bg-off-white rounded-lg flex items-center justify-center border border-light-gray">
                <p className="text-medium-gray text-lg">Chart visualization of pack usage over time will appear here</p>
              </div>
              
              <p className="mt-4 text-sm text-medium-gray italic">
                Note: This is a placeholder for a usage trend chart that would be implemented with a charting library like Chart.js or Recharts in the actual application.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default BoosterPackDetail;