import React, { useRef, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { Image } from 'lucide-react';
// import PerformanceMonitor from './PerformanceMonitor';
import SVGDrawer from './SVGDrawer';
import useMobileOptimization from '../../hooks/useMobileOptimization';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

const ExcalidrawCanvas: React.FC = () => {
  // Apply mobile optimizations
  useMobileOptimization();

  // Ref for Excalidraw API
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

  // SVG Drawer state
  const [isSVGDrawerOpen, setIsSVGDrawerOpen] = useState(false);



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

      {/* Custom SVG Library Button */}
      <button
        onClick={() => setIsSVGDrawerOpen(true)}
        className="fixed top-4 right-4 z-20 bg-white border-2 border-dark rounded-lg p-3 shadow-lg hover:bg-off-white transition-colors"
        title="Open SVG Library"
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

      {/* SVG Drawer */}
      <SVGDrawer
        isOpen={isSVGDrawerOpen}
        onClose={() => setIsSVGDrawerOpen(false)}
        excalidrawAPI={excalidrawAPIRef.current}
      />

      {/* Performance Monitor for Phase 1 testing */}
      {/* <PerformanceMonitor /> */}
    </div>
  );
};

export default ExcalidrawCanvas; 