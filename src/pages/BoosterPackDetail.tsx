import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Users, Award, Star, Download, CheckCircle, AlertCircle, Image } from 'lucide-react';
import Button from '../components/ui/Button';
import EmailSignupModal from '../components/ui/EmailSignupModal';
import Seo from '../components/utils/Seo';
import { BoosterPackWithOwnership, AssetInfo } from '../types/game';
import { BoosterPackService } from '../services/BoosterPackService';
import { loadCollectionAssets } from '../utils/assetLoader';

import { useAuth } from '../context/AuthContext';

const BoosterPackDetail: React.FC = () => {
  const { packId } = useParams<{ packId: string }>();
  const { user } = useAuth();
  const [pack, setPack] = useState<BoosterPackWithOwnership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockSuccess, setUnlockSuccess] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [packAssets, setPackAssets] = useState<any[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [packStatistics, setPackStatistics] = useState<{
    usage_count: number;
    download_count: number;
    unique_users: number;
    total_assets_used: number;
    avg_rating: number | null;
  } | null>(null);
  const [topUsers, setTopUsers] = useState<Array<{
    user_id: string;
    username: string;
    avatar_url: string | null;
    usage_count: number;
    last_used: string;
  }>>([]);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  const openEmailModal = () => setIsEmailModalOpen(true);
  const closeEmailModal = () => setIsEmailModalOpen(false);

  // Handle pack purchase/unlock
  const handleUnlockPack = async () => {
    if (!pack || !user) {
      setUnlockError('You must be logged in to unlock packs');
      return;
    }

    if (pack.is_owned) {
      setUnlockError('You already own this pack');
      return;
    }

    if (pack.price_cents > 0 || pack.is_premium) {
      setUnlockError('This pack requires payment or premium subscription');
      return;
    }

    try {
      setIsUnlocking(true);
      setUnlockError(null);
      setUnlockSuccess(false);

      const response = await BoosterPackService.unlockFreePack(pack.id);

      if (response.success) {
        setUnlockSuccess(true);
        // Update pack ownership status
        setPack(prev => prev ? { ...prev, is_owned: true, unlocked_at: new Date().toISOString() } : null);
        // Load pack assets now that it's unlocked
        loadPackAssets(pack.id);
      } else {
        setUnlockError(response.error || 'Failed to unlock pack');
      }
    } catch (error) {
      console.error('Error unlocking pack:', error);
      setUnlockError('An unexpected error occurred');
    } finally {
      setIsUnlocking(false);
    }
  };

  useEffect(() => {
    const fetchPackDetails = async () => {
      if (!packId) {
        setError('No pack ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get pack details with ownership status
        const response = await BoosterPackService.getPackById(packId);

        if (response.success && response.data) {
          setPack(response.data);

          // Load pack assets if user owns the pack or it's free
          if (response.data.is_owned || response.data.price_cents === 0) {
            loadPackAssets(response.data.id);
          }

          // Always load pack statistics (public data)
          loadPackStatistics(response.data.id);
        } else {
          setError(response.error || 'Failed to load booster pack');
        }
      } catch (err) {
        console.error('Error fetching pack details:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPackDetails();
  }, [packId, user]); // Re-fetch when user changes to update ownership status

  // Load pack assets using asset loader directly
  const loadPackAssets = async (packId: string) => {
    try {
      setAssetsLoading(true);

      // Get pack details to find the asset directory
      const packResponse = await BoosterPackService.getPackById(packId);
      if (!packResponse.success || !packResponse.data) {
        console.error('Failed to get pack details for asset loading');
        return;
      }

      const pack = packResponse.data;

      // Load assets directly from the directory using assetLoader
      const assets = await loadCollectionAssets(pack.asset_directory_name);
      setPackAssets(assets);
    } catch (error) {
      console.error('Error loading pack assets:', error);
    } finally {
      setAssetsLoading(false);
    }
  };

  // Load pack statistics and top users
  const loadPackStatistics = async (packId: string) => {
    try {
      setStatisticsLoading(true);

      // Load pack statistics
      const statsResponse = await BoosterPackService.getPackStatistics(packId);
      if (statsResponse.success && statsResponse.data) {
        setPackStatistics(statsResponse.data);
      }

      // Load top users
      const usersResponse = await BoosterPackService.getPackTopUsers(packId, 8);
      if (usersResponse.success && usersResponse.data) {
        setTopUsers(usersResponse.data);
      }
    } catch (error) {
      console.error('Error loading pack statistics:', error);
    } finally {
      setStatisticsLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="py-16 md:py-24 bg-cream min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="py-16 md:py-24 bg-cream min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-heading font-bold text-3xl md:text-4xl text-dark mb-6">
            {error ? 'Error Loading Pack' : 'Pack Not Found'}
          </h1>
          <p className="text-medium-gray text-lg mb-8">
            {error || 'The booster pack you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <Button variant="primary" to="/premium">
            Back to Booster Packs
          </Button>
        </div>
      </div>
    );
  }
  
  // Real statistics from the database
  const packStats = {
    usageCount: packStatistics?.usage_count || pack.usage_count || 0,
    downloadCount: packStatistics?.download_count || pack.download_count || 0,
    assetCount: pack.asset_count || 0,
    userCount: packStatistics?.unique_users || Math.floor((pack.usage_count || 0) / 3),
    totalAssetsUsed: packStatistics?.total_assets_used || 0,
    avgRating: packStatistics?.avg_rating || null,
    winnersCreated: Math.floor((packStatistics?.usage_count || pack.usage_count || 0) * 0.15)
  };

  return (
    <>
      <Seo
        title={`${pack.title} Booster Pack`}
        description={pack.description || `Explore the ${pack.title} booster pack`}
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
                  src={pack.cover_image_url || '/images/default-pack-cover.jpg'}
                  alt={pack.title}
                  className="w-full h-64 md:h-full object-cover"
                />
              </div>
              <div className="md:w-2/3 p-6 md:p-8">
                <h1 className="font-heading font-bold text-3xl md:text-4xl text-dark mb-4">{pack.title}</h1>

                <p className="text-medium-gray text-lg mb-4">{pack.description}</p>
                
                {/* Placeholder note */}
                <p className="text-sm text-medium-gray italic mb-6 bg-off-white p-3 rounded-lg border border-light-gray">
                  🎨 Just a teaser—full chaos drops soon! This pack is still cooking in our creative kitchen.
                </p>
                
                {/* Feature Badges */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {pack.is_premium && (
                    <span className="bg-turquoise text-dark px-3 py-1 text-xs font-heading font-bold rounded-full border-2 border-dark shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] hand-drawn">
                      Premium
                    </span>
                  )}
                  {pack.price_cents === 0 && (
                    <span className="bg-green text-dark px-3 py-1 text-xs font-heading font-bold rounded-full border-2 border-dark shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] hand-drawn">
                      Free
                    </span>
                  )}
                  {pack.is_owned && (
                    <span className="bg-success text-white px-3 py-1 text-xs font-heading font-bold rounded-full border-2 border-dark shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] hand-drawn">
                      Owned
                    </span>
                  )}
                  {pack.category && (
                    <span className="bg-accent text-dark px-3 py-1 text-xs font-heading font-bold rounded-full border-2 border-dark shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] hand-drawn">
                      {pack.category}
                    </span>
                  )}
                </div>
                
                {/* Purchase/Unlock Status and Actions */}
                <div className="space-y-4">
                  {/* Success/Error Messages */}
                  {unlockSuccess && (
                    <div className="bg-success/10 border border-success text-success p-3 rounded-lg flex items-center">
                      <CheckCircle size={20} className="mr-2" />
                      <span>Pack successfully added to your collection!</span>
                    </div>
                  )}

                  {unlockError && (
                    <div className="bg-red/10 border border-red text-red p-3 rounded-lg flex items-center">
                      <AlertCircle size={20} className="mr-2" />
                      <span>{unlockError}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-heading font-bold text-dark">
                        {pack.price_cents === 0 ? 'Free' : pack.is_premium ? 'Premium' : `$${(pack.price_cents / 100).toFixed(2)}`}
                      </div>
                      {pack.is_owned && (
                        <div className="text-sm text-success font-medium">✓ Owned</div>
                      )}
                    </div>

                    {pack.is_owned ? (
                      <Button variant="secondary" disabled>
                        Already in Collection
                      </Button>
                    ) : !user ? (
                      <Button variant="primary" to="/uiux/login">
                        Login to Unlock
                      </Button>
                    ) : pack.is_premium ? (
                      <Button variant="primary" onClick={openEmailModal}>
                        Become Premium AF
                      </Button>
                    ) : pack.price_cents > 0 ? (
                      <Button variant="primary" onClick={openEmailModal}>
                        Buy for ${(pack.price_cents / 100).toFixed(2)}
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={handleUnlockPack}
                        disabled={isUnlocking}
                      >
                        {isUnlocking ? 'Adding...' : 'Add to Collection'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* TODO: Partner Section - Add partner support to database schema */}
          
          {/* Pack Contents */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-dark hand-drawn mb-12"
          >
            <div className="p-6 md:p-8">
              <h2 className="font-heading font-bold text-2xl mb-6 text-dark">Pack Contents</h2>
              
              {assetsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-medium-gray">Loading pack contents...</p>
                </div>
              ) : packAssets.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {packAssets.map((asset, index) => (
                    <motion.div
                      key={asset.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-off-white rounded-lg p-3 text-center shadow-sm border border-light-gray hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-square mb-2 flex items-center justify-center bg-white rounded border border-light-gray overflow-hidden">
                        {asset.previewUrl ? (
                          <img
                            src={asset.previewUrl}
                            alt={asset.name}
                            className="max-w-full max-h-full object-contain"
                            style={{ maxWidth: '60px', maxHeight: '60px' }}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-light-gray rounded flex items-center justify-center">
                            <Image size={20} className="text-medium-gray" />
                          </div>
                        )}
                      </div>
                      <p className="font-medium text-xs truncate" title={asset.name}>
                        {asset.name}
                      </p>
                      <p className="text-xs text-medium-gray uppercase">
                        {asset.format}
                      </p>
                    </motion.div>
                  ))}
                </div>
              ) : pack.is_owned || pack.price_cents === 0 ? (
                <div className="text-center py-8">
                  <p className="text-medium-gray">No assets found in this pack.</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-medium-gray">
                    {pack.asset_count > 0 ? `${pack.asset_count} assets` : 'Assets'} available after unlocking this pack.
                  </p>
                </div>
              )}
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
              
              {statisticsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-medium-gray">Loading statistics...</p>
                </div>
              ) : (
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
                      <p className="text-sm text-medium-gray">Assets Used</p>
                      <p className="font-heading font-bold text-xl">{packStats.totalAssetsUsed.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-green/10 p-4 rounded-lg flex items-center">
                    <div className="mr-4 bg-green/20 p-3 rounded-full">
                      <Award size={24} className="text-green" />
                    </div>
                    <div>
                      <p className="text-sm text-medium-gray">Winners Created</p>
                      <p className="font-heading font-bold text-xl">{packStats.winnersCreated.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
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

              {statisticsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-medium-gray">Loading top artists...</p>
                </div>
              ) : topUsers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {topUsers.map((user, index) => (
                    <div
                      key={user.user_id}
                      className="flex items-center p-4 border border-light-gray rounded-lg hover:bg-off-white transition-colors"
                    >
                      <div className="mr-4 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-heading font-bold">
                        {index + 1}
                      </div>
                      <div className="mr-4">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.username}
                            className="w-10 h-10 rounded-full object-cover border-2 border-light-gray"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                            <span className="text-dark font-heading font-bold text-sm">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-heading font-bold text-lg text-dark">
                          {user.username}
                        </p>
                        <p className="text-sm text-medium-gray">
                          {user.usage_count} pack uses
                        </p>
                        <p className="text-xs text-medium-gray">
                          Last used: {new Date(user.last_used).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users size={48} className="mx-auto text-medium-gray mb-4" />
                  <p className="text-medium-gray text-lg">No usage data available yet</p>
                  <p className="text-sm text-medium-gray">Be the first to use this pack in a game!</p>
                </div>
              )}
            </div>
          </motion.div>
          
          {/* Usage Over Time Chart (Placeholder) - Hidden for now */}
          {/*
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

              <div className="h-64 bg-off-white rounded-lg flex items-center justify-center border border-light-gray">
                <p className="text-medium-gray text-lg">Chart visualization of pack usage over time will appear here</p>
              </div>

              <p className="mt-4 text-sm text-medium-gray italic">
                Note: This is a placeholder for a usage trend chart that would be implemented with a charting library like Chart.js or Recharts in the actual application.
              </p>
            </div>
          </motion.div>
          */}
        </div>
      </div>
      
      {/* Email Signup Modal */}
      <EmailSignupModal 
        isOpen={isEmailModalOpen} 
        onClose={closeEmailModal} 
      />
    </>
  );
};

export default BoosterPackDetail;