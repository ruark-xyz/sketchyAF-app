import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { Image, Clock, Send, Users, AlertCircle } from 'lucide-react';
// import PerformanceMonitor from './PerformanceMonitor';
import AssetDrawer from './AssetDrawer';
import useMobileOptimization from '../../hooks/useMobileOptimization';
import { useDrawingTimer } from '../../hooks/useDrawingTimer';
import { GameDrawingContext } from '../../context/GameContext';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

interface ExcalidrawCanvasProps {
  gameContext?: GameDrawingContext | null;
}

const ExcalidrawCanvas: React.FC<ExcalidrawCanvasProps> = ({ gameContext }) => {
  // Apply mobile optimizations
  useMobileOptimization();

  // Ref for Excalidraw API
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

  // Asset Drawer state
  const [isAssetDrawerOpen, setIsAssetDrawerOpen] = useState(false);

  // Game-specific state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Drawing timer (only active when in game context)
  const {
    timeRemaining,
    formattedTime,
    isActive: timerActive,
    isExpired,
    isWarning,
    warningLevel,
    onTimeExpired,
    onWarning
  } = useDrawingTimer({
    gameId: gameContext?.gameId,
    autoSubmitOnExpiry: true
  });

  // Handle timer expiry
  useEffect(() => {
    onTimeExpired(() => {
      if (gameContext && !gameContext.hasSubmitted) {
        handleAutoSubmit();
      }
    });
  }, [gameContext, onTimeExpired]);

  // Handle timer warnings
  useEffect(() => {
    onWarning((level, timeLeft) => {
      // Could add toast notifications or other warning UI here
      console.log(`Timer warning: ${level} - ${timeLeft} seconds remaining`);
    });
  }, [onWarning]);

  // Auto-save progress periodically
  useEffect(() => {
    if (!gameContext || !excalidrawAPIRef.current) return;

    const saveInterval = setInterval(() => {
      const elements = excalidrawAPIRef.current?.getSceneElements();
      const appState = excalidrawAPIRef.current?.getAppState();

      if (elements && appState) {
        gameContext.saveProgress({ elements, appState });
        setHasUnsavedChanges(false);
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(saveInterval);
  }, [gameContext]);

  // Load saved progress on mount
  useEffect(() => {
    if (!gameContext || !excalidrawAPIRef.current) return;

    const loadProgress = async () => {
      try {
        const savedData = await gameContext.loadProgress();
        if (savedData && savedData.elements) {
          excalidrawAPIRef.current?.updateScene({
            elements: savedData.elements,
            appState: savedData.appState || {}
          });
        }
      } catch (error) {
        console.warn('Failed to load drawing progress:', error);
      }
    };

    loadProgress();
  }, [gameContext]);

  // Handle drawing changes
  const handleChange = useCallback((elements: any, appState: any) => {
    setHasUnsavedChanges(true);
  }, []);

  // Handle manual submit
  const handleSubmit = useCallback(async () => {
    if (!gameContext || !excalidrawAPIRef.current || gameContext.hasSubmitted) return;

    setIsSubmitting(true);
    try {
      const elements = excalidrawAPIRef.current.getSceneElements();
      const appState = excalidrawAPIRef.current.getAppState();

      await gameContext.submitDrawing({ elements, appState });
    } catch (error) {
      console.error('Failed to submit drawing:', error);
      // Could show error toast here
    } finally {
      setIsSubmitting(false);
    }
  }, [gameContext]);

  // Handle auto-submit when timer expires
  const handleAutoSubmit = useCallback(async () => {
    if (!gameContext || !excalidrawAPIRef.current) return;

    try {
      const elements = excalidrawAPIRef.current.getSceneElements();
      const appState = excalidrawAPIRef.current.getAppState();

      await gameContext.submitDrawing({ elements, appState });
    } catch (error) {
      console.error('Failed to auto-submit drawing:', error);
    }
  }, [gameContext]);



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

        label[title="Library"] {
          display: none !important;
        }
      `}</style>

      {/* Game UI Header - only show when in game context */}
      {gameContext && (
        <div className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Game Prompt */}
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-800 truncate">
                Draw: {gameContext.prompt}
              </h2>
            </div>

            {/* Timer */}
            {timerActive && (
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
                isWarning
                  ? warningLevel === 'high'
                    ? 'bg-red-100 text-red-700'
                    : warningLevel === 'medium'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-yellow-100 text-yellow-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                <Clock size={16} />
                <span className="font-mono font-semibold">{formattedTime}</span>
                {isExpired && <AlertCircle size={16} className="text-red-500" />}
              </div>
            )}

            {/* Submit Button */}
            {gameContext.canSubmit && !gameContext.hasSubmitted && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isExpired}
                className={`ml-3 flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isSubmitting || isExpired
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                <Send size={16} />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Drawing'}</span>
              </button>
            )}

            {/* Submitted Status */}
            {gameContext.hasSubmitted && (
              <div className="ml-3 flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium">Submitted!</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Image Library Button */}
      <button
        onClick={() => setIsAssetDrawerOpen(true)}
        className={`fixed right-4 z-20 bg-white border-2 border-dark rounded-lg p-3 shadow-lg hover:bg-off-white transition-colors ${
          gameContext ? 'top-20' : 'top-4'
        }`}
        title="Open Image Library"
      >
        <Image size={20} className="text-dark" />
      </button>

      <div className={`${gameContext ? 'pt-16' : ''} h-full`}>
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
          onChange={handleChange}
          readOnly={gameContext?.hasSubmitted || isExpired}
        />
      </div>

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