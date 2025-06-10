import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Filter, Info } from 'lucide-react';
import { RoadmapItem } from '../types';
import { roadmapItems, roadmapCategories } from '../data/mockData';
import RoadmapItemCard from '../components/ui/RoadmapItemCard';
import Button from '../components/ui/Button';
import Seo from '../components/utils/Seo';
import { useAuth } from '../context/AuthContext';

const Roadmap: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [items, setItems] = useState<RoadmapItem[]>(roadmapItems);
  const [likedItems, setLikedItems] = useState<string[]>([]);
  const { currentUser, isLoggedIn } = useAuth();
  
  // Initialize likedItems from localStorage
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      const storedLikes = localStorage.getItem(`roadmap-likes-${currentUser.id}`);
      if (storedLikes) {
        setLikedItems(JSON.parse(storedLikes));
      }
    }
  }, [isLoggedIn, currentUser]);
  
  // Update localStorage whenever likedItems changes
  useEffect(() => {
    if (isLoggedIn && currentUser && likedItems.length > 0) {
      localStorage.setItem(`roadmap-likes-${currentUser.id}`, JSON.stringify(likedItems));
    }
  }, [likedItems, isLoggedIn, currentUser]);
  
  // Filter items based on active category and status
  useEffect(() => {
    let filteredItems = [...roadmapItems];
    
    // Apply category filter
    if (activeCategory !== 'all') {
      filteredItems = filteredItems.filter(item => item.category === activeCategory);
    }
    
    // Apply status filter
    if (activeStatus !== 'all') {
      filteredItems = filteredItems.filter(item => item.status === activeStatus);
    }
    
    setItems(filteredItems);
  }, [activeCategory, activeStatus]);
  
  // Handle like/unlike action
  const handleLike = (itemId: string) => {
    if (!isLoggedIn || !currentUser) return;
    
    // Toggle the like status for this item
    const isLiked = likedItems.includes(itemId);
    let updatedLikedItems: string[];
    
    if (isLiked) {
      // Unlike: remove from likedItems and decrement count
      updatedLikedItems = likedItems.filter(id => id !== itemId);
      
      // Update the items array
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { ...item, likes: item.likes - 1 } 
            : item
        )
      );
    } else {
      // Like: add to likedItems and increment count
      updatedLikedItems = [...likedItems, itemId];
      
      // Update the items array
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { ...item, likes: item.likes + 1 } 
            : item
        )
      );
    }
    
    setLikedItems(updatedLikedItems);
  };
  
  // Check if an item is liked by the current user
  const isItemLiked = (itemId: string) => {
    return likedItems.includes(itemId);
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1 
      } 
    }
  };
  
  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };
  
  return (
    <>
      <Seo 
        title="Feature Roadmap"
        description="Explore our upcoming features and improvements planned for SketchyAF. Vote for the features you're most excited about!"
      />
      
      <section className="py-16 md:py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="font-heading font-bold text-3xl md:text-5xl text-dark mb-4 transform rotate-[-1deg]">
              Our Roadmap
            </h1>
            <p className="text-dark text-xl font-body max-w-3xl mx-auto">
              Check out what we're planning to build next! Click the heart icon on features 
              you're excited about to help us prioritize our development.
            </p>
          </motion.div>
          
          {/* Login prompt for non-logged-in users - DISABLED FOR LAUNCH */}
          {!isLoggedIn && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-primary/10 border-2 border-primary rounded-lg p-4 mb-8 flex items-start"
            >
              <Info size={20} className="text-primary mr-3 flex-shrink-0 mt-1" />
              <div>
                <p className="font-heading font-semibold text-dark">Want to vote on features?</p>
                <p className="text-medium-gray mb-3">Feature voting is coming soon! We're working on the full SketchyAF experience.</p>
                <div className="flex gap-2">
                  <div className="bg-accent/20 px-3 py-1 rounded-full border border-accent">
                    <span className="text-sm font-heading font-bold text-dark">
                      🚀 Login & Voting Coming Soon!
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Filters */}
          <div className="mb-8 flex flex-wrap gap-4 justify-between">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-4 py-2 rounded-full text-sm font-heading font-semibold border-2 transition-colors ${
                  activeCategory === 'all' 
                    ? 'bg-dark text-white border-dark' 
                    : 'bg-transparent text-dark-gray border-dark-gray hover:border-dark'
                }`}
              >
                All Categories
              </button>
              
              {roadmapCategories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-heading font-semibold border-2 transition-colors ${
                    activeCategory === category.id 
                      ? 'border-dark bg-white text-dark' 
                      : 'bg-transparent text-dark-gray border-dark-gray hover:border-dark'
                  }`}
                  style={{ 
                    backgroundColor: activeCategory === category.id ? `${category.color}20` : '',
                    borderColor: activeCategory === category.id ? category.color : ''
                  }}
                >
                  {category.name}
                </button>
              ))}
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-medium-gray" />
              <select
                value={activeStatus}
                onChange={(e) => setActiveStatus(e.target.value)}
                className="border-2 border-light-gray rounded-lg py-2 px-3 focus:border-primary focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All Statuses</option>
                <option value="planned">Planned</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>
          </div>
          
          {/* Roadmap Grid */}
          {items.length > 0 ? (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {items.map(item => (
                <motion.div 
                  key={item.id} 
                  variants={itemVariants}
                >
                  <RoadmapItemCard 
                    item={item}
                    onLike={handleLike}
                    isLiked={isItemLiked(item.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="bg-white p-16 rounded-lg shadow-md text-center border-2 border-dark hand-drawn">
              <h3 className="font-heading font-bold text-xl mb-3">No features found</h3>
              <p className="text-medium-gray">
                We couldn't find any features matching your selected filters. Try changing your filters.
              </p>
            </div>
          )}
          
          <div className="mt-12 p-6 bg-off-white rounded-lg border-2 border-dark hand-drawn">
            <h2 className="font-heading font-bold text-2xl mb-4">Have a Feature Request?</h2>
            <p className="text-medium-gray mb-4">
              We're always looking for new ideas to make SketchyAF even better! If you have a feature you'd
              like to see that's not on our roadmap, let us know.
            </p>
            <Button variant="primary" to="#">
              Submit a Feature Request
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Roadmap;