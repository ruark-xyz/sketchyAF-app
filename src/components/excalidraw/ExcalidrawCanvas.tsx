import React from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import PerformanceMonitor from './PerformanceMonitor';
import useMobileOptimization from '../../hooks/useMobileOptimization';

const ExcalidrawCanvas: React.FC = () => {
  // Apply mobile optimizations
  useMobileOptimization();

  return (
    <div className="h-screen w-full relative">
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