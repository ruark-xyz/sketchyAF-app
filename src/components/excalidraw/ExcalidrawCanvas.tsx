import React, { useRef } from 'react';
import { Excalidraw, loadLibraryFromBlob } from '@excalidraw/excalidraw';
import PerformanceMonitor from './PerformanceMonitor';
import useMobileOptimization from '../../hooks/useMobileOptimization';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

const ExcalidrawCanvas: React.FC = () => {
  // Apply mobile optimizations
  useMobileOptimization();

  // Ref for Excalidraw API
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

  // Function to load library from file
  const loadLibraryFile = async (filename: string) => {
    try {
      const response = await fetch(`/libraries/${filename}`);
      if (!response.ok) {
        console.warn(`Failed to load library: ${filename}`);
        return null;
      }
      const blob = await response.blob();
      const libraryData = await loadLibraryFromBlob(blob);
      return libraryData;
    } catch (error) {
      console.error(`Error loading library ${filename}:`, error);
      return null;
    }
  };



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

        .excalidraw .library-menu-items-container__header--excal {
          display: none !important;
        }

        .excalidraw .library-menu-items-container__header--excal + div {
          display: none !important;
        }


      `}</style>

      <Excalidraw
        excalidrawAPI={(api) => {
          excalidrawAPIRef.current = api;
          // Trigger library preloading when API becomes available
          if (api) {
            setTimeout(() => {
              const preloadLibraries = async () => {
                const libraryFiles = [
                  'robots.excalidrawlib',
                  // Add more library files here as needed
                ];

                for (const filename of libraryFiles) {
                  const libraryData = await loadLibraryFile(filename);
                  if (libraryData) {
                    api.updateLibrary({
                      libraryItems: libraryData || [],
                      merge: true,
                    });
                  }
                }
              };
              preloadLibraries();
            }, 100); // Small delay to ensure API is ready
          }
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

      {/* Performance Monitor for Phase 1 testing */}
      <PerformanceMonitor />
    </div>
  );
};

export default ExcalidrawCanvas; 