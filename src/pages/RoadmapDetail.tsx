import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Calendar, Clock, Thermometer, BarChart, Share2, AlertCircle, Info } from 'lucide-react';
import { roadmapItems, roadmapCategories } from '../data/mockData';
import { RoadmapItem } from '../types';
import Button from '../components/ui/Button';
import Seo from '../components/utils/Seo';
import { useAuth } from '../context/AuthContext';

const RoadmapDetail: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const [item, setItem] = useState<RoadmapItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likedItems, setLikedItems] = useState<string[]>([]);
  const navigate = useNavigate();
  const { currentUser, isLoggedIn } = useAuth();
  
  // Get the category color for the item
  const getCategoryColor = (categoryId: string) => {
    const category = roadmapCategories.find(c => c.id === categoryId);
    return category ? category.color : '#121212';
  };
  
  // Get the category name for the item
  const getCategoryName = (categoryId: string) => {
    const category = roadmapCategories.find(c => c.id === categoryId);
    return category ? category.name : 'Uncategorized';
  };
  
  // Fetch item data and check if it's liked
  useEffect(() => {
    // Simulate API call by adding a small delay
    const timer = setTimeout(() => {
      if (itemId) {
        const foundItem = roadmapItems.find(i => i.id === itemId);
        if (foundItem) {
          setItem(foundItem);
        }
        setLoading(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [itemId]);
  
  // Initialize likedItems from localStorage
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      const storedLikes = localStorage.getItem(`roadmap-likes-${currentUser.id}`);
      if (storedLikes) {
        const likes = JSON.parse(storedLikes);
        setLikedItems(likes);
        if (itemId) {
          setIsLiked(likes.includes(itemId));
        }
      }
    }
  }, [isLoggedIn, currentUser, itemId]);
  
  // Handle like/unlike action
  const handleLike = () => {
    if (!isLoggedIn || !currentUser || !itemId) return;
    
    // Toggle the like status
    let updatedLikedItems: string[];
    let updatedItem: RoadmapItem | null = item;
    
    if (isLiked) {
      // Unlike: remove from likedItems and decrement count
      updatedLikedItems = likedItems.filter(id => id !== itemId);
      if (item) {
        updatedItem = { ...item, likes: item.likes - 1 };
      }
    } else {
      // Like: add to likedItems and increment count
      updatedLikedItems = [...likedItems, itemId];
      if (item) {
        updatedItem = { ...item, likes: item.likes + 1 };
      }
    }
    
    setLikedItems(updatedLikedItems);
    setIsLiked(!isLiked);
    setItem(updatedItem);
    
    // Update localStorage
    localStorage.setItem(`roadmap-likes-${currentUser.id}`, JSON.stringify(updatedLikedItems));
  };
  
  // Get status information
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'in-progress':
        return { color: 'bg-primary text-white', label: 'In Progress' };
      case 'completed':
        return { color: 'bg-success text-white', label: 'Completed' };
      case 'delayed':
        return { color: 'bg-warning text-white', label: 'Delayed' };
      case 'planned':
      default:
        return { color: 'bg-secondary text-white', label: 'Planned' };
    }
  };
  
  if (loading) {
    return (
      <div className="py-16 md:py-24 bg-cream min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!item) {
    return (
      <div className="py-16 md:py-24 bg-cream min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="font-heading font-bold text-3xl md:text-4xl text-dark mb-6">Feature Not Found</h1>
            <p className="text-medium-gray text-lg mb-8">The feature you're looking for doesn't exist or has been removed.</p>
            <Button variant="primary" to="/roadmap">
              Back to Roadmap
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  const statusInfo = getStatusInfo(item.status);
  const categoryColor = getCategoryColor(item.category);
  const categoryName = getCategoryName(item.category);

  return (
    <>
      <Seo 
        title={`${item.title} | Roadmap`}
        description={item.description}
        ogImage={item.image}
      />
      
      <div className="py-16 md:py-24 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <div className="mb-6">
            <Button 
              variant="tertiary" 
              to="/roadmap" 
              className="inline-flex items-center text-dark-gray"
            >
              <ArrowLeft size={20} className="mr-2" />
              <span>Back to Roadmap</span>
            </Button>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg overflow-hidden border-2 border-dark hand-drawn shadow-lg mb-8"
          >
            {/* Feature Image */}
            <div className="h-64 md:h-96 w-full relative">
              <img 
                src={item.image} 
                alt={item.title} 
                className="w-full h-full object-cover"
              />
              
              {/* Feature Status */}
              <div className="absolute top-4 left-4 z-10">
                <div className={`px-4 py-2 rounded-full text-sm font-heading font-bold ${statusInfo.color} border-2 border-dark shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] hand-drawn`}>
                  {statusInfo.label}
                </div>
              </div>
              
              {/* Category Badge */}
              <div 
                className="absolute bottom-4 right-4 px-4 py-2 rounded-full text-sm font-heading font-bold text-dark border-2 border-dark shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] hand-drawn"
                style={{ backgroundColor: `${categoryColor}40` }}
              >
                {categoryName}
              </div>
            </div>
            
            {/* Feature Content */}
            <div className="p-6 md:p-8">
              <h1 className="font-heading font-bold text-3xl md:text-4xl text-dark mb-4">
                {item.title}
              </h1>
              
              {/* Feature Meta */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center text-medium-gray">
                  <Calendar size={18} className="mr-2" />
                  <span>Target: {item.targetQuarter} {item.targetYear}</span>
                </div>
                
                <div className="flex items-center text-medium-gray">
                  <Clock size={18} className="mr-2" />
                  <span>Status: {statusInfo.label}</span>
                </div>
                
                <div className="flex items-center text-medium-gray">
                  <Thermometer size={18} className="mr-2" />
                  <span>Interest: {item.likes > 200 ? "High" : item.likes > 100 ? "Medium" : "Low"}</span>
                </div>
              </div>
              
              <p className="text-dark-gray text-lg mb-8">
                {item.description}
              </p>
              
              {/* Like and Share Section */}
              <div className="flex flex-wrap justify-between items-center pt-4 border-t border-light-gray">
                <div>
                  <button
                    onClick={handleLike}
                    disabled={!isLoggedIn}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                      isLiked 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-off-white text-medium-gray hover:bg-primary/5 hover:text-primary'
                    } transition-colors ${!isLoggedIn ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    aria-label={isLiked ? "Unlike this feature" : "Like this feature"}
                  >
                    <Heart size={20} className={isLiked ? "fill-primary text-primary" : ""} />
                    <span className="font-medium">{item.likes.toLocaleString()}</span>
                  </button>
                  
                  {!isLoggedIn && (
                    <p className="text-xs text-medium-gray mt-2">
                      <Link to="/login" className="text-primary hover:underline">Log in</Link> to vote
                    </p>
                  )}
                </div>
                
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-off-white text-medium-gray hover:bg-primary/5 hover:text-primary transition-colors"
                  aria-label="Share this feature"
                >
                  <Share2 size={20} />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </motion.div>
          
          {/* Additional sections could be added here */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-off-white rounded-lg overflow-hidden border-2 border-dark hand-drawn p-6 md:p-8"
          >
            <div className="flex items-start gap-4">
              <BarChart size={24} className="text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="font-heading font-bold text-2xl mb-3">Feature Progress</h2>
                <p className="text-medium-gray mb-4">
                  This feature is currently in the <strong>{statusInfo.label.toLowerCase()}</strong> phase.
                  We'll update this page as development progresses.
                </p>
                
                {/* Progress bar (simplified) */}
                <div className="w-full bg-light-gray rounded-full h-4 mb-6">
                  <div 
                    className="bg-primary h-4 rounded-full"
                    style={{ 
                      width: item.status === 'completed' ? '100%' : 
                             item.status === 'in-progress' ? '50%' : 
                             item.status === 'planned' ? '10%' : '25%' 
                    }}
                  ></div>
                </div>
                
                {/* Conditional message based on status */}
                {item.status === 'in-progress' && (
                  <div className="bg-primary/10 p-4 rounded-lg border border-primary flex items-start">
                    <AlertCircle size={20} className="text-primary mr-3 flex-shrink-0 mt-1" />
                    <p className="text-dark-gray">
                      Our team is actively working on this feature. We expect to release it in {item.targetQuarter} {item.targetYear}.
                    </p>
                  </div>
                )}
                
                {item.status === 'planned' && (
                  <div className="bg-secondary/10 p-4 rounded-lg border border-secondary flex items-start">
                    <Info size={20} className="text-secondary mr-3 flex-shrink-0 mt-1" />
                    <p className="text-dark-gray">
                      This feature is currently in the planning phase. Development is scheduled to begin soon.
                    </p>
                  </div>
                )}
                
                {item.status === 'completed' && (
                  <div className="bg-success/10 p-4 rounded-lg border border-success flex items-start">
                    <AlertCircle size={20} className="text-success mr-3 flex-shrink-0 mt-1" />
                    <p className="text-dark-gray">
                      This feature has been completed and is now available in the app!
                    </p>
                  </div>
                )}
                
                {item.status === 'delayed' && (
                  <div className="bg-warning/10 p-4 rounded-lg border border-warning flex items-start">
                    <AlertCircle size={20} className="text-warning mr-3 flex-shrink-0 mt-1" />
                    <p className="text-dark-gray">
                      This feature has been delayed. We'll provide more information soon.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          
          {/* Feedback section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 text-center"
          >
            <h2 className="font-heading font-bold text-2xl mb-4">Have Feedback on This Feature?</h2>
            <p className="text-medium-gray mb-6">
              We'd love to hear your thoughts or suggestions for this feature!
            </p>
            <Button variant="primary" to="#">
              Submit Feedback
            </Button>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default RoadmapDetail;