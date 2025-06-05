import React, { useRef } from 'react';
import { Excalidraw, loadSceneOrLibraryFromBlob, MIME_TYPES } from '@excalidraw/excalidraw';
import PerformanceMonitor from './PerformanceMonitor';
import useMobileOptimization from '../../hooks/useMobileOptimization';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

// Type for legacy version 1 library format (used by robots.excalidrawlib)
interface LegacyLibraryData {
  library?: unknown[];
}

const ExcalidrawCanvas: React.FC = () => {
  // Apply mobile optimizations
  useMobileOptimization();

  // Ref for Excalidraw API
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

  // Load library file and handle both version 1 and version 2 formats
  const loadLibraryFile = async (filename: string) => {
    try {
      const response = await fetch(`/libraries/${filename}`);
      if (!response.ok) {
        console.warn(`Failed to load library: ${filename}`);
        return null;
      }

      const blob = await response.blob();

      // Use loadSceneOrLibraryFromBlob which handles both version 1 and 2 library formats
      const contents = await loadSceneOrLibraryFromBlob(blob, null, null);

      if (contents.type === MIME_TYPES.excalidrawlib) {
        return contents.data;
      } else {
        console.warn(`Unexpected content type for ${filename}:`, contents.type);
        return null;
      }
    } catch (error) {
      console.error(`Error loading library ${filename}:`, error);
      return null;
    }
  };



  return (
    <div className="h-screen w-full relative">
      {/* Hide library browse/upload elements while keeping the Library panel */}
      <style>{`
        /* Library panel customizations */
        .excalidraw .library-menu-items__no-items__hint,
        .excalidraw .library-menu-browse-button,
        .excalidraw .library-menu-dropdown-container,
        .excalidraw .library-menu-items-container__header--excal,
        .excalidraw .library-menu-items-container__header--excal + div {
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

      <Excalidraw
        excalidrawAPI={(api) => {
          excalidrawAPIRef.current = api;
          // Trigger library preloading when API becomes available
          if (api) {
            setTimeout(() => {
              const preloadLibraries = async () => {
                const libraryFiles = [
                  'robots.excalidrawlib',
                  'shapes.excalidrawlib',
                  // Add more library files here as needed
                ];

                for (const filename of libraryFiles) {
                  const libraryData = await loadLibraryFile(filename);

                  // Handle both version 1 (library) and version 2 (libraryItems) formats
                  const items = libraryData?.libraryItems || (libraryData as LegacyLibraryData)?.library;

                  if (items && items.length > 0) {
                    try {
                      api.updateLibrary({
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        libraryItems: items as any, // Type assertion needed for legacy v1 format compatibility
                        merge: true,
                      });
                    } catch (error) {
                      console.error(`Failed to load library ${filename}:`, error);
                    }
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