import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Image, AlertCircle, Loader2 } from 'lucide-react';
import { SVGCollection, SVGAsset, SVGDrawerState } from '../../types/svg';
import { loadAllCollections, searchAssets, cleanupAssetPreviews } from '../../utils/svgAssetLoader';
import {
  getViewportCenter,
  svgToDataURL,
  generateElementId,
  createTimestamp,
  createImageElement,
  createExcalidrawFile,
  EXCALIDRAW_DEFAULTS
} from '../../utils/excalidrawHelpers';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

interface SVGDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  excalidrawAPI: ExcalidrawImperativeAPI | null;
}



const SVGDrawer: React.FC<SVGDrawerProps> = ({ isOpen, onClose, excalidrawAPI }) => {
  const [state, setState] = useState<SVGDrawerState>({
    isOpen: false,
    selectedCollection: null,
    searchQuery: '',
    isLoading: false,
    error: null,
  });

  const [collections, setCollections] = useState<SVGCollection[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<SVGAsset[]>([]);
  const [convertingAsset, setConvertingAsset] = useState<string | null>(null);

  // Load collections on mount
  useEffect(() => {
    const loadCollections = async () => {
      console.log('📚 Starting to load SVG collections...');
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const loadedCollections = await loadAllCollections();
        console.log('📊 Collections loaded:', {
          count: loadedCollections.length,
          collections: loadedCollections.map(c => ({ id: c.id, name: c.name, assetCount: c.totalCount }))
        });

        setCollections(loadedCollections);

        // Set first collection as default if available
        if (loadedCollections.length > 0) {
          console.log(`✅ Setting default collection: ${loadedCollections[0].id}`);
          setState(prev => ({
            ...prev,
            selectedCollection: loadedCollections[0].id,
            isLoading: false
          }));
        } else {
          console.warn('⚠️ No SVG collections found');
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'No SVG collections found'
          }));
        }
      } catch (error) {
        console.error('❌ Failed to load SVG collections:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load SVG collections'
        }));
      }
    };

    if (isOpen && collections.length === 0) {
      console.log('🚀 SVG Drawer opened, loading collections...');
      loadCollections();
    } else if (isOpen) {
      console.log('📚 SVG Drawer opened, collections already loaded');
    }
  }, [isOpen, collections.length]);

  // Update filtered assets when search query or selected collection changes
  useEffect(() => {
    if (state.searchQuery.trim()) {
      const results = searchAssets(collections, state.searchQuery);
      setFilteredAssets(results);
    } else if (state.selectedCollection) {
      const selectedCollection = collections.find(c => c.id === state.selectedCollection);
      setFilteredAssets(selectedCollection?.assets || []);
    } else {
      setFilteredAssets([]);
    }
  }, [collections, state.searchQuery, state.selectedCollection]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      collections.forEach(collection => {
        cleanupAssetPreviews(collection.assets);
      });
    };
  }, [collections]);

  /**
   * Handle clicking on an SVG asset to insert it into the Excalidraw canvas
   * Converts the SVG to a data URL and creates an image element
   */
  const handleAssetClick = useCallback(async (asset: SVGAsset) => {
    console.log('🎯 Asset clicked:', {
      id: asset.id,
      name: asset.name,
      collection: asset.collection,
      contentLength: asset.content.length
    });

    if (!excalidrawAPI) {
      console.error('❌ No Excalidraw API available');
      return;
    }

    if (convertingAsset) {
      console.log('⏳ Already converting another asset, ignoring click');
      return;
    }

    setConvertingAsset(asset.id);
    console.log('🔄 Starting SVG image insertion process...');

    try {
      // Get current app state to determine insertion position
      console.log('📊 Getting app state...');
      const appState = excalidrawAPI.getAppState();
      console.log('📊 App state retrieved:', {
        scrollX: appState?.scrollX,
        scrollY: appState?.scrollY,
        zoom: appState?.zoom
      });

      const center = getViewportCenter(appState);
      console.log('🎯 Calculated center position:', center);

      // Convert SVG to data URL and generate IDs
      const dataURL = svgToDataURL(asset.content);
      const fileId = generateElementId();
      const imageId = generateElementId();
      const width = asset.width || EXCALIDRAW_DEFAULTS.DEFAULT_WIDTH;
      const height = asset.height || EXCALIDRAW_DEFAULTS.DEFAULT_HEIGHT;
      const now = createTimestamp();

      // Create Excalidraw image element with proper positioning
      const imageElement = createImageElement({
        id: imageId,
        fileId,
        x: center.x,
        y: center.y,
        width,
        height,
        timestamp: now,
      });

      // Register the SVG file with Excalidraw's file system
      if (excalidrawAPI.addFiles) {
        const file = createExcalidrawFile({
          id: fileId,
          dataURL,
          timestamp: now,
        });
        excalidrawAPI.addFiles([file]);
      }

      // Add the image element to the canvas
      excalidrawAPI.updateScene({
        elements: [...excalidrawAPI.getSceneElements(), imageElement],
      });

      console.log('✅ Successfully inserted SVG as image into canvas');
      onClose(); // Close the drawer after successful insertion
    } catch (error) {
      console.error('❌ Error inserting SVG as image:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to insert SVG. Please try again.'
      }));
    } finally {
      setConvertingAsset(null);
    }
  }, [excalidrawAPI, convertingAsset, onClose]);

  /**
   * Handle collection tab selection
   */
  const handleCollectionChange = (collectionId: string) => {
    setState(prev => ({
      ...prev,
      selectedCollection: collectionId,
      searchQuery: '', // Clear search when changing collections
      error: null // Clear any previous errors
    }));
  };

  /**
   * Handle search input changes
   */
  const handleSearchChange = (query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      selectedCollection: query.trim() ? null : collections[0]?.id || null,
      error: null // Clear any previous errors
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l-2 border-dark shadow-lg z-30 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b-2 border-dark bg-off-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg flex items-center">
                <Image size={20} className="mr-2" />
                SVG Library
              </h3>
              <button
                onClick={onClose}
                className="text-medium-gray hover:text-dark transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-medium-gray" />
              <input
                type="text"
                value={state.searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search SVGs..."
                className="w-full pl-10 pr-4 py-2 border border-light-gray rounded-md text-sm focus:outline-none focus:border-purple"
              />
            </div>
          </div>

          {/* Collection Tabs */}
          {!state.searchQuery && collections.length > 0 && (
            <div className="flex border-b border-light-gray bg-white">
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => handleCollectionChange(collection.id)}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                    state.selectedCollection === collection.id
                      ? 'bg-purple text-white'
                      : 'text-medium-gray hover:text-dark hover:bg-off-white'
                  }`}
                >
                  {collection.displayName}
                  <span className="ml-1 text-xs opacity-75">({collection.totalCount})</span>
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {state.isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={24} className="animate-spin text-purple" />
                <span className="ml-2 text-medium-gray">Loading SVGs...</span>
              </div>
            ) : state.error ? (
              <div className="p-4 text-center">
                <AlertCircle size={24} className="text-red mx-auto mb-2" />
                <p className="text-sm text-medium-gray">{state.error}</p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="p-4 text-center">
                <Image size={24} className="text-medium-gray mx-auto mb-2" />
                <p className="text-sm text-medium-gray">
                  {state.searchQuery ? 'No SVGs found' : 'No SVGs available'}
                </p>
              </div>
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  {filteredAssets.map((asset) => (
                    <motion.button
                      key={asset.id}
                      onClick={() => handleAssetClick(asset)}
                      disabled={convertingAsset === asset.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative p-3 bg-off-white border border-light-gray rounded-lg hover:border-purple transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {convertingAsset === asset.id && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                          <Loader2 size={16} className="animate-spin text-purple" />
                        </div>
                      )}
                      
                      <div className="aspect-square mb-2 flex items-center justify-center">
                        <img
                          src={asset.previewUrl}
                          alt={asset.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      
                      <p className="text-xs font-medium text-dark truncate">
                        {asset.name}
                      </p>
                      
                      {asset.width && asset.height && (
                        <p className="text-xs text-medium-gray">
                          {asset.width}×{asset.height}
                        </p>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-light-gray bg-off-white">
            <p className="text-xs text-center text-medium-gray">
              💡 Click any SVG to add it to your canvas
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SVGDrawer;
