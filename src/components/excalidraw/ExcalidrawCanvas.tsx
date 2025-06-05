import React from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import PerformanceMonitor from './PerformanceMonitor';
import useMobileOptimization from '../../hooks/useMobileOptimization';

const ExcalidrawCanvas: React.FC = () => {
  // Apply mobile optimizations
  useMobileOptimization();

  return (
    <div className="h-screen w-full relative">
      {/* Hide library browse/upload elements while keeping the Library panel */}
      <style>{`
        /* Hide the instructional text about installing from public repository */
        .excalidraw .library-menu-items__no-items__hint {
          display: none !important;
        }

        /* Hide the "Browse libraries" button */
        .excalidraw .library-menu-browse-button {
          display: none !important;
        }

        /* Hide the library menu (three dots) that contains upload/import options */
        .excalidraw .library-menu-dropdown-container {
          display: none !important;
        }
      `}</style>

      <Excalidraw
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

      {/* Performance Monitor for Phase 1 testing */}
      <PerformanceMonitor />
    </div>
  );
};

export default ExcalidrawCanvas; 