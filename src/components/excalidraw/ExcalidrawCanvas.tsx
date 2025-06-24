import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { Image, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
// import PerformanceMonitor from './PerformanceMonitor';
import AssetDrawer from './AssetDrawer';
import useMobileOptimization from '../../hooks/useMobileOptimization';

import { useDrawingTimer } from '../../hooks/useDrawingTimer';
import { GameDrawingContext, useGame } from '../../context/GameContext';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

interface ExcalidrawCanvasProps {
  gameContext?: GameDrawingContext | null;
}

const ExcalidrawCanvas: React.FC<ExcalidrawCanvasProps> = ({ gameContext }) => {
  // Apply mobile optimizations
  useMobileOptimization();

  // Get game context functions at top level
  const { submitDrawingWithExport } = useGame();

  // Ref for Excalidraw API
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

  // Asset Drawer state
  const [isAssetDrawerOpen, setIsAssetDrawerOpen] = useState(false);

  // Game-specific state
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Handle auto-submit when timer expires
  const handleAutoSubmit = useCallback(async () => {
    console.log('ExcalidrawCanvas: handleAutoSubmit called', {
      hasGameContext: !!gameContext,
      hasExcalidrawAPI: !!excalidrawAPIRef.current,
      hasSubmitted: gameContext?.hasSubmitted
    });

    if (!gameContext || !excalidrawAPIRef.current) {
      console.log('ExcalidrawCanvas: Auto-submit aborted - missing context or API');
      return;
    }

    if (gameContext.hasSubmitted) {
      console.log('ExcalidrawCanvas: Auto-submit aborted - already submitted');
      return;
    }

    setSubmissionError(null);

    try {
      const elements = excalidrawAPIRef.current.getSceneElements();
      const appState = excalidrawAPIRef.current.getAppState();
      const files = excalidrawAPIRef.current.getFiles();

      console.log('ExcalidrawCanvas: Auto-submitting drawing with:', {
        elementCount: elements.length,
        filesCount: files ? Object.keys(files).length : 0,
        files: files
      });

      // Use the submitDrawingWithExport function from top level
      const result = await submitDrawingWithExport({ elements, appState, files });

      if (result.success) {
        setShowSuccessMessage(true);
        // Hide success message after 5 seconds for auto-submit
        setTimeout(() => setShowSuccessMessage(false), 5000);
      } else {
        setSubmissionError(`Auto-submit failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to auto-submit drawing:', error);
      setSubmissionError(`Auto-submit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [submitDrawingWithExport]);

  // Drawing timer (only active when in game context)
  const {
    timeRemaining,
    formattedTime,
    isActive: timerActive,
    isExpired,
    isWarning,
    warningLevel,
    onTimeExpired,
    onWarning,
    onAutoSubmit
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
  }, [gameContext, onTimeExpired, handleAutoSubmit]);

  // Set up auto-submit callback
  useEffect(() => {
    onAutoSubmit(() => {
      if (gameContext && !gameContext.hasSubmitted) {
        handleAutoSubmit();
      }
    });
  }, [gameContext, onAutoSubmit, handleAutoSubmit]);

  // Handle timer warnings
  useEffect(() => {
    onWarning((level, timeLeft) => {
      // Could add toast notifications or other warning UI here
      console.log(`Timer warning: ${level} - ${timeLeft} seconds remaining`);
    });
  }, [onWarning]);





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



            {/* Submission Status */}
            {gameContext.hasSubmitted && (
              <div className="ml-3 flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                <CheckCircle size={16} />
                <span className="font-medium">Submitted!</span>
              </div>
            )}

            {/* Success Message */}
            {showSuccessMessage && !gameContext.hasSubmitted && (
              <div className="ml-3 flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                <CheckCircle size={16} />
                <span className="font-medium">Drawing submitted successfully!</span>
              </div>
            )}

            {/* Error Message */}
            {submissionError && !gameContext.hasSubmitted && (
              <div className="ml-3 flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg">
                <XCircle size={16} />
                <span className="text-sm">{submissionError}</span>
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
        />
      </div>

      {/* Asset Drawer */}
      <AssetDrawer
        isOpen={isAssetDrawerOpen}
        onClose={() => setIsAssetDrawerOpen(false)}
        excalidrawAPI={excalidrawAPIRef.current}
      />



      {/* Bottom Notification Area */}
      {gameContext && (submissionError || showSuccessMessage) && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30 max-w-md">
          {submissionError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
              <div className="flex items-start space-x-3">
                <XCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800">Auto-submission Failed</h4>
                  <p className="text-sm text-red-700 mt-1">{submissionError}</p>
                  <div className="mt-3">
                    <button
                      onClick={() => setSubmissionError(null)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showSuccessMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle size={20} className="text-green-500" />
                <div>
                  <h4 className="text-sm font-medium text-green-800">Success!</h4>
                  <p className="text-sm text-green-700">Your drawing has been submitted successfully.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Monitor for Phase 1 testing */}
      {/* <PerformanceMonitor /> */}
    </div>
  );
};

export default ExcalidrawCanvas; 