import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Heart, MessageSquare, Share2, Award, Calendar, Star, Package, Layers, UserCircle, Send, Trophy } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Seo from '../components/utils/Seo';
import { topDrawingsData, boosterPacks } from '../data/mockData';
import { TopDrawing, BoosterPack } from '../types';
import { useAuth } from '../context/AuthContext';

const ArtDetail: React.FC = () => {
  const { drawingId } = useParams<{ drawingId: string }>();
  const [drawing, setDrawing] = useState<TopDrawing | null>(null);
  const [loading, setLoading] = useState(true);
  const [likedByUser, setLikedByUser] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [userBoosterPacks, setUserBoosterPacks] = useState<BoosterPack[]>([]);
  const { isLoggedIn } = useAuth();
  
  // For demo purposes only - in a real app, these would come from an API
  const [comments] = useState<{id: number, username: string, avatar: string, text: string, date: string}[]>([
    {
      id: 1,
      username: "ArtisticTroll",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
      text: "This is absolutely hilarious! I'm dying laughing at the expression on that raccoon's face. Pure gold!",
      date: "2025-04-23"
    },
    {
      id: 2,
      username: "DoodleQueen",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
      text: "I can't believe you won with this! 😂 I'm both impressed and concerned.",
      date: "2025-04-23"
    },
    {
      id: 3,
      username: "PencilPusher",
      avatar: "https://randomuser.me/api/portraits/men/15.jpg",
      text: "The color choices are... interesting. Teach me your ways!",
      date: "2025-04-24"
    }
  ]);
  
  useEffect(() => {
    // In a real app, this would be an API call
    if (drawingId) {
      const id = parseInt(drawingId);
      const foundDrawing = topDrawingsData.find(d => d.id === id);
      setDrawing(foundDrawing || null);
      
      // Fetch booster packs used in this drawing
      if (foundDrawing && foundDrawing.boosterPacksUsed) {
        const packs = boosterPacks.filter(pack => 
          foundDrawing.boosterPacksUsed.includes(pack.id)
        );
        setUserBoosterPacks(packs);
      }
      
      setLoading(false);
    }
  }, [drawingId]);
  
  const handleLikeToggle = () => {
    if (isLoggedIn) {
      setLikedByUser(!likedByUser);
      // In a real app, this would make an API call to update the like status
    } else {
      // Prompt to log in - could show a modal or redirect
      alert("Please log in to like artworks");
    }
  };
  
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    // In a real app, this would make an API call to submit the comment
    console.log("Submitting comment:", commentText);
    
    // Clear the input
    setCommentText('');
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric' 
    });
  };
  
  if (loading) {
    return (
      <div className="py-16 md:py-24 bg-cream min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!drawing) {
    return (
      <div className="py-16 md:py-24 bg-cream min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-heading font-bold text-3xl md:text-4xl text-dark mb-6">Artwork Not Found</h1>
          <p className="text-medium-gray text-lg mb-8">The artwork you're looking for doesn't exist or has been removed.</p>
          <Button variant="primary" to="/art">
            Back to Art Gallery
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Seo 
        title={`"${drawing.prompt}" by ${drawing.username}`}
        description={`View "${drawing.prompt}" - a SketchyAF artwork created by ${drawing.username} with ${drawing.score.toLocaleString()} votes.`}
        ogImage={drawing.drawingUrl}
      />
      
      <div className="py-16 md:py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <div className="mb-6">
            <Link 
              to="/art" 
              className="inline-flex items-center text-dark-gray hover:text-primary transition-colors"
            >
              <ChevronLeft size={20} className="mr-1" />
              <span>Back to Gallery</span>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-dark hand-drawn mb-8"
              >
                {/* Drawing */}
                <div className="relative">
                  {drawing.isWinner && (
                    <div className="absolute top-4 left-4 z-10 bg-accent text-dark px-3 py-1 rounded-full text-xs font-heading font-bold flex items-center space-x-1 border-2 border-dark shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] hand-drawn">
                      <Trophy size={12} className="mr-1" />
                      <span>Winner!</span>
                    </div>
                  )}
                  
                  {drawing.isPremium && (
                    <div className="absolute top-4 right-4 z-10 bg-primary text-white px-3 py-1 rounded-full text-xs font-heading font-bold flex items-center space-x-1 border-2 border-dark shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] hand-drawn">
                      <Star size={12} className="mr-1" />
                      <span>Premium</span>
                    </div>
                  )}
                  
                  <img 
                    src={drawing.drawingUrl} 
                    alt={`Drawing of ${drawing.prompt}`}
                    className="w-full object-contain max-h-[600px]"
                  />
                </div>
                
                <div className="p-6">
                  {/* Prompt and metadata */}
                  <h1 className="font-heading font-bold text-2xl md:text-3xl text-dark mb-4">
                    "{drawing.prompt}"
                  </h1>
                  
                  <div className="flex justify-between items-center mb-6">
                    <Link 
                      to={`/user/${drawing.username}`}
                      className="flex items-center group"
                    >
                      <UserCircle size={24} className="mr-2 text-primary" />
                      <span className="font-heading font-semibold group-hover:text-primary transition-colors">{drawing.username}</span>
                    </Link>
                    
                    <div className="flex items-center text-medium-gray">
                      <Calendar size={18} className="mr-1" />
                      <span>{formatDate(drawing.date)}</span>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button 
                      className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                        likedByUser 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-off-white text-medium-gray hover:bg-primary/5 hover:text-primary'
                      } transition-colors`}
                      onClick={handleLikeToggle}
                    >
                      <Heart size={18} className={likedByUser ? "fill-primary text-primary" : ""} />
                      <span>{(likedByUser ? drawing.score + 1 : drawing.score).toLocaleString()}</span>
                    </button>
                    
                    <button 
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-off-white text-medium-gray hover:bg-primary/5 hover:text-primary transition-colors"
                      onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      <MessageSquare size={18} />
                      <span>{comments.length}</span>
                    </button>
                    
                    <button 
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-off-white text-medium-gray hover:bg-primary/5 hover:text-primary transition-colors ml-auto"
                    >
                      <Share2 size={18} />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              </motion.div>
              
              {/* Comments Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-dark hand-drawn"
                id="comments-section"
              >
                <div className="p-6">
                  <h2 className="font-heading font-bold text-2xl mb-6 flex items-center">
                    <MessageSquare size={20} className="mr-2 text-accent" />
                    Comments
                  </h2>
                  
                  {/* Comment form */}
                  {isLoggedIn ? (
                    <form onSubmit={handleSubmitComment} className="mb-8">
                      <div className="flex gap-3">
                        <Input
                          name="comment"
                          placeholder="Add a comment..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          wrapperClassName="flex-grow"
                        />
                        <Button 
                          type="submit" 
                          variant="primary" 
                          disabled={!commentText.trim()}
                        >
                          <Send size={18} />
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="bg-off-white p-4 rounded-lg mb-8 text-center">
                      <p className="mb-2">Log in to leave a comment</p>
                      <Button variant="secondary" size="sm" to="/login">
                        Log In
                      </Button>
                    </div>
                  )}
                  
                  {/* Comments list */}
                  <div className="space-y-6">
                    {comments.map(comment => (
                      <div key={comment.id} className="border-b border-light-gray pb-4 last:border-0 last:pb-0">
                        <div className="flex items-start">
                          <img 
                            src={comment.avatar} 
                            alt={comment.username}
                            className="w-10 h-10 rounded-full mr-3"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <Link 
                                to={`/user/${comment.username}`}
                                className="font-heading font-semibold hover:text-primary transition-colors"
                              >
                                {comment.username}
                              </Link>
                              <span className="text-sm text-medium-gray">
                                {formatDate(comment.date)}
                              </span>
                            </div>
                            <p className="text-dark-gray">{comment.text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* Sidebar */}
            <div className="space-y-8">
              {/* Creation details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-dark hand-drawn"
              >
                <div className="p-6">
                  <h2 className="font-heading font-bold text-xl mb-4">Creation Details</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-medium-gray">
                        <Award size={18} className="mr-2" />
                        <span>Contest Placement</span>
                      </div>
                      <span className="font-semibold">
                        {drawing.isWinner ? '1st Place' : 'Participant'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-medium-gray">
                        <Heart size={18} className="mr-2" />
                        <span>Votes Received</span>
                      </div>
                      <span className="font-semibold">{drawing.score.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-medium-gray">
                        <Layers size={18} className="mr-2" />
                        <span>Layers Used</span>
                      </div>
                      <span className="font-semibold">{drawing.layersUsed || 'N/A'}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-medium-gray">
                        <Calendar size={18} className="mr-2" />
                        <span>Created On</span>
                      </div>
                      <span className="font-semibold">{formatDate(drawing.date)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* Booster packs used */}
              {userBoosterPacks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-dark hand-drawn"
                >
                  <div className="p-6">
                    <h2 className="font-heading font-bold text-xl mb-4 flex items-center">
                      <Package size={18} className="mr-2 text-accent" />
                      Booster Packs Used
                    </h2>
                    
                    <div className="space-y-4">
                      {userBoosterPacks.map(pack => (
                        <Link 
                          key={pack.id}
                          to={`/booster-packs/${pack.id}`}
                          className="flex items-center p-3 border border-light-gray rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                          <img 
                            src={pack.image} 
                            alt={pack.name}
                            className="w-12 h-12 object-cover rounded-md mr-3"
                          />
                          <div>
                            <h3 className="font-heading font-semibold">{pack.name}</h3>
                            <p className="text-xs text-medium-gray">{pack.price}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Similar Artworks - Placeholder */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-dark hand-drawn"
              >
                <div className="p-6">
                  <h2 className="font-heading font-bold text-xl mb-4">Similar Artworks</h2>
                  
                  <p className="text-medium-gray text-center py-4">
                    Similar artworks will be shown here based on prompt, style, and packs used.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ArtDetail;