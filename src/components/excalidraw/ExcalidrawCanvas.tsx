import React, { useRef, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { Image } from 'lucide-react';
// import PerformanceMonitor from './PerformanceMonitor';
import AssetDrawer from './AssetDrawer';
import useMobileOptimization from '../../hooks/useMobileOptimization';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

const ExcalidrawCanvas: React.FC = () => {
  // Apply mobile optimizations
  useMobileOptimization();

  // Ref for Excalidraw API
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

  // Asset Drawer state
  const [isAssetDrawerOpen, setIsAssetDrawerOpen] = useState(false);



  return (
    <div className="h-screen w-full relative">
      {/* Hide default library elements and customize toolbar */}
      <style>{`
        /* Hide default library panel completely */
        .excalidraw .library-menu-items__no-items__hint,
        .excalidraw .library-menu-browse-button,
        .excalidraw .library-menu-dropdown-container,
        .excalidraw .library-menu-items-container__header--excal,
        .excalidraw .library-menu-items-container__header--excal + div,
        .excalidraw .library-menu {
          display: none !important;
        }

        /* Toolbar customizations */
        .excalidraw button[title="More tools"],
        .excalidraw .App-toolbar .dropdown-menu-button,
        .excalidraw .main-menu-trigger,
        .excalidraw .help-icon {
          display: none !important;
        }
      `}</style>

      {/* Custom Image Library Button */}
      <button
        onClick={() => setIsAssetDrawerOpen(true)}
        className="fixed top-4 right-4 z-20 bg-white border-2 border-dark rounded-lg p-3 shadow-lg hover:bg-off-white transition-colors"
        title="Open Image Library"
      >
        <Image size={20} className="text-dark" />
      </button>

      <Excalidraw
        excalidrawAPI={(api) => {
          excalidrawAPIRef.current = api;
        }}
        initialData={{
          elements: [],
          appState: {
            viewBackgroundColor: "#ffffff",
          }
        }}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false, // Keep white background
          },
          tools: {
            image: false, // Disable image tool for drawing game
          }
        }}
      />

      {/* Asset Drawer */}
      <AssetDrawer
        isOpen={isAssetDrawerOpen}
        onClose={() => setIsAssetDrawerOpen(false)}
        excalidrawAPI={excalidrawAPIRef.current}
      />

      {/* Performance Monitor for Phase 1 testing */}
      {/* <PerformanceMonitor /> */}
    </div>
  );
};

export default ExcalidrawCanvas; 