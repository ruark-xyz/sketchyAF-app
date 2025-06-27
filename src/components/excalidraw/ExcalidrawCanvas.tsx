import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { Image, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
// import PerformanceMonitor from './PerformanceMonitor';
import AssetDrawer from './AssetDrawer';
import useMobileOptimization from '../../hooks/useMobileOptimization';

import { GameDrawingContext } from '../../context/GameContext';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

interface ExcalidrawCanvasProps {
  gameContext?: GameDrawingContext | null;
}

const ExcalidrawCanvas: React.FC<ExcalidrawCanvasProps> = ({ gameContext }) => {
  // Apply mobile optimizations
  useMobileOptimization();

  // Debug logging for game context
  useEffect(() => {
    console.log('ExcalidrawCanvas: Game context debug:', {
      hasGameContext: !!gameContext,
      gameId: gameContext?.gameId,
      prompt: gameContext?.prompt,
      timeRemaining: gameContext?.timeRemaining,
      isDrawingPhase: gameContext?.isDrawingPhase,
      canSubmit: gameContext?.canSubmit,
      hasSubmitted: gameContext?.hasSubmitted
    });
  }, [gameContext]);

  // Ref for Excalidraw API
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

  // Asset Drawer state
  const [isAssetDrawerOpen, setIsAssetDrawerOpen] = useState(false);

  // Game-specific state
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [autoSubmitRetryCount, setAutoSubmitRetryCount] = useState(0);
  const [showAutoSubmitWarning, setShowAutoSubmitWarning] = useState(false);
  const [isFallbackSubmission, setIsFallbackSubmission] = useState(false);

  // Handle auto-submit when timer expires
  const handleAutoSubmit = useCallback(async () => {
    console.log('ExcalidrawCanvas: handleAutoSubmit called', {
      hasGameContext: !!gameContext,
      hasExcalidrawAPI: !!excalidrawAPIRef.current,
      hasSubmitted: gameContext?.hasSubmitted,
      isAutoSubmitting
    });

    if (!gameContext || !excalidrawAPIRef.current) {
      console.log('ExcalidrawCanvas: Auto-submit aborted - missing context or API');
      return;
    }

    if (gameContext.hasSubmitted) {
      console.log('ExcalidrawCanvas: Auto-submit aborted - already submitted');
      return;
    }

    if (isAutoSubmitting) {
      console.log('ExcalidrawCanvas: Auto-submit aborted - already in progress');
      return;
    }

    setIsAutoSubmitting(true);
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

      // Use the submitDrawing function from game context
      await gameContext.submitDrawing({ elements, appState, files });
      const result = { success: true };

      setShowSuccessMessage(true);
      // Hide success message after 5 seconds for auto-submit
      setTimeout(() => setShowSuccessMessage(false), 5000);
      console.log('ExcalidrawCanvas: Auto-submit successful');

      // Reset retry count on success
      setAutoSubmitRetryCount(0);
    } catch (error) {
      console.error('Failed to auto-submit drawing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check for specific error types that warrant retries
      const isRetryableError =
        errorMessage.includes('Game is not in drawing phase') ||
        errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('connection');

      if (isRetryableError && autoSubmitRetryCount < 5) {
        console.log(`ExcalidrawCanvas: Retryable error detected: ${errorMessage}`);
        // Automatically retry for retryable errors
        setTimeout(() => {
          retryAutoSubmit();
        }, 1000 + (autoSubmitRetryCount * 1000)); // Progressive delay
      } else {
        // Non-retryable error or max retries reached
        const finalErrorMessage = `Auto-submit failed: ${errorMessage}`;
        setSubmissionError(finalErrorMessage);
        console.error('ExcalidrawCanvas: Auto-submit failed (non-retryable):', errorMessage);
      }
    } finally {
      setIsAutoSubmitting(false);
    }
  }, [gameContext, isAutoSubmitting]);

  // Enhanced retry auto-submission with exponential backoff and specific error handling
  const retryAutoSubmit = useCallback(async () => {
    const maxRetries = 5; // Increased from 3 to 5
    const baseDelay = 1000; // 1 second

    if (autoSubmitRetryCount >= maxRetries) {
      console.log('ExcalidrawCanvas: Max auto-submit retries reached');
      setSubmissionError('Auto-submission failed after maximum retries. Please try submitting manually.');
      return;
    }

    const delay = baseDelay * Math.pow(2, autoSubmitRetryCount);
    console.log(`ExcalidrawCanvas: Retrying auto-submit in ${delay}ms (attempt ${autoSubmitRetryCount + 1}/${maxRetries})`);

    // Show retry feedback to user
    setSubmissionError(`Retrying auto-submission... (attempt ${autoSubmitRetryCount + 1}/${maxRetries})`);

    setTimeout(() => {
      setAutoSubmitRetryCount(prev => prev + 1);
      handleAutoSubmit();
    }, delay);
  }, [autoSubmitRetryCount, handleAutoSubmit]);

  // Fallback submission that attempts to submit even if game phase has changed
  const handleFallbackSubmit = useCallback(async () => {
    if (!gameContext || !excalidrawAPIRef.current) {
      console.log('ExcalidrawCanvas: Fallback submit aborted - missing context or API');
      return;
    }

    if (gameContext.hasSubmitted) {
      console.log('ExcalidrawCanvas: Fallback submit aborted - already submitted');
      return;
    }

    setIsFallbackSubmission(true);
    setSubmissionError(null);

    try {
      const elements = excalidrawAPIRef.current.getSceneElements();
      const appState = excalidrawAPIRef.current.getAppState();
      const files = excalidrawAPIRef.current.getFiles();

      console.log('ExcalidrawCanvas: Attempting fallback submission with:', {
        elementCount: elements.length,
        filesCount: files ? Object.keys(files).length : 0
      });

      // Try to submit directly, bypassing game phase checks if possible
      await gameContext.submitDrawing({ elements, appState, files });

      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
      console.log('ExcalidrawCanvas: Fallback submit successful');

      // Reset retry count on success
      setAutoSubmitRetryCount(0);
    } catch (error) {
      console.error('Fallback submission failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSubmissionError(`Fallback submission failed: ${errorMessage}`);
    } finally {
      setIsFallbackSubmission(false);
    }
  }, [gameContext]);

  // Simple timer state
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and manage timer
  useEffect(() => {
    if (gameContext && gameContext.timeRemaining > 0) {
      setTimeRemaining(gameContext.timeRemaining);
      setIsExpired(false);

      // Clear any existing timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      // Start countdown timer
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            setIsExpired(true);
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
            }
            // Trigger auto-submit
            if (gameContext && !gameContext.hasSubmitted) {
              handleAutoSubmit();
            }
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [gameContext]);

  // Format time for display
  const formattedTime = `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}`;
  const isWarning = timeRemaining <= 30 && timeRemaining > 10;
  const isUrgent = timeRemaining <= 10;

  // Handle auto-submit warning
  useEffect(() => {
    if (timeRemaining <= 10 && timeRemaining > 0 && !gameContext?.hasSubmitted && !showAutoSubmitWarning) {
      setShowAutoSubmitWarning(true);
      // Hide warning after 3 seconds
      setTimeout(() => setShowAutoSubmitWarning(false), 3000);
    }
  }, [timeRemaining, gameContext?.hasSubmitted, showAutoSubmitWarning]);





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

      {/* Game UI Header - show when in game context */}
      {gameContext && (
        <div className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Game Prompt */}
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-800 truncate">
                Draw: {gameContext.prompt}
              </h2>
            </div>

            {/* Timer - show if we have time remaining */}
            {timeRemaining > 0 && (
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
                isUrgent
                  ? 'bg-red-100 text-red-700'
                  : isWarning
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                <Clock size={16} />
                <span className="font-mono font-semibold">{formattedTime}</span>
                {isExpired && <AlertCircle size={16} className="text-red-500" />}
              </div>
            )}



            {/* Submission Status */}
            {(isAutoSubmitting || isFallbackSubmission) && (
              <div className="ml-3 flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                <span className="font-medium">
                  {isFallbackSubmission ? 'Force submitting...' : 'Auto-submitting...'}
                </span>
              </div>
            )}
            {gameContext.hasSubmitted && !isAutoSubmitting && !isFallbackSubmission && (
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



      {/* Auto-submit Warning */}
      {showAutoSubmitWarning && gameContext && !gameContext.hasSubmitted && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 max-w-md">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 shadow-lg">
            <div className="flex items-center space-x-3">
              <AlertCircle size={20} className="text-orange-500" />
              <div>
                <h4 className="text-sm font-medium text-orange-800">Auto-submission Warning</h4>
                <p className="text-sm text-orange-700">Your drawing will be automatically submitted when the timer expires!</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={retryAutoSubmit}
                      disabled={isAutoSubmitting || isFallbackSubmission || autoSubmitRetryCount >= 5}
                      className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {isAutoSubmitting ? 'Retrying...' : 'Retry'}
                    </button>
                    <button
                      onClick={handleFallbackSubmit}
                      disabled={isAutoSubmitting || isFallbackSubmission || gameContext?.hasSubmitted}
                      className="px-3 py-1.5 bg-orange-500 text-white rounded text-sm font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {isFallbackSubmission ? 'Submitting...' : 'Force Submit'}
                    </button>
                    <button
                      onClick={() => {
                        setSubmissionError(null);
                        setAutoSubmitRetryCount(0);
                      }}
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
                  <h4 className="text-sm font-medium text-green-800">Auto-submission Complete!</h4>
                  <p className="text-sm text-green-700">Your drawing has been automatically submitted when the timer expired.</p>
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